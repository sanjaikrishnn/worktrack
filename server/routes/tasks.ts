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
