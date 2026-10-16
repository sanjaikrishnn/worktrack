import React from 'react';
import { User, Task, BugReport } from '../types';
import {
  Users,
  CheckSquare,
  CheckCircle2,
  AlertTriangle,
  Bug,
  Clock,
  IndianRupee,
  ArrowRight,
  PlusCircle,
  TrendingUp,
  ShieldCheck,
  RotateCcw,
  Timer,
  FileCheck,
} from 'lucide-react';

interface ManagerDashboardProps {
  user: User;
  tasks: Task[];
  bugs: BugReport[];
  onNavigateTab: (tab: string) => void;
  onOpenBug: (bugId: string) => void;
  onOpenCreateTask?: () => void;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  user,
  tasks,
  bugs,
  onNavigateTab,
  onOpenBug,
  onOpenCreateTask,
}) => {
  const totalEmployees = 8;
  const activeTasksCount = tasks.filter((t) => t.status !== 'completed').length || 13;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length || 32;
  const reopenedTasks = tasks.filter((t) => t.status === 'reopened').length || 8;

  const pendingBugReviews = bugs.filter((b) => b.status === 'reported' || b.status === 'assigned').length || 4;
  const pendingFixApprovals = bugs.filter((b) => b.status === 'ready_for_review').length || 2;
  const correctiveHoursAwaiting = '18h 30m';
  const proposedDeductionsTotal = '₹5,400';

  const readyForReviewBugs = bugs.filter((b) => b.status === 'ready_for_review');

  const employees = [
    { name: 'John Doe', empId: 'EMP001', role: 'Developer', progress: 40, status: 'On Track', statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { name: 'Jane Smith', empId: 'EMP002', role: 'Backend', progress: 60, status: 'In Progress', statusColor: 'bg-blue-50 text-blue-700 border-blue-200' },
    { name: 'Alex Kumar', empId: 'EMP003', role: 'Frontend', progress: 100, status: 'Completed', statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { name: 'Priya Sharma', empId: 'EMP004', role: 'Fullstack', progress: 40, status: 'In Progress', statusColor: 'bg-blue-50 text-blue-700 border-blue-200' },
    { name: 'Rahul Verma', empId: 'EMP005', role: 'Mobile', progress: 20, status: 'At Risk', statusColor: 'bg-rose-50 text-rose-700 border-rose-200' },
  ];

  return (
    <div className="space-y-6">
      {/* Header with prominent + Create Task CTA */}
      <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#172033] tracking-tight">
              Manager Dashboard
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB] border border-blue-200">
              Live Operations
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 font-normal">
            Quality control metrics, workforce allocations, defect triage, and authorized payroll adjustments.
          </p>
        </div>

        {onOpenCreateTask && (
          <button
            onClick={onOpenCreateTask}
            className="px-5 py-2.5 bg-corporate-gradient text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 hover:opacity-95 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Create Task</span>
          </button>
        )}
      </div>

      {/* 8 Operational Metric Cards (Section 5 requirement) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Employees */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#64748B]">Total Employees</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#172033]">{totalEmployees}</p>
          <span className="text-[10px] text-teal-600 font-semibold mt-1 block">Full engineering roster</span>
        </div>

        {/* Active Tasks */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#64748B]">Active Tasks</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#172033]">{activeTasksCount}</p>
          <span className="text-[10px] text-blue-600 font-semibold mt-1 block">In progress & assigned</span>
        </div>

        {/* Completed Tasks */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#64748B]">Completed Tasks</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{completedTasks}</p>
          <span className="text-[10px] text-slate-400 font-medium mt-1 block">Verified deliverables</span>
        </div>

        {/* Reopened Tasks */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#64748B]">Reopened Tasks</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-600">{reopenedTasks}</p>
          <span className="text-[10px] text-rose-600 font-semibold mt-1 block">Defects identified by QA</span>
        </div>

        {/* Pending Bug Reviews */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#64748B]">Pending Bug Reviews</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Bug className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600">{pendingBugReviews}</p>
          <span className="text-[10px] text-amber-700 font-semibold mt-1 block">Triage queue</span>
        </div>

        {/* Pending Fix Approvals */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#64748B]">Pending Fix Approvals</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0D9488]">{pendingFixApprovals}</p>
          <span className="text-[10px] text-teal-700 font-semibold mt-1 block">Awaiting signoff</span>
        </div>

        {/* Corrective Hours Awaiting Review */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#64748B]">Corrective Hours</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Timer className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#172033]">{correctiveHoursAwaiting}</p>
          <span className="text-[10px] text-[#64748B] font-medium mt-1 block">Under audit review</span>
        </div>

        {/* Proposed Payroll Adjustments */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#64748B]">Proposed Deductions</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{proposedDeductionsTotal}</p>
          <span className="text-[10px] text-teal-700 font-semibold mt-1 block">Adjustments review</span>
        </div>
      </div>

      {/* Prominent Action Banner if Fix Submissions are awaiting review */}
      {readyForReviewBugs.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 via-teal-50 to-emerald-50 border border-blue-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#12345A] text-white flex items-center justify-center shadow-md">
              <FileCheck className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-800">
                Action Required: Fix Approvals
              </p>
              <p className="text-sm font-semibold text-slate-800">
                {readyForReviewBugs.length} Fix {readyForReviewBugs.length === 1 ? 'submission' : 'submissions'} ready for manager review and payroll deduction validation.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('manager-progress')}
            className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
          >
            Review Fixes Now
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Grid: Employee Task-Progress Table & Project Quality Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Employee Task Progress Table */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[#172033] text-base">Employee Task Progress</h3>
              <p className="text-xs text-[#64748B]">Real-time milestone completion & delivery confidence</p>
            </div>
            <button
              onClick={() => onNavigateTab('manager-tasks')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              All Tasks
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-[#E2E8F0] text-[#64748B] font-semibold">
                  <th className="py-3 px-4">Engineer</th>
                  <th className="py-3 px-4">Emp ID</th>
                  <th className="py-3 px-4">Milestone Progress</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[#172033]">
                {employees.map((emp) => (
                  <tr key={emp.empId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#172033]">{emp.name}</td>
                    <td className="py-3.5 px-4 text-[#64748B] font-medium">{emp.empId}</td>
                    <td className="py-3.5 px-4 w-48">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${
                              emp.progress === 100
                                ? 'bg-[#0D9488]'
                                : emp.progress > 40
                                ? 'bg-[#2563EB]'
                                : emp.progress === 20
                                ? 'bg-rose-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${emp.progress}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-[#172033]">{emp.progress}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${emp.statusColor}`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onNavigateTab('manager-bugs')}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        Inspect
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Project Quality Overview & Circular Gauge */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-[#172033] text-base mb-1">Project Quality Overview</h3>
            <p className="text-xs text-[#64748B] mb-5">Sprint milestone health & defect recurrence</p>

            {/* Circular Gauge */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50/70 rounded-2xl border border-slate-100 mb-6">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-200"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-teal-600"
                    strokeDasharray="71, 100"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-xl font-black text-[#172033]">71%</span>
                  <span className="text-[9px] text-[#64748B] block font-semibold">Done</span>
                </div>
              </div>
              <p className="text-xs font-semibold text-[#172033] mt-2">Overall Tasks Delivered</p>
            </div>

            {/* Quick Metrics Breakdown */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[#64748B] font-medium flex items-center gap-2">
                  <Bug className="w-4 h-4 text-rose-500" />
                  Active Bugs in Triage:
                </span>
                <span className="font-bold text-[#172033]">6</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[#64748B] font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Total Rework Hours:
                </span>
                <span className="font-bold text-[#172033]">18h</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[#64748B] font-medium flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-teal-600" />
                  Estimated Rework Cost:
                </span>
                <span className="font-bold text-teal-700">₹5,400</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
            <button
              onClick={() => onNavigateTab('manager-bugs')}
              className="w-full py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              Review & Assign Defects
            </button>
            <button
              onClick={() => onNavigateTab('manager-salary-rework')}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-[#172033] font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Payroll Deductions Governance
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
