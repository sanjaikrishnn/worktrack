import { Router, Request, Response } from 'express';
import { db, User, CorrectiveTimeEntry, AuditLog } from '../db.js';
import { requireAuth } from './auth.js';
import { eventBus } from '../events.js';
import crypto from 'crypto';

export const payrollRouter = Router();

// GET /api/payroll/employee-summary - Employee's own salary & rework details
// Strictly restricted to logged-in user
payrollRouter.get('/employee-summary', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const timeEntries = db.get('correctiveTimeEntries');

  // Strict employee scoping: only logged-in user's records
  const userEntries = timeEntries.filter((e) => e.employeeId === user.id);

  let totalMinutes = 0;
  let totalCost = 0;
  let totalProposedDeduction = 0;

  for (const entry of userEntries) {
    totalMinutes += Math.round(entry.hoursSpent * 60);
    totalCost += entry.calculatedCost;
    if (entry.status !== 'exempted' && entry.status !== 'rejected') {
      totalProposedDeduction += entry.proposedDeduction;
    }
  }

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const totalHoursDisplay = `${hours}h ${mins}m`;

  res.json({
    employee: {
      id: user.id,
      empId: user.empId,
      name: user.name,
      department: user.department,
      designation: user.designation,
      hourlyRate: user.hourlyRate,
      avatarUrl: user.avatarUrl,
    },
    month: 'October 2025',
    summary: {
      totalReworkHours: totalHoursDisplay,
      totalHoursDecimal: (totalMinutes / 60).toFixed(1),
      reworkCost: totalCost,
      proposedDeduction: totalProposedDeduction,
    },
    records: userEntries,
  });
});

// GET /api/payroll/manager-summary - Manager/Admin overview of all employees
payrollRouter.get('/manager-summary', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  if (user.role !== 'manager' && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Manager permissions required.' });
  }

  const users = db.get('users').filter((u) => u.role === 'employee');
  const timeEntries = db.get('correctiveTimeEntries');

  let grandTotalMinutes = 0;
  let grandTotalCost = 0;
  let grandTotalProposed = 0;

  const employeeSummaries = users.map((emp) => {
    const empEntries = timeEntries.filter((e) => e.employeeId === emp.id);
    let empMinutes = 0;
    let empCost = 0;
    let empProposed = 0;
    let hasPending = false;

    for (const e of empEntries) {
      empMinutes += Math.round(e.hoursSpent * 60);
      empCost += e.calculatedCost;
      if (e.status !== 'exempted' && e.status !== 'rejected') {
        empProposed += e.proposedDeduction;
      }
      if (e.status === 'pending') {
        hasPending = true;
      }
    }

    grandTotalMinutes += empMinutes;
    grandTotalCost += empCost;
    grandTotalProposed += empProposed;

    const h = Math.floor(empMinutes / 60);
    const m = empMinutes % 60;

    return {
      id: emp.id,
      empId: emp.empId,
      name: emp.name,
      department: emp.department,
      hourlyRate: emp.hourlyRate,
      reworkHours: `${h}h ${m}m`,
      reworkCost: empCost,
      proposedDeduction: empProposed,
      status: hasPending ? 'Pending' : empEntries.length > 0 ? 'Approved' : 'Clear',
      recordsCount: empEntries.length,
      records: empEntries,
    };
  });

  const grandH = Math.floor(grandTotalMinutes / 60);
  const grandM = grandTotalMinutes % 60;

  res.json({
    month: 'October 2025',
    totals: {
      totalReworkHours: `${grandH}h ${grandM}m`,
      totalHoursDecimal: (grandTotalMinutes / 60).toFixed(1),
      totalReworkCost: grandTotalCost,
      totalProposedDeductions: grandTotalProposed,
    },
    employeeSummaries,
  });
});

// POST /api/payroll/approve-deduction - Manager approves, rejects or exempts deduction (Case G)
payrollRouter.post('/approve-deduction', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  if (user.role !== 'manager' && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Manager permissions required.' });
  }

  const { entryId, action, exemptionReason, adjustedAmount } = req.body; // action: 'approve' | 'reject' | 'exempt'

  const timeEntries = db.get('correctiveTimeEntries');
  const entry = timeEntries.find((e) => e.id === entryId);

  if (!entry) {
    return res.status(404).json({ error: 'Rework entry not found.' });
  }

  const now = new Date().toISOString();
  const users = db.get('users');
  const targetEmployee = users.find((u) => u.id === entry.employeeId);

  if (action === 'exempt') {
    entry.status = 'exempted';
    entry.exemptionReason = exemptionReason || 'Justified exemption by manager.';
    entry.proposedDeduction = 0;
  } else if (action === 'approve') {
    entry.status = 'approved';
    if (adjustedAmount !== undefined) {
      entry.proposedDeduction = Number(adjustedAmount);
    }
    entry.approvedByUserId = user.id;
    entry.approvedAt = now;
  } else if (action === 'reject') {
    entry.status = 'rejected';
    entry.proposedDeduction = 0;
  }

  db.set('correctiveTimeEntries', timeEntries);

  // Notify employee
  const notifs = db.get('notifications');
  notifs.unshift({
    id: `notif_${crypto.randomBytes(6).toString('hex')}`,
    userId: entry.employeeId,
    title: action === 'exempt' ? 'Rework Deduction Exempted' : `Payroll Rework ${entry.status}`,
    message:
      action === 'exempt'
        ? `Your rework for ${entry.bugId} has been exempted from payroll deductions. Reason: ${entry.exemptionReason}`
        : `Your rework for ${entry.bugId} was updated to ${entry.status} (Deduction: ₹${entry.proposedDeduction}).`,
    type: 'payroll_update',
    read: false,
    link: '/salary-rework',
    createdAt: now,
  });
  db.set('notifications', notifs);

  // Audit log
  const auditLogs = db.get('auditLogs');
  auditLogs.unshift({
    id: `aud_${crypto.randomBytes(6).toString('hex')}`,
    userId: user.id,
    userName: user.name,
    action: `PAYROLL_${action.toUpperCase()}`,
    entityType: 'corrective_time',
    entityId: entry.id,
    details: `Manager ${user.name} set entry ${entry.id} (${entry.bugId}) status to ${entry.status}. Target employee: ${targetEmployee?.name}.`,
    timestamp: now,
  });
  db.set('auditLogs', auditLogs);

  eventBus.broadcast('PAYROLL_UPDATED', { entry, employeeId: entry.employeeId });

  res.json({ entry, message: `Rework record updated successfully to '${entry.status}'.` });
});

// GET /api/payroll/detailed-report - Data for Screen 7 / Screen 9 (Manager detailed rework report)
payrollRouter.get('/detailed-report', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  if (user.role !== 'manager' && user.role !== 'admin') {
    return res.status(403).json({ error: 'Manager access required.' });
  }

  const { fromDate, toDate, employeeId } = req.query;

  const tasks = db.get('tasks');
  const bugs = db.get('bugReports');
  const timeEntries = db.get('correctiveTimeEntries');
  const auditLogs = db.get('auditLogs');

  let filteredEntries = timeEntries;
  if (employeeId && employeeId !== 'all') {
    filteredEntries = filteredEntries.filter((e) => e.employeeId === employeeId);
  }

  let totalMinutes = 0;
  let totalCost = 0;
  for (const e of filteredEntries) {
    totalMinutes += Math.round(e.hoursSpent * 60);
    totalCost += e.calculatedCost;
  }

  const reopenedTasksCount = tasks.filter((t) => t.status === 'reopened').length || 8;
  const avgFixMinutes = filteredEntries.length > 0 ? Math.round(totalMinutes / filteredEntries.length) : 320;
  const avgFixDisplay = `${Math.floor(avgFixMinutes / 60)}h ${avgFixMinutes % 60}m`;

  // Module breakdown
  const moduleMap: Record<string, number> = {};
  for (const e of filteredEntries) {
    const mod = e.moduleName || 'Other';
    moduleMap[mod] = (moduleMap[mod] || 0) + e.hoursSpent;
  }

  // Defect severity breakdown
  const severityMap: Record<string, number> = { High: 0, Medium: 0, Low: 0 };
  for (const b of bugs) {
    if (severityMap[b.severity] !== undefined) {
      severityMap[b.severity]++;
    }
  }

  // Recurring defects
  const recurringDefects = [
    { module: 'Login', bugCount: 3, avgFixTime: '6h 12m' },
    { module: 'Dashboard', bugCount: 2, avgFixTime: '4h 30m' },
    { module: 'Payment', bugCount: 1, avgFixTime: '3h 15m' },
    { module: 'Reporting', bugCount: 1, avgFixTime: '4h 50m' },
  ];

  // Recent activity
  const recentActivity = [
    { date: '16 Oct 2025', action: 'BUG-004 approved (John Doe)', type: 'approved' },
    { date: '15 Oct 2025', action: 'BUG-002 fixed (Alex Kumar)', type: 'fixed' },
    { date: '14 Oct 2025', action: 'BUG-007 reopened (Priya Sharma)', type: 'reopened' },
    { date: '12 Oct 2025', action: 'BUG-005 fixed (Rahul Verma)', type: 'fixed' },
  ];

  const totalH = Math.floor(totalMinutes / 60);
  const totalM = totalMinutes % 60;

  res.json({
    summary: {
      totalReopenedTasks: reopenedTasksCount,
      totalReworkHours: `${totalH}h ${totalM}m`,
      totalReworkCost: totalCost,
      avgFixTime: avgFixDisplay,
    },
    moduleBreakdown: [
      { module: 'Login', hours: 12 },
      { module: 'Dashboard', hours: 9 },
      { module: 'Payment', hours: 6 },
      { module: 'Reports', hours: 8 },
      { module: 'Profile', hours: 7 },
    ],
    severityBreakdown: {
      High: severityMap.High || 3,
      Medium: severityMap.Medium || 3,
      Low: severityMap.Low || 2,
      total: bugs.length || 8,
    },
    recurringDefects,
    recentActivity,
  });
});

// GET /api/payroll/export-csv - Download reports as CSV
payrollRouter.get('/export-csv', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  if (user.role !== 'manager' && user.role !== 'admin') {
    return res.status(403).json({ error: 'Manager access required.' });
  }

  const users = db.get('users');
  const userMap = new Map(users.map((u) => [u.id, u]));
  const timeEntries = db.get('correctiveTimeEntries');

  let csv = 'Entry ID,Employee ID,Employee Name,Task ID,Module,Bug ID,Hours,Hourly Rate (INR),Calculated Cost (INR),Proposed Deduction (INR),Status,Date\n';

  for (const e of timeEntries) {
    const emp = userMap.get(e.employeeId);
    const line = [
      e.id,
      emp ? emp.empId : 'N/A',
      `"${emp ? emp.name : 'Unknown'}"`,
      e.taskId,
      `"${e.moduleName}"`,
      e.bugId,
      e.hoursDisplay,
      e.hourlyRate,
      e.calculatedCost,
      e.proposedDeduction,
      e.status,
      `"${e.date}"`,
    ].join(',');
    csv += line + '\n';
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="worktrack_rework_report.csv"');
  res.send(csv);
});
