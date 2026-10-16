import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface User {
  id: string;
  empId: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: 'employee' | 'tester' | 'manager' | 'admin';
  department: string;
  designation: string;
  hourlyRate: number; // in INR (₹)
  avatarUrl: string;
  active: boolean;
  createdAt: string;
}

export interface Task {
  id: string;
  taskId: string; // e.g. T-001, TASK-012
  title: string;
  description: string;
  moduleId: string;
  moduleName: string;
  assignedToUserId: string;
  originalDeliveryUserId: string;
  createdByUserId: string;
  deadline: string;
  progress: number;
  status: 'pending' | 'in_progress' | 'completed' | 'reopened' | 'overdue';
  submissionFile?: string;
  submissionNotes?: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskHistory {
  id: string;
  taskId: string;
  previousStatus: string;
  newStatus: string;
  changedByUserId: string;
  comment: string;
  timestamp: string;
}

export interface BugReport {
  id: string;
  bugId: string; // e.g. BUG-001, BUG-004
  title: string;
  description: string;
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
  severity: 'High' | 'Medium' | 'Low';
  evidenceUrl?: string;
  evidenceName?: string;
  taskId: string;
  moduleId: string;
  moduleName: string;
  reportedByUserId: string; // tester
  reportedAt: string;
  status: 'reported' | 'assigned' | 'in_progress' | 'ready_for_review' | 'approved' | 'changes_requested' | 'rejected';
  assignedToUserId?: string; // fixing employee
  originalDelivererUserId: string; // original employee who delivered the module
  correctionDeadline?: string;
  managerNotes?: string;
  assignedAt?: string;
  assignedByUserId?: string;
}

export interface FixSubmission {
  id: string;
  bugId: string;
  taskId: string;
  employeeId: string;
  fixDescription: string;
  progressPercentage: number;
  status: 'submitted' | 'approved' | 'changes_requested';
  fixFile?: string;
  notes?: string;
  timeSpentSeconds: number;
  submittedAt: string;
  reviewedByUserId?: string;
  reviewNotes?: string;
  reviewedAt?: string;
}

export interface WorkSession {
  id: string;
  bugId: string;
  employeeId: string;
  startedAt: string; // ISO
  accumulatedSeconds: number;
  isRunning: boolean;
  lastHeartbeatAt: string;
  updatedAt: string;
}

export interface CorrectiveTimeEntry {
  id: string;
  bugId: string;
  taskId: string;
  moduleName: string;
  employeeId: string;
  hoursSpent: number; // decimal hours (e.g. 2.6 for 2h 36m)
  hoursDisplay: string; // e.g. "2h 36m"
  hourlyRate: number;
  calculatedCost: number; // hours * hourlyRate
  proposedDeduction: number;
  status: 'pending' | 'approved' | 'rejected' | 'exempted';
  exemptionReason?: string;
  date: string;
  approvedByUserId?: string;
  approvedAt?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'assignment' | 'deadline' | 'bug_reported' | 'fix_submitted' | 'changes_requested' | 'fix_approved' | 'payroll_update';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  timestamp: string;
}

export interface DatabaseData {
  users: User[];
  tasks: Task[];
  taskHistory: TaskHistory[];
  bugReports: BugReport[];
  fixSubmissions: FixSubmission[];
  workSessions: WorkSession[];
  correctiveTimeEntries: CorrectiveTimeEntry[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'worktrack_db.json');

// Password utility using standard PBKDF2
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, generatedSalt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt: generatedSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const check = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return check === hash;
}

// Initial seed generation
function createInitialDatabase(): DatabaseData {
  const defaultPass = hashPassword('password123');

  const users: User[] = [
    {
      id: 'usr_emp_001',
      empId: 'EMP001',
      name: 'John Doe',
      email: 'john.doe@worktrack.com',
      passwordHash: defaultPass.hash,
      salt: defaultPass.salt,
      role: 'employee',
      department: 'IT / Engineering',
      designation: 'Senior Developer',
      hourlyRate: 300,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      active: true,
      createdAt: '2025-01-10T09:00:00Z',
    },
    {
      id: 'usr_emp_002',
      empId: 'EMP002',
      name: 'Jane Smith',
      email: 'jane.smith@worktrack.com',
      passwordHash: defaultPass.hash,
      salt: defaultPass.salt,
      role: 'employee',
      department: 'IT / Engineering',
      designation: 'Backend Engineer',
      hourlyRate: 300,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
      active: true,
      createdAt: '2025-01-15T09:00:00Z',
    },
    {
      id: 'usr_emp_003',
      empId: 'EMP003',
      name: 'Alex Kumar',
      email: 'alex.kumar@worktrack.com',
      passwordHash: defaultPass.hash,
      salt: defaultPass.salt,
      role: 'employee',
      department: 'IT / Frontend',
      designation: 'Frontend Engineer',
      hourlyRate: 300,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
      active: true,
      createdAt: '2025-02-01T09:00:00Z',
    },
    {
      id: 'usr_emp_004',
      empId: 'EMP004',
      name: 'Priya Sharma',
      email: 'priya.sharma@worktrack.com',
      passwordHash: defaultPass.hash,
      salt: defaultPass.salt,
      role: 'employee',
      department: 'IT / Engineering',
      designation: 'Full Stack Engineer',
      hourlyRate: 300,
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
      active: true,
      createdAt: '2025-02-15T09:00:00Z',
    },
    {
      id: 'usr_emp_005',
      empId: 'EMP005',
      name: 'Rahul Verma',
      email: 'rahul.verma@worktrack.com',
      passwordHash: defaultPass.hash,
      salt: defaultPass.salt,
      role: 'employee',
      department: 'IT / Mobile',
      designation: 'Mobile Developer',
      hourlyRate: 300,
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
      active: true,
      createdAt: '2025-03-01T09:00:00Z',
    },
    {
      id: 'usr_emp_006',
      empId: 'EMP006',
      name: 'Neha Singh',
      email: 'neha.singh@worktrack.com',
      passwordHash: defaultPass.hash,
      salt: defaultPass.salt,
      role: 'employee',
      department: 'IT / Quality',
      designation: 'Software Engineer',
      hourlyRate: 300,
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
      active: true,
      createdAt: '2025-03-10T09:00:00Z',
    },
    {
      id: 'usr_tst_001',
      empId: 'TST001',
      name: 'Sarah Tester',
      email: 'tester@worktrack.com',
      passwordHash: defaultPass.hash,
      salt: defaultPass.salt,
      role: 'tester',
      department: 'QA & Testing',
      designation: 'Senior QA Engineer',
      hourlyRate: 280,
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200',
      active: true,
      createdAt: '2025-01-05T09:00:00Z',
    },
    {
      id: 'usr_mgr_001',
      empId: 'MGR001',
      name: 'Michael Scott',
      email: 'manager@worktrack.com',
      passwordHash: defaultPass.hash,
      salt: defaultPass.salt,
      role: 'manager',
      department: 'Management',
      designation: 'Engineering Manager',
      hourlyRate: 500,
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200',
      active: true,
      createdAt: '2025-01-01T09:00:00Z',
    },
    {
      id: 'usr_adm_001',
      empId: 'ADM001',
      name: 'Admin Director',
      email: 'admin@worktrack.com',
      passwordHash: defaultPass.hash,
      salt: defaultPass.salt,
      role: 'admin',
      department: 'Executive Administration',
      designation: 'System Administrator',
      hourlyRate: 600,
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200',
      active: true,
      createdAt: '2025-01-01T09:00:00Z',
    },
  ];

  const tasks: Task[] = [
    {
      id: 'tsk_001',
      taskId: 'T-001',
      title: 'Login Authentication & Validation',
      description: 'Implement secure login, session verification and error handling.',
      moduleId: 'mod_login',
      moduleName: 'Login Module',
      assignedToUserId: 'usr_emp_001',
      originalDeliveryUserId: 'usr_emp_001',
      createdByUserId: 'usr_mgr_001',
      deadline: '2025-10-12',
      progress: 100,
      status: 'completed',
      submissionFile: 'login_v1.0.zip',
      submissionNotes: 'All OAuth and JWT validations implemented.',
      submittedAt: '2025-10-10T14:30:00Z',
      createdAt: '2025-10-01T09:00:00Z',
      updatedAt: '2025-10-10T14:30:00Z',
    },
    {
      id: 'tsk_002',
      taskId: 'T-002',
      title: 'Payment Gateway Integration',
      description: 'Implement payment integration with gateway API, webhook verification and refund callback.',
      moduleId: 'mod_payment',
      moduleName: 'Payment Gateway',
      assignedToUserId: 'usr_emp_001',
      originalDeliveryUserId: 'usr_emp_002',
      createdByUserId: 'usr_mgr_001',
      deadline: '2025-10-15',
      progress: 60,
      status: 'in_progress',
      createdAt: '2025-10-02T10:00:00Z',
      updatedAt: '2025-10-11T16:00:00Z',
    },
    {
      id: 'tsk_003',
      taskId: 'T-003',
      title: 'UI Enhancement & Responsive Layout',
      description: 'Polish responsive layout for mobile viewport and navigation drawer.',
      moduleId: 'mod_ui',
      moduleName: 'UI Enhancement',
      assignedToUserId: 'usr_emp_001',
      originalDeliveryUserId: 'usr_emp_001',
      createdByUserId: 'usr_mgr_001',
      deadline: '2025-10-18',
      progress: 20,
      status: 'in_progress',
      createdAt: '2025-10-05T11:00:00Z',
      updatedAt: '2025-10-12T09:00:00Z',
    },
    {
      id: 'tsk_004',
      taskId: 'T-004',
      title: 'Reporting Dashboard Engine',
      description: 'Generate high-volume CSV exports and aggregation charts for reports.',
      moduleId: 'mod_reporting',
      moduleName: 'Reporting',
      assignedToUserId: 'usr_emp_003',
      originalDeliveryUserId: 'usr_emp_003',
      createdByUserId: 'usr_mgr_001',
      deadline: '2025-10-20',
      progress: 0,
      status: 'pending',
      createdAt: '2025-10-08T09:00:00Z',
      updatedAt: '2025-10-08T09:00:00Z',
    },
    {
      id: 'tsk_005',
      taskId: 'TASK-012',
      title: 'Special Character Password Validation',
      description: 'Login fails when special characters are used in the password field.',
      moduleId: 'mod_login',
      moduleName: 'Login Module',
      assignedToUserId: 'usr_emp_001',
      originalDeliveryUserId: 'usr_emp_001',
      createdByUserId: 'usr_mgr_001',
      deadline: '2025-10-18',
      progress: 60,
      status: 'reopened',
      createdAt: '2025-10-01T09:00:00Z',
      updatedAt: '2025-10-16T11:24:00Z',
    },
    {
      id: 'tsk_006',
      taskId: 'TASK-008',
      title: 'Analytics Dashboard Widgets',
      description: 'Provide monthly summary charts and widgets.',
      moduleId: 'mod_dash',
      moduleName: 'Dashboard',
      assignedToUserId: 'usr_emp_004',
      originalDeliveryUserId: 'usr_emp_004',
      createdByUserId: 'usr_mgr_001',
      deadline: '2025-10-14',
      progress: 100,
      status: 'completed',
      submissionFile: 'dash_widgets_v2.zip',
      submissionNotes: 'All widgets verified.',
      submittedAt: '2025-10-13T17:00:00Z',
      createdAt: '2025-10-02T09:00:00Z',
      updatedAt: '2025-10-13T17:00:00Z',
    },
  ];

  const bugReports: BugReport[] = [
    {
      id: 'bug_001',
      bugId: 'BUG-001',
      title: 'Login validation error on invalid credentials',
      description: 'Login fails with invalid credentials without showing proper error message to user.',
      stepsToReproduce: '1. Open login page\n2. Enter invalid credentials\n3. Click login',
      expectedResult: 'Error message displayed explaining incorrect credentials.',
      actualResult: 'Login successful or silent uncaught exception.',
      severity: 'High',
      evidenceUrl: 'error-screenshot.png',
      evidenceName: 'error-screenshot.png',
      taskId: 'tsk_002',
      moduleId: 'mod_payment',
      moduleName: 'Payment Gateway',
      reportedByUserId: 'usr_tst_001',
      reportedAt: '2025-10-11T10:15:00Z',
      status: 'in_progress',
      assignedToUserId: 'usr_emp_001',
      originalDelivererUserId: 'usr_emp_002',
      correctionDeadline: '2025-10-16',
      managerNotes: 'Please fix the validation issue as discussed.',
      assignedAt: '2025-10-11T14:00:00Z',
      assignedByUserId: 'usr_mgr_001',
    },
    {
      id: 'bug_002',
      bugId: 'BUG-002',
      title: 'Data mismatch in weekly summary totals',
      description: 'Weekly summary totals show mismatch when switching between tabs.',
      stepsToReproduce: '1. Navigate to Dashboard\n2. Click Weekly Summary\n3. Toggle month filter',
      expectedResult: 'Totals update consistently.',
      actualResult: 'Cached total remains displayed.',
      severity: 'Medium',
      taskId: 'tsk_004',
      moduleId: 'mod_dash',
      moduleName: 'Dashboard',
      reportedByUserId: 'usr_tst_001',
      reportedAt: '2025-10-12T11:00:00Z',
      status: 'in_progress',
      assignedToUserId: 'usr_emp_003',
      originalDelivererUserId: 'usr_emp_003',
      correctionDeadline: '2025-10-18',
      managerNotes: 'Verify cache invalidation logic.',
      assignedAt: '2025-10-12T15:00:00Z',
      assignedByUserId: 'usr_mgr_001',
    },
    {
      id: 'bug_003',
      bugId: 'BUG-003',
      title: 'Timeout on exporting high-volume reports',
      description: 'Export to CSV fails when dataset has more than 5000 rows.',
      stepsToReproduce: '1. Go to Reports\n2. Choose date range 90 days\n3. Click Export CSV',
      expectedResult: 'File downloads successfully.',
      actualResult: 'HTTP 504 Gateway Timeout error.',
      severity: 'High',
      taskId: 'tsk_004',
      moduleId: 'mod_reporting',
      moduleName: 'Reporting',
      reportedByUserId: 'usr_tst_001',
      reportedAt: '2025-10-13T09:30:00Z',
      status: 'ready_for_review',
      assignedToUserId: 'usr_emp_004',
      originalDelivererUserId: 'usr_emp_004',
      correctionDeadline: '2025-10-15',
      managerNotes: 'Stream response instead of buffering.',
      assignedAt: '2025-10-13T10:00:00Z',
      assignedByUserId: 'usr_mgr_001',
    },
    {
      id: 'bug_004',
      bugId: 'BUG-004',
      title: 'Login validation error',
      description: 'Login fails when special characters are used in the password field.',
      stepsToReproduce: '1. Enter valid username\n2. Enter password with special characters (@#$)\n3. Click login',
      expectedResult: 'User should be able to login successfully.',
      actualResult: 'Error message is shown and login fails.',
      severity: 'High',
      evidenceUrl: 'error-screenshot.png',
      evidenceName: 'error-screenshot.png',
      taskId: 'tsk_005',
      moduleId: 'mod_login',
      moduleName: 'Login Module',
      reportedByUserId: 'usr_tst_001',
      reportedAt: '2025-10-16T09:00:00Z',
      status: 'assigned',
      assignedToUserId: 'usr_emp_001',
      originalDelivererUserId: 'usr_emp_001',
      correctionDeadline: '2025-10-18',
      managerNotes: 'Ensure character escaping and UTF-8 support.',
      assignedAt: '2025-10-16T09:30:00Z',
      assignedByUserId: 'usr_mgr_001',
    },
  ];

  const fixSubmissions: FixSubmission[] = [
    {
      id: 'fix_001',
      bugId: 'BUG-001',
      taskId: 'tsk_002',
      employeeId: 'usr_emp_001',
      fixDescription: 'Implemented strict boundary and format checks in credential validator.',
      progressPercentage: 60,
      status: 'submitted',
      fixFile: 'fix_v1.1.zip',
      notes: 'Validation added for empty and malformed fields.',
      timeSpentSeconds: 8400, // 2h 20m
      submittedAt: '2025-10-15T16:30:00Z',
    },
    {
      id: 'fix_003',
      bugId: 'BUG-003',
      taskId: 'tsk_004',
      employeeId: 'usr_emp_004',
      fixDescription: 'Implemented chunked streaming CSV generation pipeline.',
      progressPercentage: 100,
      status: 'submitted',
      fixFile: 'csv_stream_fix.zip',
      notes: 'Memory consumption reduced by 85%. Ready for manager verification.',
      timeSpentSeconds: 17400, // 4h 50m
      submittedAt: '2025-10-15T17:15:00Z',
    },
  ];

  const correctiveTimeEntries: CorrectiveTimeEntry[] = [
    {
      id: 'cte_001',
      bugId: 'BUG-004',
      taskId: 'TASK-012',
      moduleName: 'Login Module',
      employeeId: 'usr_emp_001',
      hoursSpent: 2.6,
      hoursDisplay: '2h 36m',
      hourlyRate: 300,
      calculatedCost: 780,
      proposedDeduction: 780,
      status: 'approved',
      date: '16 Oct 2025',
      approvedByUserId: 'usr_mgr_001',
      approvedAt: '2025-10-16T15:00:00Z',
    },
    {
      id: 'cte_002',
      bugId: 'BUG-002',
      taskId: 'TASK-008',
      moduleName: 'Dashboard',
      employeeId: 'usr_emp_001',
      hoursSpent: 2.9,
      hoursDisplay: '2h 54m',
      hourlyRate: 300,
      calculatedCost: 870,
      proposedDeduction: 870,
      status: 'pending',
      date: '12 Oct 2025',
    },
    {
      id: 'cte_003',
      bugId: 'BUG-001',
      taskId: 'T-002',
      moduleName: 'Payment Gateway',
      employeeId: 'usr_emp_001',
      hoursSpent: 3.0,
      hoursDisplay: '3h 00m',
      hourlyRate: 300,
      calculatedCost: 900,
      proposedDeduction: 900,
      status: 'approved',
      date: '15 Oct 2025',
      approvedByUserId: 'usr_mgr_001',
      approvedAt: '2025-10-15T18:00:00Z',
    },
    {
      id: 'cte_004',
      bugId: 'BUG-002',
      taskId: 'T-004',
      moduleName: 'Dashboard',
      employeeId: 'usr_emp_003', // Alex Kumar
      hoursSpent: 8.25,
      hoursDisplay: '8h 15m',
      hourlyRate: 300,
      calculatedCost: 2475,
      proposedDeduction: 2475,
      status: 'pending',
      date: '14 Oct 2025',
    },
    {
      id: 'cte_005',
      bugId: 'BUG-003',
      taskId: 'T-005',
      moduleName: 'Reports',
      employeeId: 'usr_emp_004', // Priya Sharma
      hoursSpent: 12.33,
      hoursDisplay: '12h 20m',
      hourlyRate: 300,
      calculatedCost: 3700,
      proposedDeduction: 3700,
      status: 'approved',
      date: '15 Oct 2025',
      approvedByUserId: 'usr_mgr_001',
      approvedAt: '2025-10-15T18:30:00Z',
    },
    {
      id: 'cte_006',
      bugId: 'BUG-005',
      taskId: 'T-006',
      moduleName: 'Profile',
      employeeId: 'usr_emp_005', // Rahul Verma
      hoursSpent: 6.75,
      hoursDisplay: '6h 45m',
      hourlyRate: 300,
      calculatedCost: 2025,
      proposedDeduction: 2025,
      status: 'pending',
      date: '12 Oct 2025',
    },
    {
      id: 'cte_007',
      bugId: 'BUG-006',
      taskId: 'T-007',
      moduleName: 'Login Module',
      employeeId: 'usr_emp_006', // Neha Singh
      hoursSpent: 9.66,
      hoursDisplay: '9h 40m',
      hourlyRate: 300,
      calculatedCost: 2900,
      proposedDeduction: 2900,
      status: 'approved',
      date: '11 Oct 2025',
      approvedByUserId: 'usr_mgr_001',
      approvedAt: '2025-10-12T10:00:00Z',
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'notif_001',
      userId: 'usr_emp_001',
      title: 'New Bug Assigned',
      message: 'Manager assigned BUG-004 (Login validation error) with deadline 18 Oct 2025.',
      type: 'assignment',
      read: false,
      link: '/bug-fixing/BUG-004',
      createdAt: '2025-10-16T09:30:00Z',
    },
    {
      id: 'notif_002',
      userId: 'usr_mgr_001',
      title: 'Fix Submitted for Review',
      message: 'Priya Sharma submitted fix for BUG-003 (Reporting timeout).',
      type: 'fix_submitted',
      read: false,
      link: '/manager/progress',
      createdAt: '2025-10-15T17:15:00Z',
    },
    {
      id: 'notif_003',
      userId: 'usr_emp_001',
      title: 'Rework Approved',
      message: 'Your rework for BUG-001 has been approved (₹900).',
      type: 'fix_approved',
      read: true,
      link: '/salary-rework',
      createdAt: '2025-10-15T18:05:00Z',
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'aud_001',
      userId: 'usr_mgr_001',
      userName: 'Michael Scott',
      action: 'ASSIGN_BUG',
      entityType: 'bug',
      entityId: 'BUG-004',
      details: 'Assigned BUG-004 to John Doe (EMP001). Deadline: 18 Oct 2025.',
      timestamp: '2025-10-16T09:30:00Z',
    },
    {
      id: 'aud_002',
      userId: 'usr_emp_001',
      userName: 'John Doe',
      action: 'START_TIMER',
      entityType: 'work_session',
      entityId: 'BUG-004',
      details: 'Started corrective work timer for BUG-004 after authentication.',
      timestamp: '2025-10-16T11:24:00Z',
    },
    {
      id: 'aud_003',
      userId: 'usr_mgr_001',
      userName: 'Michael Scott',
      action: 'APPROVE_REWORK',
      entityType: 'corrective_time',
      entityId: 'cte_001',
      details: 'Approved 2h 36m rework cost ₹780 for John Doe (BUG-004).',
      timestamp: '2025-10-16T15:00:00Z',
    },
  ];

  return {
    users,
    tasks,
    taskHistory: [],
    bugReports,
    fixSubmissions,
    workSessions: [],
    correctiveTimeEntries,
    notifications,
    auditLogs,
  };
}

class DatabaseManager {
  private data: DatabaseData;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseData {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Error loading db file, generating seed data:', err);
    }
    const seed = createInitialDatabase();
    this.saveDataSync(seed);
    return seed;
  }

  public saveDataSync(dataToSave?: DatabaseData): void {
    const d = dataToSave || this.data;
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(d, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  }

  public scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveDataSync();
      this.saveTimeout = null;
    }, 100);
  }

  public get<K extends keyof DatabaseData>(key: K): DatabaseData[K] {
    return this.data[key];
  }

  public set<K extends keyof DatabaseData>(key: K, value: DatabaseData[K]): void {
    this.data[key] = value;
    this.scheduleSave();
  }

  public raw(): DatabaseData {
    return this.data;
  }

  public resetToSeed(): DatabaseData {
    this.data = createInitialDatabase();
    this.saveDataSync();
    return this.data;
  }
}

export const db = new DatabaseManager();
