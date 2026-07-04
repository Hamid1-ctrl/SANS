import React, { useState } from 'react';
import { Search, Plus, Calendar, AlertCircle, CheckCircle, Paperclip, Send, ChevronDown, Check } from 'lucide-react';

interface Assignment {
  id: number;
  title: string;
  desc: string;
  course: string;
  dueDate: string;
  daysLeft: number;
  status: 'Pending' | 'In Progress' | 'Submitted';
  avatarText: string;
  deliverables: string[];
}

const AssignmentsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedItemId, setSelectedItemId] = useState<number>(1);
  const [submittingLink, setSubmittingLink] = useState('');

  const [assignments, setAssignments] = useState<Assignment[]>([
    {
      id: 1,
      title: 'Software Project Implementation',
      desc: 'Submit the completed GitHub repository link along with the implementation report detailing architectural design patterns and structural choices.',
      course: 'Software Engineering',
      dueDate: 'July 05, 2026',
      daysLeft: 3,
      status: 'Pending',
      avatarText: 'SE',
      deliverables: [
        'Completed source code repository link',
        'Architecture design patterns report PDF',
        'Verified compile outputs log'
      ]
    },
    {
      id: 2,
      title: 'Database Schema Design Document',
      desc: 'Formulate normalized relation schemes (up to 3NF/BCNF) and entity relationship modeling diagrams representing a virtual library notification catalog.',
      course: 'Database Systems',
      dueDate: 'July 07, 2026',
      daysLeft: 5,
      status: 'In Progress',
      avatarText: 'DS',
      deliverables: [
        'Relational schema normalization layout map',
        'Entity relationship modeling diagrams ERD'
      ]
    },
    {
      id: 3,
      title: 'Vite & Tailwind v4 Custom Boilerplate',
      desc: 'Create a reusable, premium starter boilerplate template containing theme configuration, standard directories, and basic layout components.',
      course: 'Frontend Engineering',
      dueDate: 'July 10, 2026',
      daysLeft: 8,
      status: 'Submitted',
      avatarText: 'FE',
      deliverables: [
        'Vite configuration ts files',
        'Tailwind css theme definitions',
        'Basic React routes layout'
      ]
    },
    {
      id: 4,
      title: 'Security Audit & Penetration Testing',
      desc: 'Analyze vulnerability endpoints in mock servers and compose threat mitigation blueprints demonstrating defense mechanics against SQL injections.',
      course: 'Cybersecurity',
      dueDate: 'July 14, 2026',
      daysLeft: 12,
      status: 'Pending',
      avatarText: 'CS',
      deliverables: [
        'Threat diagram and audit report PDF',
        'Firewall configuration scripts zip'
      ]
    }
  ]);

  const activeAssignment = assignments.find(a => a.id === selectedItemId) || assignments[0];

  const handleSubmitAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingLink.trim()) return;

    const updated = assignments.map(a => {
      if (a.id === activeAssignment.id) {
        return {
          ...a,
          status: 'Submitted' as const
        };
      }
      return a;
    });

    setAssignments(updated);
    setSubmittingLink('');
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      
      {/* PANEL 1: Left List Column */}
      <aside className="w-80 bg-transparent border-r border-[#ece8f3] dark:border-slate-800/40 p-6 flex flex-col shrink-0 h-full overflow-y-auto">
        <div className="mb-4">
          <h2 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg mb-3">
            Tasks
          </h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Search assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 focus:outline-none focus:border-brand-green/40"
            />
            <Search className="absolute left-3.5 top-3 text-slate-400" size={14} />
          </div>
        </div>

        {/* Dropdowns sort & release */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-1">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-extrabold text-slate-700 dark:text-slate-350 focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="submitted">Submitted</option>
            </select>
            <ChevronDown size={12} className="text-slate-505" />
          </div>
          
          <button className="w-8 h-8 rounded-full bg-brand-green text-white flex items-center justify-center shadow-md shadow-brand-green/20 hover:scale-[1.03] transition-transform active:scale-[0.97]">
            <Plus size={16} />
          </button>
        </div>

        {/* Scroll list */}
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {assignments.map((item) => {
            const isSelected = item.id === selectedItemId;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedItemId(item.id)}
                className={`p-4 rounded-[1.5rem] cursor-pointer transition-all duration-300 border ${
                  isSelected
                    ? 'bg-white dark:bg-[#1a1726] border-[#ece8f3]/80 dark:border-slate-800/40 shadow-soft'
                    : 'border-transparent bg-transparent hover:bg-white/40 dark:hover:bg-slate-900/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-green-light dark:bg-slate-800 shrink-0 flex items-center justify-center text-brand-green font-black text-xs">
                    {item.avatarText}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-850 dark:text-slate-205 truncate">
                        {item.course}
                      </h4>
                      <span className="text-[9px] text-slate-400 font-bold shrink-0">{item.daysLeft > 0 ? `${item.daysLeft}d left` : 'Done'}</span>
                    </div>
                    <p className="text-xs font-black text-slate-800 dark:text-slate-105 truncate mt-1">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-455 dark:text-slate-400 truncate mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* PANEL 2: Middle Detail Column */}
      <section className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white/45 dark:bg-slate-900/10">
        <div className="flex flex-col h-full overflow-hidden">
          
          {/* Header */}
          <div className="px-8 py-5 border-b border-[#ece8f3]/80 dark:border-slate-800/30 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-green text-white font-extrabold flex items-center justify-center text-sm shadow-sm">
                {activeAssignment.avatarText}
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-sm">
                  {activeAssignment.course}
                </h3>
                <p className="text-[9px] font-bold text-slate-455 uppercase tracking-wider mt-0.5">
                  Assigned Project • Due {activeAssignment.dueDate}
                </p>
              </div>
            </div>

            <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1 ${
              activeAssignment.status === 'Submitted'
                ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20'
                : activeAssignment.status === 'In Progress'
                ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20'
            }`}>
              {activeAssignment.status === 'Submitted' && <CheckCircle size={10} />}
              {activeAssignment.status === 'Pending' && <AlertCircle size={10} />}
              {activeAssignment.status}
            </span>
          </div>

          {/* Description Scroll pane */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            <div className="bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-[1.5rem] p-6 shadow-soft space-y-4">
              <h2 className="text-lg font-black text-slate-855 dark:text-slate-100">
                {activeAssignment.title}
              </h2>
              
              <div className="flex items-center gap-2 text-xs text-slate-455 dark:text-slate-400 font-semibold">
                <Calendar size={13} />
                <span>Deadline: {activeAssignment.dueDate}</span>
              </div>

              <p className="text-xs leading-relaxed text-slate-655 dark:text-slate-350 font-medium pt-3 border-t border-slate-100 dark:border-slate-800/40">
                {activeAssignment.desc}
              </p>
            </div>

            {/* Checklist */}
            <div className="bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-[1.5rem] p-6 shadow-soft space-y-3">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Deliverables Checklist
              </h4>

              <div className="space-y-2">
                {activeAssignment.deliverables.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-350 font-semibold">
                    <div className="w-4 h-4 rounded bg-brand-green-light dark:bg-slate-800 flex items-center justify-center mt-0.5 text-brand-green shrink-0 shadow-sm border border-brand-green/10">
                      <Check size={10} />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Submission Box */}
          <div className="p-4 border-t border-[#ece8f3]/80 dark:border-slate-800/30 bg-white/50 dark:bg-slate-900/10 shrink-0">
            {activeAssignment.status !== 'Submitted' ? (
              <form onSubmit={handleSubmitAssignment} className="flex items-center gap-3.5">
                <button type="button" className="p-2 text-slate-400 hover:text-slate-650 rounded-xl" title="Attach Files">
                  <Paperclip size={16} />
                </button>
                <input
                  type="text"
                  value={submittingLink}
                  onChange={(e) => setSubmittingLink(e.target.value)}
                  placeholder="Paste GitHub Repository link or document URL..."
                  className="flex-1 px-4.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 text-slate-855 dark:text-slate-105 border border-transparent focus:outline-none focus:border-brand-green/30 transition-all font-semibold"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-brand-green text-white hover:bg-brand-green/90 rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-green/20 active:scale-[0.96] flex items-center gap-1.5"
                >
                  <Send size={13} />
                  <span>Submit Task</span>
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between px-2 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span>Task Successfully submitted ✓</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">graded pending</span>
              </div>
            )}
          </div>

        </div>
      </section>

    </div>
  );
};

export default AssignmentsPage;
