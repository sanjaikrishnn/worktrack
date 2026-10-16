import React, { useState, useEffect } from 'react';
import { User, NotificationItem } from '../types';
import {
  Bell,
  RefreshCw,
  CheckCheck,
  RotateCcw,
  ChevronDown,
  Search,
  Menu,
  PlusCircle,
  Shield,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  apiGetNotifications,
  apiMarkNotificationRead,
  apiMarkAllNotificationsRead,
  apiResetSeed,
} from '../services/api';

interface HeaderProps {
  user: User;
  activeTab: string;
  onRefresh: () => void;
  onSwitchUser: (identifier: string, role: string) => Promise<void>;
  onNavigateTab?: (tab: string) => void;
  onToggleMobileMenu?: () => void;
  onOpenCreateTask?: () => void;
  onSearchChange?: (term: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeTab,
  onRefresh,
  onSwitchUser,
  onNavigateTab,
  onToggleMobileMenu,
  onOpenCreateTask,
  onSearchChange,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localSearch, setLocalSearch] = useState('');

  const fetchNotifs = async () => {
    try {
      const res = await apiGetNotifications();
      setNotifications(res.notifications);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, [user.id]);

  const unreadCount = notifications.filter((n: NotificationItem) => !n.read).length;

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    await fetchNotifs();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleMarkRead = async (id: string, link?: string) => {
    await apiMarkNotificationRead(id);
    setNotifications((prev: NotificationItem[]) =>
      prev.map((n: NotificationItem) => (n.id === id ? { ...n, read: true } : n))
    );
    if (link && onNavigateTab) {
      setShowNotifMenu(false);
      if (link.includes('bug-fixing')) onNavigateTab('bug-fixing');
      else if (link.includes('salary-rework')) onNavigateTab('salary-rework');
      else if (link.includes('manager/progress')) onNavigateTab('manager-progress');
      else if (link.includes('manager/bug-review')) onNavigateTab('manager-bugs');
    }
  };

  const handleMarkAllRead = async () => {
    await apiMarkAllNotificationsRead();
    setNotifications((prev: NotificationItem[]) =>
      prev.map((n: NotificationItem) => ({ ...n, read: true }))
    );
  };

  const handleResetData = async () => {
    if (confirm('Reset database to initial sample showcase data?')) {
      await apiResetSeed();
      await onRefresh();
      alert('Authoritative database reset to initial showcase records.');
    }
  };

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
    if (onSearchChange) onSearchChange(e.target.value);
  };

  const getTabTitle = (tab: string) => {
    const titles: Record<string, string> = {
      dashboard: 'Employee Dashboard',
      tasks: 'Assigned Operational Tasks',
      'bug-fixing': 'Corrective Maintenance & Rework',
      'salary-rework': 'Salary & Deduction Transparency',
      'tester-dashboard': 'QA Verification Dashboard',
      'tester-modules': 'Module QA Testing Queue',
      'tester-bugs': 'Defect Submission & Reporting',
      'manager-dashboard': 'Manager Executive Dashboard',
      'manager-employees': 'Engineering Workforce Roster',
      'manager-tasks': 'Task Allocation & Milestones',
      'manager-bugs': 'Bug Review & Assignment',
      'manager-progress': 'Bug Fix Progress & Verification',
      'manager-salary-rework': 'Salary Deduction Approvals',
      'manager-reports': 'Rework Cost & Analytics',
      profile: 'User Profile & Identity',
    };
    return titles[tab] || 'WorkTrack Portal';
  };

  return (
    <header className="h-16 bg-white border-b border-[#E2E8F0] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left: Mobile Menu & Breadcrumb */}
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-[11px] font-bold uppercase tracking-wider text-slate-400">
            WorkTrack
          </span>
          <span className="hidden sm:inline text-slate-300">/</span>
          <h2 className="text-sm sm:text-base font-bold text-[#172033] tracking-tight">
            {getTabTitle(activeTab)}
          </h2>
        </div>
      </div>

      {/* Center: Search where useful */}
      <div className="hidden lg:flex items-center flex-1 max-w-xs mx-6">
        <div className="relative w-full">
          <input
            type="text"
            value={localSearch}
            onChange={handleSearchInput}
            placeholder="Search tasks, defects, modules..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-slate-50/70"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Manager "+ Create Task" prominent CTA */}
        {(user.role === 'manager' || user.role === 'admin') && onOpenCreateTask && (
          <button
            onClick={onOpenCreateTask}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 bg-corporate-gradient text-white font-bold text-xs rounded-xl shadow-sm hover:opacity-95 transition-all cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Create Task</span>
          </button>
        )}

        {/* Live sync badge with teal pulse */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-full text-[11px] font-semibold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0D9488]"></span>
          </span>
          <span>Live Sync</span>
        </div>

        {/* Manual Refresh button */}
        <button
          onClick={handleManualRefresh}
          title="Force refresh database records"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl relative transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-xs text-[#172033]">Notifications ({unreadCount} unread)</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">No new notifications.</div>
                ) : (
                  notifications.map((n: NotificationItem) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkRead(n.id, n.link)}
                      className={`p-3.5 text-xs cursor-pointer transition-colors ${
                        n.read ? 'bg-white hover:bg-slate-50 opacity-70' : 'bg-blue-50/40 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800">{n.title}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(
                            new Date(n.createdAt)
                          )}
                        </span>
                      </div>
                      <p className="text-slate-600 leading-relaxed text-[11px]">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
            className="flex items-center gap-2 pl-2.5 pr-3 py-1.5 bg-[#EFF6FF] hover:bg-blue-100/70 rounded-xl text-xs font-bold text-blue-900 border border-blue-200/60 transition-colors cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <span className="hidden sm:inline">Role Switcher</span>
            <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
          </button>

          {showRoleSwitcher && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95">
              <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Switch Test Account
              </p>
              <div className="space-y-1 mt-1">
                <button
                  onClick={() => {
                    onSwitchUser('EMP001', 'employee');
                    setShowRoleSwitcher(false);
                  }}
                  className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between hover:bg-blue-50 transition-colors cursor-pointer ${
                    user.empId === 'EMP001' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700'
                  }`}
                >
                  <div>
                    <p className="font-bold">John Doe (EMP001)</p>
                    <p className="text-[10px] text-slate-500">Senior Developer</p>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700">
                    Employee
                  </span>
                </button>

                <button
                  onClick={() => {
                    onSwitchUser('TST001', 'tester');
                    setShowRoleSwitcher(false);
                  }}
                  className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between hover:bg-amber-50 transition-colors cursor-pointer ${
                    user.empId === 'TST001' ? 'bg-amber-50 text-amber-700 font-bold' : 'text-slate-700'
                  }`}
                >
                  <div>
                    <p className="font-bold">Sarah Tester (TST001)</p>
                    <p className="text-[10px] text-slate-500">QA Lead</p>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700">
                    Tester
                  </span>
                </button>

                <button
                  onClick={() => {
                    onSwitchUser('MGR001', 'manager');
                    setShowRoleSwitcher(false);
                  }}
                  className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between hover:bg-purple-50 transition-colors cursor-pointer ${
                    user.empId === 'MGR001' ? 'bg-purple-50 text-purple-700 font-bold' : 'text-slate-700'
                  }`}
                >
                  <div>
                    <p className="font-bold">Michael Scott (MGR001)</p>
                    <p className="text-[10px] text-slate-500">Engineering Manager</p>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700">
                    Manager
                  </span>
                </button>
              </div>

              {(user.role === 'manager' || user.role === 'admin') && (
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setShowRoleSwitcher(false);
                      handleResetData();
                    }}
                    className="w-full flex items-center gap-2 p-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Initial Showcase Data
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
