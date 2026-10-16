import React, { useState } from 'react';
import { ShieldCheck, Eye, EyeOff, Lock, User, AlertCircle, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { apiLogin } from '../services/api';
import { User as UserType } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: UserType) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('EMP001');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState('employee');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('Please enter both Email/Employee ID and Password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await apiLogin(identifier, password, role);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (id: string, r: string) => {
    setIdentifier(id);
    setPassword('password123');
    setRole(r);
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#E2E8F0] grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
        {/* Left Branding Showcase with Signature Three-Color Gradient */}
        <div className="lg:col-span-5 bg-corporate-gradient p-8 sm:p-10 flex flex-col justify-between text-white relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-teal-400/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-xl">
                <ShieldCheck className="w-7 h-7 text-teal-300 stroke-[2.2]" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white">WorkTrack</h1>
                <p className="text-xs text-teal-200 font-semibold tracking-wide uppercase">Industrial Quality Engine</p>
              </div>
            </div>
            <p className="text-sm text-slate-100 font-normal mt-2 leading-relaxed opacity-90">
              Track Task, Ensure Quality, Build Better.
            </p>

            {/* Showcase Card */}
            <div className="my-8 p-5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 text-center relative">
              <div className="flex justify-center -space-x-3 mb-3">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120"
                  className="w-10 h-10 rounded-full border-2 border-[#12345A] object-cover"
                  alt="emp"
                />
                <img
                  src="https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=120"
                  className="w-10 h-10 rounded-full border-2 border-[#12345A] object-cover"
                  alt="tester"
                />
                <img
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120"
                  className="w-10 h-10 rounded-full border-2 border-[#12345A] object-cover"
                  alt="mgr"
                />
              </div>
              <p className="text-xs text-slate-100 font-semibold">
                Unified Quality Tracking across Engineering, QA & Management
              </p>
              <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-teal-200 font-bold bg-teal-950/40 py-1 px-3 rounded-full border border-teal-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Live Synchronization Active
              </div>
            </div>
          </div>

          {/* Key Principles */}
          <div className="relative z-10 pt-4 border-t border-white/15 text-xs space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-teal-200">Corporate Pillars:</p>
            <div className="flex items-center gap-2 text-slate-100 opacity-90">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-300" />
              <span>Rework-aware task tracking & persistent server timers</span>
            </div>
            <div className="flex items-center gap-2 text-slate-100 opacity-90">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-300" />
              <span>Transparent payroll adjustment & defect exemption reviews</span>
            </div>
            <div className="flex items-center gap-2 text-slate-100 opacity-90">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-300" />
              <span>Role-scoped authorization & real-time live sync</span>
            </div>
          </div>
        </div>

        {/* Right Form Container */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-[#172033] tracking-tight">Welcome Back!</h2>
              <p className="text-xs sm:text-sm text-[#64748B] mt-1 font-medium">
                Login with your organizational credentials
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-rose-50 text-rose-800 text-xs rounded-xl flex items-center gap-2.5 border border-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1.5">
                  Email or Employee ID <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter email or employee ID (e.g. EMP001)"
                    className="w-full px-4 py-2.5 text-xs rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all pl-10 text-slate-900 font-medium"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1.5">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-4 py-2.5 text-xs rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all pl-10 pr-10 text-slate-900 font-medium"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1.5">Role Portal</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-slate-900 font-medium"
                >
                  <option value="employee">Employee / Developer Portal</option>
                  <option value="tester">QA / Tester Portal</option>
                  <option value="manager">Engineering Manager / Admin Portal</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-corporate-gradient text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/25 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Authenticating...' : 'Sign In to WorkTrack'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-[#64748B]">
              Enterprise account managed by WorkTrack IAM. <span className="text-blue-600 font-semibold">Contact Administrator.</span>
            </div>

            {/* Quick Fill Test Accounts Panel */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center mb-2.5">
                Quick Test Accounts (Click to load)
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => quickFill('EMP001', 'employee')}
                  className="p-2 rounded-xl border border-[#E2E8F0] hover:border-blue-400 hover:bg-blue-50/50 text-left transition-all cursor-pointer"
                >
                  <p className="text-[11px] font-bold text-[#172033]">John Doe</p>
                  <p className="text-[10px] text-blue-600 font-semibold">Employee</p>
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('TST001', 'tester')}
                  className="p-2 rounded-xl border border-[#E2E8F0] hover:border-amber-400 hover:bg-amber-50/50 text-left transition-all cursor-pointer"
                >
                  <p className="text-[11px] font-bold text-[#172033]">Sarah QA</p>
                  <p className="text-[10px] text-amber-700 font-semibold">Tester</p>
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('MGR001', 'manager')}
                  className="p-2 rounded-xl border border-[#E2E8F0] hover:border-purple-400 hover:bg-purple-50/50 text-left transition-all cursor-pointer"
                >
                  <p className="text-[11px] font-bold text-[#172033]">M. Scott</p>
                  <p className="text-[10px] text-purple-700 font-semibold">Manager</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
