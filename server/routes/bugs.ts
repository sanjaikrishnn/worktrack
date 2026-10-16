import { Router, Request, Response } from 'express';
import { db, BugReport, Task, User, AuditLog, CorrectiveTimeEntry } from '../db.js';
import { requireAuth } from './auth.js';
import { eventBus } from '../events.js';
import crypto from 'crypto';

export const bugsRouter = Router();

// GET /api/bugs - List bugs with role-based visibility
bugsRouter.get('/', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const bugs = db.get('bugReports');
  const users = db.get('users');
  const tasks = db.get('tasks');

  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  let filtered = bugs;
  if (user.role === 'employee') {
    // Employee sees bugs assigned to them or where they were the original deliverer
    filtered = bugs.filter((b) => b.assignedToUserId === user.id || b.originalDelivererUserId === user.id);
  }

  const enriched = filtered.map((b) => {
    const linkedTask = taskMap.get(b.taskId);
    return {
      ...b,
      assignedToName: b.assignedToUserId ? userMap.get(b.assignedToUserId) || 'Unassigned' : 'Unassigned',
      originalDelivererName: userMap.get(b.originalDelivererUserId) || 'Unknown',
      reportedByName: userMap.get(b.reportedByUserId) || 'Tester',
      taskDisplayId: linkedTask ? linkedTask.taskId : b.taskId,
    };
  });

  res.json({ bugs: enriched });
});

// GET /api/bugs/:id - Bug details
bugsRouter.get('/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { id } = req.params;
  const bugs = db.get('bugReports');
  const bug = bugs.find((b) => b.id === id || b.bugId.toLowerCase() === id.toLowerCase());

  if (!bug) {
    return res.status(404).json({ error: 'Bug report not found.' });
  }

  // Employee authorization check
  if (user.role === 'employee' && bug.assignedToUserId !== user.id && bug.originalDelivererUserId !== user.id) {
    return res.status(403).json({ error: 'Forbidden. You do not have access to this bug report.' });
  }

  const users = db.get('users');
  const tasks = db.get('tasks');
  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const linkedTask = tasks.find((t) => t.id === bug.taskId || t.taskId === bug.taskId);

  res.json({
    bug: {
      ...bug,
      assignedToName: bug.assignedToUserId ? userMap.get(bug.assignedToUserId) || 'Unassigned' : 'Unassigned',
      originalDelivererName: userMap.get(bug.originalDelivererUserId) || 'Unknown',
      reportedByName: userMap.get(bug.reportedByUserId) || 'Tester',
      taskDisplayId: linkedTask ? linkedTask.taskId : bug.taskId,
      taskTitle: linkedTask ? linkedTask.title : '',
    },
  });
});

// POST /api/bugs - Reporter/Tester creates a bug report (Case C)
bugsRouter.post('/', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { title, description, stepsToReproduce, expectedResult, actualResult, severity, taskId, moduleName, evidenceName } = req.body;

  if (!title || !description || !severity) {
    return res.status(400).json({ error: 'Title, description, and severity are required.' });
  }

  const tasks = db.get('tasks');
  const task = tasks.find((t) => t.id === taskId || t.taskId.toLowerCase() === (taskId || '').toLowerCase());

  const bugs = db.get('bugReports');
  const nextNum = bugs.length + 1;
  const bugId = `BUG-${String(nextNum).padStart(3, '0')}`;
  const now = new Date().toISOString();

  // Determine original delivering employee
  const originalDelivererUserId = task ? task.originalDeliveryUserId || task.assignedToUserId : user.id;
  const resolvedModuleName = moduleName || (task ? task.moduleName : 'General');
  const resolvedTaskId = task ? task.id : taskId || 'unlinked';

  const newBug: BugReport = {
    id: `bug_${crypto.randomBytes(6).toString('hex')}`,
    bugId,
    title,
    description,
    stepsToReproduce: stepsToReproduce || '',
    expectedResult: expectedResult || '',
    actualResult: actualResult || '',
    severity: severity || 'Medium',
    evidenceName: evidenceName || (req.body.hasEvidence ? 'defect-evidence.png' : undefined),
    evidenceUrl: req.body.hasEvidence ? '/uploads/defect-evidence.png' : undefined,
    taskId: resolvedTaskId,
    moduleId: task ? task.moduleId : `mod_${resolvedModuleName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    moduleName: resolvedModuleName,
    reportedByUserId: user.id,
    reportedAt: now,
    status: 'reported',
    originalDelivererUserId,
  };

  bugs.unshift(newBug);
  db.set('bugReports', bugs);

  // If linked to a completed task, reopen the task and record history
  if (task && (task.status === 'completed' || task.status === 'in_progress')) {
    const prevStatus = task.status;
    task.status = 'reopened';
    task.progress = Math.min(task.progress, 60);
    task.updatedAt = now;
    db.set('tasks', tasks);

    const history = db.get('taskHistory');
    history.push({
      id: `th_${crypto.randomBytes(6).toString('hex')}`,
      taskId: task.id,
      previousStatus: prevStatus,
      newStatus: 'reopened',
      changedByUserId: user.id,
      comment: `Task reopened due to defect ${bugId}: "${title}" reported by QA.`,
      timestamp: now,
    });
    db.set('taskHistory', history);
  }

  // Notify manager
  const users = db.get('users');
  const managers = users.filter((u) => u.role === 'manager' || u.role === 'admin');
  const notifs = db.get('notifications');
  for (const m of managers) {
    notifs.unshift({
      id: `notif_${crypto.randomBytes(6).toString('hex')}`,
      userId: m.id,
      title: 'New Bug Reported',
      message: `${user.name} reported ${bugId} (${title}) in ${resolvedModuleName}. Requires review and assignment.`,
      type: 'bug_reported',
      read: false,
      link: `/manager/bug-review/${bugId}`,
      createdAt: now,
    });
  }
  db.set('notifications', notifs);

  // Audit log
  const auditLogs = db.get('auditLogs');
  auditLogs.unshift({
    id: `aud_${crypto.randomBytes(6).toString('hex')}`,
    userId: user.id,
    userName: user.name,
    action: 'REPORT_BUG',
    entityType: 'bug',
    entityId: bugId,
    details: `Defect ${bugId} reported on task ${task ? task.taskId : resolvedTaskId} with severity ${severity}.`,
    timestamp: now,
  });
  db.set('auditLogs', auditLogs);

  eventBus.broadcast('BUG_REPORTED', { bug: newBug, task });

  res.status(201).json({ bug: newBug, message: 'Bug reported successfully! Manager notified for assignment.' });
});

// POST /api/bugs/:id/assign - Manager assigns bug, sets correction deadline (Case A & B)
bugsRouter.post('/:id/assign', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  if (user.role !== 'manager' && user.role !== 'admin') {
    return res.status(403).json({ error: 'Only managers can assign bugs or set deadlines.' });
  }

  const { id } = req.params;
  const { assignedToUserId, correctionDeadline, managerNotes } = req.body;

  const bugs = db.get('bugReports');
  const bug = bugs.find((b) => b.id === id || b.bugId.toLowerCase() === id.toLowerCase());

  if (!bug) {
    return res.status(404).json({ error: 'Bug report not found.' });
  }

  const now = new Date().toISOString();
  const previousAssigneeId = bug.assignedToUserId;
  const previousDeadline = bug.correctionDeadline;

  bug.assignedToUserId = assignedToUserId;
  bug.correctionDeadline = correctionDeadline || bug.correctionDeadline;
  bug.managerNotes = managerNotes !== undefined ? managerNotes : bug.managerNotes;
  bug.assignedByUserId = user.id;
  bug.assignedAt = now;
  if (bug.status === 'reported') {
    bug.status = 'assigned';
  }

  db.set('bugReports', bugs);

  const users = db.get('users');
  const newAssignee = users.find((u) => u.id === assignedToUserId);
  const prevAssignee = users.find((u) => u.id === previousAssigneeId);

  // Send notification to new assignee (Case A)
  const notifs = db.get('notifications');
  if (assignedToUserId) {
    notifs.unshift({
      id: `notif_${crypto.randomBytes(6).toString('hex')}`,
      userId: assignedToUserId,
      title: 'Bug Assigned for Fixing',
      message: `You have been assigned ${bug.bugId} (${bug.title}). Correction deadline: ${bug.correctionDeadline}.`,
      type: 'assignment',
      read: false,
      link: `/bug-fixing/${bug.bugId}`,
      createdAt: now,
    });
  }

  // If re-assigned from previous assignee, notify previous assignee that they are unassigned
  if (previousAssigneeId && previousAssigneeId !== assignedToUserId) {
    notifs.unshift({
      id: `notif_${crypto.randomBytes(6).toString('hex')}`,
      userId: previousAssigneeId,
      title: 'Bug Reassigned',
      message: `${bug.bugId} has been reassigned to ${newAssignee ? newAssignee.name : 'another engineer'}.`,
      type: 'assignment',
      read: false,
      link: '/employee/dashboard',
      createdAt: now,
    });
  }

  // If deadline changed, notify assignee (Case B)
  if (previousDeadline && previousDeadline !== correctionDeadline && assignedToUserId) {
    notifs.unshift({
      id: `notif_${crypto.randomBytes(6).toString('hex')}`,
      userId: assignedToUserId,
      title: 'Correction Deadline Updated',
      message: `Correction deadline for ${bug.bugId} changed to ${correctionDeadline}.`,
      type: 'deadline',
      read: false,
      link: `/bug-fixing/${bug.bugId}`,
      createdAt: now,
    });
  }

  db.set('notifications', notifs);

  // Audit log
  const auditLogs = db.get('auditLogs');
  auditLogs.unshift({
    id: `aud_${crypto.randomBytes(6).toString('hex')}`,
    userId: user.id,
    userName: user.name,
    action: 'ASSIGN_BUG',
    entityType: 'bug',
    entityId: bug.bugId,
    details: `Assigned ${bug.bugId} to ${newAssignee ? newAssignee.name : assignedToUserId} with deadline ${correctionDeadline}. Notes: ${managerNotes || 'none'}.`,
    timestamp: now,
  });
  db.set('auditLogs', auditLogs);

  eventBus.broadcast('BUG_ASSIGNED', { bug, previousAssigneeId, newAssigneeId: assignedToUserId });

  res.json({ bug, message: `Bug ${bug.bugId} assigned successfully to ${newAssignee ? newAssignee.name : 'engineer'}.` });
});

// POST /api/bugs/:id/review - Manager reviews submitted fix (Approve or Request Changes - Case E & F)
bugsRouter.post('/:id/review', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  if (user.role !== 'manager' && user.role !== 'admin') {
    return res.status(403).json({ error: 'Only managers can review fix submissions.' });
  }

  const { id } = req.params;
  const { decision, reviewNotes } = req.body; // 'approve' | 'request_changes' | 'reject'

  if (!decision || !['approve', 'request_changes', 'reject'].includes(decision)) {
    return res.status(400).json({ error: "Decision must be 'approve', 'request_changes', or 'reject'." });
  }

  const bugs = db.get('bugReports');
  const bug = bugs.find((b) => b.id === id || b.bugId.toLowerCase() === id.toLowerCase());

  if (!bug) {
    return res.status(404).json({ error: 'Bug report not found.' });
  }

  const now = new Date().toISOString();
  const notifs = db.get('notifications');
  const auditLogs = db.get('auditLogs');

  if (decision === 'approve') {
    bug.status = 'approved';

    // If there is a fix submission, mark it approved
    const submissions = db.get('fixSubmissions');
    const sub = submissions.find((s) => s.bugId === bug.bugId);
    if (sub) {
      sub.status = 'approved';
      sub.reviewedByUserId = user.id;
      sub.reviewNotes = reviewNotes || 'Fix verified and approved.';
      sub.reviewedAt = now;
      db.set('fixSubmissions', submissions);
    }

    // Auto-approve or link corrective time entry for payroll eligibility (Case F)
    const timeEntries = db.get('correctiveTimeEntries');
    const existingEntry = timeEntries.find((te) => te.bugId === bug.bugId && te.employeeId === bug.assignedToUserId);
    if (existingEntry) {
      existingEntry.status = 'approved';
      existingEntry.approvedByUserId = user.id;
      existingEntry.approvedAt = now;
      db.set('correctiveTimeEntries', timeEntries);
    }

    // Notify employee
    if (bug.assignedToUserId) {
      notifs.unshift({
        id: `notif_${crypto.randomBytes(6).toString('hex')}`,
        userId: bug.assignedToUserId,
        title: 'Bug Fix Approved!',
        message: `Your fix for ${bug.bugId} has been verified and approved by ${user.name}.`,
        type: 'fix_approved',
        read: false,
        link: `/salary-rework`,
        createdAt: now,
      });
    }

    auditLogs.unshift({
      id: `aud_${crypto.randomBytes(6).toString('hex')}`,
      userId: user.id,
      userName: user.name,
      action: 'APPROVE_FIX',
      entityType: 'bug',
      entityId: bug.bugId,
      details: `Approved fix for ${bug.bugId}. Notes: ${reviewNotes || 'Approved'}.`,
      timestamp: now,
    });
  } else if (decision === 'request_changes') {
    // Case E: Manager requests changes
    bug.status = 'changes_requested';

    const submissions = db.get('fixSubmissions');
    const sub = submissions.find((s) => s.bugId === bug.bugId);
    if (sub) {
      sub.status = 'changes_requested';
      sub.reviewedByUserId = user.id;
      sub.reviewNotes = reviewNotes || 'Please address the requested changes.';
      sub.reviewedAt = now;
      db.set('fixSubmissions', submissions);
    }

    if (bug.assignedToUserId) {
      notifs.unshift({
        id: `notif_${crypto.randomBytes(6).toString('hex')}`,
        userId: bug.assignedToUserId,
        title: 'Changes Requested on Fix',
        message: `Manager requested changes for ${bug.bugId}: "${reviewNotes || 'Review comments provided'}".`,
        type: 'changes_requested',
        read: false,
        link: `/bug-fixing/${bug.bugId}`,
        createdAt: now,
      });
    }

    auditLogs.unshift({
      id: `aud_${crypto.randomBytes(6).toString('hex')}`,
      userId: user.id,
      userName: user.name,
      action: 'REQUEST_CHANGES',
      entityType: 'bug',
      entityId: bug.bugId,
      details: `Changes requested on ${bug.bugId}. Comment: ${reviewNotes || 'None'}.`,
      timestamp: now,
    });
  } else {
    // Rejected
    bug.status = 'rejected';
  }

  db.set('bugReports', bugs);
  db.set('notifications', notifs);
  db.set('auditLogs', auditLogs);

  eventBus.broadcast('BUG_REVIEWED', { bug, decision, reviewNotes });

  res.json({ bug, message: `Review completed: ${decision === 'approve' ? 'Fix approved!' : 'Changes requested.'}` });
});
