import { Router, Request, Response } from 'express';
import { db, WorkSession, FixSubmission, CorrectiveTimeEntry, User, BugReport } from '../db.js';
import { requireAuth } from './auth.js';
import { eventBus } from '../events.js';
import crypto from 'crypto';

export const reworkRouter = Router();

// Helper to calculate total active elapsed seconds
function getSessionElapsedSeconds(session: WorkSession): number {
  let elapsed = session.accumulatedSeconds || 0;
  if (session.isRunning && session.startedAt) {
    const activeSpan = Math.max(0, Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000));
    elapsed += activeSpan;
  }
  return elapsed;
}

// GET /api/rework/session/:bugId - Get or query active timer session for a bug
reworkRouter.get('/session/:bugId', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { bugId } = req.params;

  const sessions = db.get('workSessions');
  const session = sessions.find((s) => (s.bugId.toLowerCase() === bugId.toLowerCase() || s.id === bugId) && s.employeeId === user.id);

  if (!session) {
    return res.json({ session: null, elapsedSeconds: 0, isRunning: false });
  }

  const elapsedSeconds = getSessionElapsedSeconds(session);
  res.json({ session, elapsedSeconds, isRunning: session.isRunning });
});

// POST /api/rework/timer/start - Start or resume timer
reworkRouter.post('/timer/start', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { bugId } = req.body;

  if (!bugId) {
    return res.status(400).json({ error: 'Bug ID is required.' });
  }

  const bugs = db.get('bugReports');
  const bug = bugs.find((b) => b.bugId.toLowerCase() === bugId.toLowerCase() || b.id === bugId);

  if (!bug) {
    return res.status(404).json({ error: 'Bug not found.' });
  }

  if (user.role === 'employee' && bug.assignedToUserId !== user.id) {
    return res.status(403).json({ error: 'You are not assigned to fix this bug.' });
  }

  const now = new Date().toISOString();
  const sessions = db.get('workSessions');
  let session = sessions.find((s) => (s.bugId.toLowerCase() === bugId.toLowerCase() || s.id === bugId) && s.employeeId === user.id);

  if (!session) {
    session = {
      id: `ws_${crypto.randomBytes(6).toString('hex')}`,
      bugId: bug.bugId,
      employeeId: user.id,
      startedAt: now,
      accumulatedSeconds: 0,
      isRunning: true,
      lastHeartbeatAt: now,
      updatedAt: now,
    };
    sessions.push(session);
  } else {
    // If not running, start running now from current timestamp
    if (!session.isRunning) {
      session.startedAt = now;
      session.isRunning = true;
    }
    session.lastHeartbeatAt = now;
    session.updatedAt = now;
  }

  // Update bug status to in_progress if assigned or changes_requested
  if (bug.status === 'assigned' || bug.status === 'changes_requested') {
    bug.status = 'in_progress';
    db.set('bugReports', bugs);
  }

  db.set('workSessions', sessions);

  // Audit log
  const auditLogs = db.get('auditLogs');
  auditLogs.unshift({
    id: `aud_${crypto.randomBytes(6).toString('hex')}`,
    userId: user.id,
    userName: user.name,
    action: 'START_TIMER',
    entityType: 'work_session',
    entityId: bug.bugId,
    details: `Started corrective work timer for ${bug.bugId}.`,
    timestamp: now,
  });
  db.set('auditLogs', auditLogs);

  const elapsedSeconds = getSessionElapsedSeconds(session);
  res.json({ session, elapsedSeconds, isRunning: true, message: 'Timer started.' });
});

// POST /api/rework/timer/pause - Pause timer
reworkRouter.post('/timer/pause', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { bugId } = req.body;

  const sessions = db.get('workSessions');
  const session = sessions.find((s) => (s.bugId.toLowerCase() === (bugId || '').toLowerCase() || s.id === bugId) && s.employeeId === user.id);

  if (!session) {
    return res.status(404).json({ error: 'No active session found.' });
  }

  if (session.isRunning) {
    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000));
    session.accumulatedSeconds += elapsed;
    session.isRunning = false;
    session.updatedAt = new Date().toISOString();
    db.set('workSessions', sessions);
  }

  res.json({ session, elapsedSeconds: session.accumulatedSeconds, isRunning: false, message: 'Timer paused.' });
});

// POST /api/rework/submit-fix - Submit fix for manager review (Case D)
reworkRouter.post('/submit-fix', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { bugId, fixDescription, progressPercentage, fixFile, notes } = req.body;

  if (!bugId || !fixDescription) {
    return res.status(400).json({ error: 'Bug ID and fix description are required.' });
  }

  const bugs = db.get('bugReports');
  const bug = bugs.find((b) => b.bugId.toLowerCase() === bugId.toLowerCase() || b.id === bugId);

  if (!bug) {
    return res.status(404).json({ error: 'Bug not found.' });
  }

  if (user.role === 'employee' && bug.assignedToUserId !== user.id) {
    return res.status(403).json({ error: 'Forbidden. You are not the assigned fixer.' });
  }

  const now = new Date().toISOString();

  // Stop session timer and calculate total seconds
  const sessions = db.get('workSessions');
  const session = sessions.find((s) => (s.bugId.toLowerCase() === bugId.toLowerCase() || s.id === bugId) && s.employeeId === user.id);

  let finalSeconds = 9360; // default 2h 36m if no timer recorded
  if (session) {
    finalSeconds = getSessionElapsedSeconds(session);
    session.isRunning = false;
    session.accumulatedSeconds = finalSeconds;
    session.updatedAt = now;
    db.set('workSessions', sessions);
  }

  // Format hours display
  const hours = Math.floor(finalSeconds / 3600);
  const minutes = Math.floor((finalSeconds % 3600) / 60);
  const hoursDisplay = `${hours}h ${minutes}m`;
  const decimalHours = parseFloat((finalSeconds / 3600).toFixed(2));
  const rate = user.hourlyRate || 300;
  const calculatedCost = Math.round(decimalHours * rate);

  // Update bug status to ready_for_review
  bug.status = 'ready_for_review';
  db.set('bugReports', bugs);

  // Create or update FixSubmission
  const submissions = db.get('fixSubmissions');
  const newSubmission: FixSubmission = {
    id: `fix_${crypto.randomBytes(6).toString('hex')}`,
    bugId: bug.bugId,
    taskId: bug.taskId,
    employeeId: user.id,
    fixDescription,
    progressPercentage: Number(progressPercentage) || 100,
    status: 'submitted',
    fixFile: fixFile || 'fix_v1.1.zip',
    notes: notes || 'Fix submitted for review.',
    timeSpentSeconds: finalSeconds,
    submittedAt: now,
  };
  submissions.unshift(newSubmission);
  db.set('fixSubmissions', submissions);

  // Create or update CorrectiveTimeEntry (subject to manager approval)
  const timeEntries = db.get('correctiveTimeEntries');
  const existingEntryIndex = timeEntries.findIndex((e) => e.bugId === bug.bugId && e.employeeId === user.id);

  const formattedDate = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date());

  const timeEntry: CorrectiveTimeEntry = {
    id: existingEntryIndex >= 0 ? timeEntries[existingEntryIndex].id : `cte_${crypto.randomBytes(6).toString('hex')}`,
    bugId: bug.bugId,
    taskId: bug.taskId,
    moduleName: bug.moduleName,
    employeeId: user.id,
    hoursSpent: decimalHours,
    hoursDisplay,
    hourlyRate: rate,
    calculatedCost,
    proposedDeduction: calculatedCost,
    status: 'pending',
    date: formattedDate,
  };

  if (existingEntryIndex >= 0) {
    timeEntries[existingEntryIndex] = timeEntry;
  } else {
    timeEntries.unshift(timeEntry);
  }
  db.set('correctiveTimeEntries', timeEntries);

  // Notify manager
  const users = db.get('users');
  const managers = users.filter((u) => u.role === 'manager' || u.role === 'admin');
  const notifs = db.get('notifications');
  for (const m of managers) {
    notifs.unshift({
      id: `notif_${crypto.randomBytes(6).toString('hex')}`,
      userId: m.id,
      title: 'Fix Submitted for Review',
      message: `${user.name} submitted a fix for ${bug.bugId} (${bug.moduleName}) with ${hoursDisplay} corrective work logged.`,
      type: 'fix_submitted',
      read: false,
      link: `/manager/progress`,
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
    action: 'SUBMIT_FIX',
    entityType: 'fix_submission',
    entityId: bug.bugId,
    details: `Submitted fix for ${bug.bugId}. Total time: ${hoursDisplay}, Cost: ₹${calculatedCost}.`,
    timestamp: now,
  });
  db.set('auditLogs', auditLogs);

  eventBus.broadcast('FIX_SUBMITTED', { submission: newSubmission, bug, timeEntry });

  res.json({
    success: true,
    message: 'Fix submitted successfully! Your rework hours have been recorded for review.',
    confirmation: {
      bugId: bug.bugId,
      taskId: bug.taskId,
      timeSpent: hoursDisplay,
      submissionDate: new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date()),
      status: 'Submitted',
    },
  });
});
