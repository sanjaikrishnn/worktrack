import React, { useState } from 'react';
import { User, Task } from '../types';
import { CheckCircle, Upload, FileText, Clock, ArrowLeft, AlertCircle, CheckCircle2, ShieldCheck, Download } from 'lucide-react';
import { apiSubmitTaskWork } from '../services/api';

interface TaskDetailsPageProps {
  user: User;
  task: Task | null;
  history?: any[];
  onBack: () => void;
  onRefresh: () => void;
}

export const TaskDetailsPage: React.FC<TaskDetailsPageProps> = ({
  user,
  task,
  history = [],
  onBack,
  onRefresh,
}) => {
  const [notes, setNotes] = useState('');
  const [fileName, setFileName] = useState('deliverable_v2.0.zip');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!task) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-[#E2E8F0] text-center max-w-md mx-auto my-12">
        <p className="text-[#64748B] text-xs font-medium">Task not found or access restricted.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-[#2563EB] text-white text-xs font-bold rounded-xl cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setErrorMsg('');
      setSuccessMsg('');
      const res = await apiSubmitTaskWork(task.id, {
        submissionNotes: notes,
        fileName: fileName,
      });
      setSuccessMsg(res.message);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit work.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-semibold text-[#64748B] hover:text-[#2563EB] transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {/* Header Banner with Corporate Identity */}
      <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-3 py-1 rounded-md bg-[#EFF6FF] text-[#2563EB] border border-blue-200">
              {task.taskId}
            </span>
            <h1 className="text-xl font-extrabold text-[#172033] tracking-tight">{task.moduleName}</h1>
            <span
              className={`px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                task.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-800'
                  : task.status === 'in_progress'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {task.status === 'in_progress' ? 'In Progress' : task.status}
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-2 font-medium">
            Assigned to: <span className="font-bold text-[#172033]">{task.assignedToName || user.name}</span> •
            Committed Deadline: <span className="font-bold text-rose-600">{task.deadline}</span>
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid: Task Details & Submission vs History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Task Details and Submission Form */}
        <div className="lg:col-span-8 space-y-6">
          {/* Details Card */}
          <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs space-y-4">
            <h3 className="font-bold text-[#172033] text-base">Task Specification & Scope</h3>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="font-semibold text-slate-400 block mb-1">Target Component:</span>
                <p className="text-[#172033] font-bold text-sm">{task.moduleName}</p>
              </div>

              <div>
                <span className="font-semibold text-slate-400 block mb-1">Functional Requirements:</span>
                <p className="text-slate-800 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200/80 font-medium whitespace-pre-wrap">
                  {task.description}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-[#64748B]">Completion Progress:</span>
                  <span className="font-bold text-[#2563EB]">{task.progress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-[#2563EB] h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Work Form */}
          <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs">
            <h3 className="font-bold text-[#172033] text-base mb-1">Submit Deliverable Build</h3>
            <p className="text-xs text-[#64748B] mb-5">
              Upload release artifact or test package for QA automation verification.
            </p>

            <form onSubmit={handleSubmitWork} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#172033] mb-1.5">
                  Deliverable Archive (ZIP / TAR) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFileName(e.target.files[0].name);
                    }
                  }}
                  className="block w-full text-xs text-[#64748B] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#EFF6FF] file:text-[#2563EB] hover:file:bg-blue-100 cursor-pointer"
                />
                {fileName && (
                  <p className="text-[11px] text-[#64748B] mt-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#2563EB]" />
                    Selected File: <span className="font-bold text-[#172033]">{fileName}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1.5">
                  Release Notes / Deployment Instructions
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Include database migration notes, API keys, or verification instructions..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-corporate-gradient text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 hover:opacity-95 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                {loading ? 'Submitting Work...' : 'Submit Deliverable for QA'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Submission History */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs h-fit space-y-4">
          <div>
            <h3 className="font-bold text-[#172033] text-base mb-1">Submission History</h3>
            <p className="text-xs text-[#64748B]">Audited deliverables & release versions</p>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-[11px] text-[#64748B] mb-1">
                <span>12 Oct 2025</span>
                <span className="font-bold text-teal-700">v1.3.zip</span>
              </div>
              <p className="text-xs font-bold text-[#172033]">Updated Version</p>
              <p className="text-[11px] text-[#64748B] mt-1 leading-relaxed">
                Integrated endpoint security headers and CORS fix.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-[11px] text-[#64748B] mb-1">
                <span>10 Oct 2025</span>
                <span className="font-bold text-slate-600">v1.2.zip</span>
              </div>
              <p className="text-xs font-bold text-[#172033]">Initial Submission</p>
              <p className="text-[11px] text-[#64748B] mt-1 leading-relaxed">
                Core payment intent endpoint and basic unit tests.
              </p>
            </div>

            {history.map((h, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200">
                <span className="text-[11px] text-[#2563EB] font-bold block mb-0.5">
                  {new Date(h.timestamp).toLocaleDateString()}
                </span>
                <p className="text-xs text-[#172033] font-medium leading-relaxed">{h.comment}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
