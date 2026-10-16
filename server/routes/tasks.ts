import { Router, Request, Response } from 'express';
import { db, Task, TaskHistory, User, AuditLog } from '../db.js';
import { requireAuth } from './auth.js';
import { eventBus } from '../events.js';
import crypto from 'crypto';

export const tasksRouter = Router();

// GET /api/tasks - List tasks based on role
tasksRouter.get('/', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const tasks = db.get('tasks');
  const users = db.get('users');

  const userMap = new Map(users.map((u) => [u.id, u.name]));

  let filtered = tasks;
  if (user.role === 'employee') {
    filtered = tasks.filter((t) => t.assignedToUserId === user.id || t.originalDeliveryUserId === user.id);
  }

  const enriched = filtered.map((t) => ({
    ...t,
    assignedToName: userMap.get(t.assignedToUserId) || 'Unassigned',
    originalDelivererName: userMap.get(t.originalDeliveryUserId) || 'Unknown',
  }));

  res.json({ tasks: enriched });
});

// GET /api/tasks/:id - Task details with submission history
tasksRouter.get('/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { id } = req.params;
  const tasks = db.get('tasks');
  const task = tasks.find((t) => t.id === id || t.taskId.toLowerCase() === id.toLowerCase());

  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  // Authorization check: employee can only see their own tasks
  if (user.role === 'employee' && task.assignedToUserId !== user.id && task.originalDeliveryUserId !== user.id) {
    return res.status(403).json({ error: 'Forbidden. You do not have permission to view this task.' });
  }

  const users = db.get('users');
  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const history = db.get('taskHistory').filter((h) => h.taskId === task.id || h.taskId === task.taskId);

  res.json({
    task: {
      ...task,
      assignedToName: userMap.get(task.assignedToUserId) || 'Unassigned',
      originalDelivererName: userMap.get(task.originalDeliveryUserId) || 'Unknown',
    },
    history,
  });
});

// POST /api/tasks - Create task (Manager/Admin only)
tasksRouter.post('/', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  if (user.role !== 'manager' && user.role !== 'admin') {
    return res.status(403).json({ error: 'Only managers can create tasks.' });
  }

  const { title, description, moduleName, assignedToUserId, deadline } = req.body;
  if (!title || !moduleName || !assignedToUserId || !deadline) {
    return res.status(400).json({ error: 'Title, module, assignee, and deadline are required.' });
  }

  const tasks = db.get('tasks');
  const nextNum = tasks.length + 1;
  const taskId = `T-${String(nextNum).padStart(3, '0')}`;
  const now = new Date().toISOString();

  const newTask: Task = {
    id: `tsk_${crypto.randomBytes(6).toString('hex')}`,
    taskId,
    title,
    description: description || '',
    moduleId: `mod_${moduleName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    moduleName,
    assignedToUserId,
    originalDeliveryUserId: assignedToUserId,
    createdByUserId: user.id,
    deadline,
    progress: 0,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  tasks.unshift(newTask);
  db.set('tasks', tasks);

  // Send notification to assignee
  const notifications = db.get('notifications');
  notifications.unshift({
    id: `notif_${crypto.randomBytes(6).toString('hex')}`,
    userId: assignedToUserId,
    title: 'New Task Assigned',
    message: `You have been assigned task ${taskId}: "${title}". Deadline: ${deadline}.`,
    type: 'assignment',
    read: false,
    link: `/tasks/${taskId}`,
    createdAt: now,
  });
  db.set('notifications', notifications);

  // Audit log
  const auditLogs = db.get('auditLogs');
  auditLogs.unshift({
    id: `aud_${crypto.randomBytes(6).toString('hex')}`,
    userId: user.id,
    userName: user.name,
    action: 'CREATE_TASK',
    entityType: 'task',
    entityId: taskId,
    details: `Created task ${taskId} assigned to user ${assignedToUserId}.`,
    timestamp: now,
  });
  db.set('auditLogs', auditLogs);

  eventBus.broadcast('TASK_CREATED', { task: newTask });

  res.status(201).json({ task: newTask, message: 'Task created successfully.' });
});

// POST /api/tasks/:id/submit - Employee submits work for task
tasksRouter.post('/:id/submit', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { id } = req.params;
  const { submissionNotes, fileName } = req.body;

  const tasks = db.get('tasks');
  const task = tasks.find((t) => t.id === id || t.taskId.toLowerCase() === id.toLowerCase());

  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  if (user.role === 'employee' && task.assignedToUserId !== user.id) {
    return res.status(403).json({ error: 'You are only authorized to submit work for tasks assigned to you.' });
  }

  const now = new Date().toISOString();
  const prevStatus = task.status;
  task.status = 'completed';
  task.progress = 100;
  task.submissionNotes = submissionNotes || 'Work submitted for testing.';
  task.submissionFile = fileName || 'deliverable.zip';
  task.submittedAt = now;
  task.updatedAt = now;

  db.set('tasks', tasks);

  // Add to task history
  const history = db.get('taskHistory');
  history.push({
    id: `th_${crypto.randomBytes(6).toString('hex')}`,
    taskId: task.id,
    previousStatus: prevStatus,
    newStatus: 'completed',
    changedByUserId: user.id,
    comment: `Submission uploaded: ${task.submissionFile}. Notes: ${task.submissionNotes}`,
    timestamp: now,
  });
  db.set('taskHistory', history);

  // Notify managers and testers
  const users = db.get('users');
  const managersAndTesters = users.filter((u) => u.role === 'manager' || u.role === 'tester' || u.role === 'admin');
  const notifs = db.get('notifications');
  for (const m of managersAndTesters) {
    notifs.unshift({
      id: `notif_${crypto.randomBytes(6).toString('hex')}`,
      userId: m.id,
      title: 'Task Deliverable Submitted',
      message: `${user.name} submitted work for ${task.taskId} (${task.moduleName}). Ready for testing.`,
      type: 'fix_submitted',
      read: false,
      link: `/tasks/${task.taskId}`,
      createdAt: now,
    });
  }
  db.set('notifications', notifs);

  eventBus.broadcast('TASK_SUBMITTED', { task });

  res.json({ task, message: 'Work submitted successfully! Task marked as completed and sent for QA testing.' });
});

// POST /api/tasks/:id/verify - QA Tester verifies task deliverable (Pass or Fail)
tasksRouter.post('/:id/verify', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { id } = req.params;
  const {
    result,
    defectReason,
    defectDescription,
    severity,
    stepsToReproduce,
    expectedResult,
    actualResult,
    evidenceName,
  } = req.body;

  if (result !== 'PASS' && result !== 'FAIL') {
    return res.status(400).json({ error: 'Result must be either PASS or FAIL.' });
  }

  const tasks = db.get('tasks');
  const task = tasks.find((t) => t.id === id || t.taskId.toLowerCase() === id.toLowerCase());

  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  const now = new Date().toISOString();
  const users = db.get('users');
  const taskHistory = db.get('taskHistory');
  const notifications = db.get('notifications');
  const auditLogs = db.get('auditLogs');

  if (result === 'PASS') {
    const prevStatus = task.status;
    task.qaStatus = 'Pass';
    task.qaVerifiedAt = now;
    task.qaVerifiedByUserId = user.id;
    task.qaDefectReason = undefined;
    if (task.status !== 'completed') {
      task.status = 'completed';
      task.progress = 100;
    }
    task.updatedAt = now;
    db.set('tasks', tasks);

    // Record audit and history
    taskHistory.push({
      id: `th_${crypto.randomBytes(6).toString('hex')}`,
      taskId: task.id,
      previousStatus: prevStatus,
      newStatus: 'completed',
      changedByUserId: user.id,
      comment: `QA Verification PASSED by ${user.name} (${user.role.toUpperCase()}). Deliverable approved for release.`,
      timestamp: now,
    });
    db.set('taskHistory', taskHistory);

    // Notify assigned employee & managers
    const recipientIds = new Set<string>();
    if (task.assignedToUserId && task.assignedToUserId !== user.id) recipientIds.add(task.assignedToUserId);
    if (task.originalDeliveryUserId && task.originalDeliveryUserId !== user.id) recipientIds.add(task.originalDeliveryUserId);
    users.filter((u) => u.role === 'manager' || u.role === 'admin').forEach((m) => {
      if (m.id !== user.id) recipientIds.add(m.id);
    });

    for (const rId of recipientIds) {
      notifications.unshift({
        id: `notif_${crypto.randomBytes(6).toString('hex')}`,
        userId: rId,
        title: `QA Passed: ${task.taskId}`,
        message: `${user.name} verified and approved ${task.moduleName} (${task.taskId}). Module passed QA inspection.`,
        type: 'fix_approved',
        read: false,
        link: `/tasks/${task.taskId}`,
        createdAt: now,
      });
    }
    db.set('notifications', notifications);

    auditLogs.unshift({
      id: `aud_${crypto.randomBytes(6).toString('hex')}`,
      userId: user.id,
      userName: user.name,
      action: 'QA_VERIFICATION_PASS',
      entityType: 'task',
      entityId: task.taskId,
      details: `QA verification PASSED for ${task.taskId} (${task.moduleName}).`,
      timestamp: now,
    });
    db.set('auditLogs', auditLogs);

    // Synchronize updates with Manager and Employee dashboards
    eventBus.broadcast('TASK_QA_VERIFIED', { task, qaStatus: 'Pass' });
    eventBus.broadcast('TASK_UPDATED', { task });

    return res.json({
      success: true,
      task,
      message: `QA Verification PASSED: Task ${task.taskId} (${task.moduleName}) passed inspection.`,
    });
  } else {
    // FAIL workflow: must require a defect reason, create/link the bug, and trigger the corrective workflow
    if (!defectReason || !defectReason.trim()) {
      return res.status(400).json({ error: 'A defect reason is required when marking QA verification as FAIL.' });
    }

    const prevStatus = task.status;
    task.qaStatus = 'Fail';
    task.qaVerifiedAt = now;
    task.qaVerifiedByUserId = user.id;
    task.qaDefectReason = defectReason.trim();
    task.status = 'reopened';
    task.progress = Math.min(task.progress, 50);
    task.updatedAt = now;
    db.set('tasks', tasks);

    // Create & link the defect bug
    const bugs = db.get('bugReports');
    const nextNum = bugs.length + 1;
    const bugId = `BUG-${String(nextNum).padStart(3, '0')}`;
    const originalDelivererUserId = task.originalDeliveryUserId || task.assignedToUserId;

    const newBug: any = {
      id: `bug_${crypto.randomBytes(6).toString('hex')}`,
      bugId,
      title: defectReason.trim(),
      description: defectDescription?.trim() || `QA Verification Failed: ${defectReason.trim()}`,
      stepsToReproduce: stepsToReproduce?.trim() || '1. Download deliverable build\n2. Perform QA inspection\n3. Observed defect during verification',
      expectedResult: expectedResult?.trim() || 'Module must pass QA functional test specifications without defects.',
      actualResult: actualResult?.trim() || defectReason.trim(),
      severity: severity || 'High',
      evidenceName: evidenceName || 'qa_defect_evidence.png',
      evidenceUrl: '/uploads/defect-evidence.png',
      taskId: task.id,
      moduleId: task.moduleId,
      moduleName: task.moduleName,
      reportedByUserId: user.id,
      reportedAt: now,
      status: 'reported',
      originalDelivererUserId,
      assignedToUserId: task.assignedToUserId, // Route directly to author for corrective rework
    };

    bugs.unshift(newBug);
    db.set('bugReports', bugs);

    // Task history log
    taskHistory.push({
      id: `th_${crypto.randomBytes(6).toString('hex')}`,
      taskId: task.id,
      previousStatus: prevStatus,
      newStatus: 'reopened',
      changedByUserId: user.id,
      comment: `QA Verification FAILED by ${user.name}: "${defectReason.trim()}". Defect ${bugId} created and task reopened for corrective rework.`,
      timestamp: now,
    });
    db.set('taskHistory', taskHistory);

    // Notifications to assigned employee & manager
    const recipientIds = new Set<string>();
    if (task.assignedToUserId && task.assignedToUserId !== user.id) recipientIds.add(task.assignedToUserId);
    if (task.originalDeliveryUserId && task.originalDeliveryUserId !== user.id) recipientIds.add(task.originalDeliveryUserId);
    users.filter((u) => u.role === 'manager' || u.role === 'admin').forEach((m) => {
      if (m.id !== user.id) recipientIds.add(m.id);
    });

    for (const rId of recipientIds) {
      notifications.unshift({
        id: `notif_${crypto.randomBytes(6).toString('hex')}`,
        userId: rId,
        title: `QA Failed: ${task.taskId} (${bugId})`,
        message: `QA inspection FAILED on ${task.moduleName} (${task.taskId}). Defect ${bugId} logged: "${defectReason.trim()}". Corrective rework workflow triggered.`,
        type: 'bug_reported',
        read: false,
        link: `/tasks/${task.taskId}`,
        createdAt: now,
      });
    }
    db.set('notifications', notifications);

    // Audit log
    auditLogs.unshift({
      id: `aud_${crypto.randomBytes(6).toString('hex')}`,
      userId: user.id,
      userName: user.name,
      action: 'QA_VERIFICATION_FAIL',
      entityType: 'task',
      entityId: task.taskId,
      details: `QA verification FAILED for ${task.taskId} (${task.moduleName}). Defect ${bugId} created: ${defectReason.trim()}`,
      timestamp: now,
    });
    db.set('auditLogs', auditLogs);

    // Trigger real-time sync across Manager and Employee dashboards
    eventBus.broadcast('TASK_QA_VERIFIED', { task, qaStatus: 'Fail', bug: newBug });
    eventBus.broadcast('BUG_REPORTED', { bug: newBug, task });
    eventBus.broadcast('TASK_UPDATED', { task });

    return res.status(201).json({
      success: true,
      task,
      bug: newBug,
      message: `QA Verification FAILED: Defect ${bugId} created and corrective workflow triggered.`,
    });
  }
});
