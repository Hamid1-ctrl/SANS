import React, { useState } from 'react';
import { Search, Plus, Calendar, AlertCircle, CheckCircle, Paperclip, Send, ChevronDown, Check, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAssignments, useCreateAssignment, useDeleteAssignment, useSubmitAssignment } from '../hooks/useAssignments';
import { UserRole } from '../types';

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
  const { user } = useAuth();
  const { data: apiAssignments, isLoading, error } = useAssignments();
  const createAssignment = useCreateAssignment();
  const deleteAssignment = useDeleteAssignment();
  const submitAssignment = useSubmitAssignment();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedItemId, setSelectedItemId] = useState<number>(1);
  const [submittingLink, setSubmittingLink] = useState('');

  // Map API assignments to UI format
  const apiMapped: Assignment[] = apiAssignments?.map((assign, index) => ({
    id: index + 1,
    title: assign.title,
    desc: assign.description,
    course: 'General Info',
    dueDate: assign.dueDate 
      ? new Date(assign.dueDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
      : 'TBD',
    daysLeft: assign.dueDate 
      ? Math.ceil((new Date(assign.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0,
    status: assign.status === 0 ? 'Pending' : assign.status === 1 ? 'In Progress' : 'Submitted',
    avatarText: assign.title.substring(0, 2).toUpperCase(),
    deliverables: assign.instructions ? [assign.instructions] : []
  })) || [];

  const fallbackAssignments: Assignment[] = [
    {
      id: 1,
      title: 'Database Normalization Lab Report',
      desc: 'Write a comprehensive lab report covering 1NF, 2NF, and 3NF normalization steps with real-world entity examples and correct ERD diagrams.',
      course: 'Database Systems',
      dueDate: 'Jul 10, 2026',
      daysLeft: 6,
      status: 'Pending',
      avatarText: 'DB',
      deliverables: ['Lab report in PDF format', '3 example entity tables with normalization steps', 'ERD diagram (any CASE tool)', 'Conclusion paragraph (min. 200 words)']
    },
    {
      id: 2,
      title: 'AI Logic Planning Problem Set',
      desc: 'Solve 5 logic planning problems using the STRIPS representation. Implement solutions in Python and include unit tests covering all edge cases.',
      course: 'Artificial Intelligence',
      dueDate: 'Jul 12, 2026',
      daysLeft: 8,
      status: 'In Progress',
      avatarText: 'AI',
      deliverables: ['Python source file with STRIPS planner', 'Unit test file with min. 10 test cases', 'Readme.md with run instructions']
    },
    {
      id: 3,
      title: 'Clean Architecture Demo Application',
      desc: 'Build a RESTful API using C# and ASP.NET Core following the Clean Architecture pattern with Domain, Application, Infrastructure, and WebAPI layers.',
      course: 'Software Engineering',
      dueDate: 'Jul 18, 2026',
      daysLeft: 14,
      status: 'Pending',
      avatarText: 'SE',
      deliverables: ['GitHub repository link', 'Swagger/OpenAPI documentation', 'Architecture diagram', 'Postman collection JSON']
    }
  ];

  const assignments: Assignment[] = apiMapped.length > 0 ? apiMapped : fallbackAssignments;


  const activeAssignment = assignments.find(a => a.id === selectedItemId) || assignments[0];

  const handleCreateAssignment = () => {
    const title = window.prompt("Enter Assignment Title:");
    if (!title) return;
    const description = window.prompt("Enter Assignment Description:");
    if (!description) return;
    const instructions = window.prompt("Enter Instructions (optional):") || "";
    const dueDateStr = window.prompt("Enter Due Date (YYYY-MM-DD):", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    if (!dueDateStr) return;

    createAssignment.mutate({
      title,
      description,
      instructions,
      dueDate: new Date(dueDateStr).toISOString(),
      maxPoints: 100,
      allowLateSubmission: true,
      departmentId: user?.departmentId || "00000000-0000-0000-0000-000000000000"
    });
  };

  const handleDeleteAssignment = (id: number) => {
    if (!window.confirm("Are you sure you want to delete this assignment?")) return;
    const apiAnn = apiAssignments?.[id - 1];
    if (apiAnn) {
      deleteAssignment.mutate(apiAnn.id);
    }
  };

  const handleSubmitAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingLink.trim()) return;

    const apiAssign = apiAssignments?.[activeAssignment.id - 1];
    if (apiAssign) {
      submitAssignment.mutate({
        id: apiAssign.id,
        data: { content: submittingLink }
      });
    }
    setSubmittingLink('');
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <div className="text-slate-500 dark:text-[#94A3B8]">Loading assignments...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <div className="text-red-500">Failed to load assignments. Please try again later.</div>
      </div>
    );
  }

  if (!activeAssignment) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl">📋</div>
          <div className="text-slate-500 dark:text-[#94A3B8] font-semibold text-sm">No assignments yet</div>
          <p className="text-slate-400 dark:text-[#94A3B8] text-xs">Assignments will appear here once published.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      
      {/* PANEL 1: Left List Column */}
      <aside className="w-80 bg-transparent border-r border-[#ece8f3] dark:border-[rgba(255,255,255,0.18)] p-6 flex flex-col shrink-0 h-full overflow-y-auto">
        <div className="mb-4">
          <h2 className="font-extrabold text-slate-800 dark:text-[#F8FAFC] text-lg mb-3">
            Tasks
          </h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Search assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-[#1F2937] text-slate-800 dark:text-[#CBD5E1] border border-slate-100 dark:border-[rgba(255,255,255,0.18)] focus:outline-none focus:border-brand-green/40"
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
          
          {user?.role === UserRole.Lecturer && (
            <button 
              onClick={handleCreateAssignment}
              className="w-8 h-8 rounded-full bg-brand-green text-white flex items-center justify-center shadow-md shadow-brand-green/20 hover:scale-[1.03] transition-transform active:scale-[0.97]"
            >
              <Plus size={16} />
            </button>
          )}
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
                    ? 'bg-white dark:bg-[#1F2937] border-[#ece8f3]/80 dark:border-[rgba(255,255,255,0.18)] shadow-soft'
                    : 'border-transparent bg-transparent hover:bg-white/40 dark:hover:bg-slate-900/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-green-light dark:bg-slate-800 shrink-0 flex items-center justify-center text-brand-green font-black text-xs">
                    {item.avatarText}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-855 dark:text-slate-205 truncate">
                        {item.course}
                      </h4>
                      <span className="text-[9px] text-slate-400 font-bold shrink-0">{item.daysLeft > 0 ? `${item.daysLeft}d left` : 'Done'}</span>
                    </div>
                    <p className="text-xs font-black text-slate-800 dark:text-slate-105 truncate mt-1">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-455 dark:text-[#94A3B8] truncate mt-0.5">
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
      <section className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white/45 dark:bg-[#1F2937]/10">
        <div className="flex flex-col h-full overflow-hidden">
          
          {/* Header */}
          <div className="px-8 py-5 border-b border-[#ece8f3]/80 dark:border-[rgba(255,255,255,0.18)] flex items-center justify-between shrink-0">
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

            <div className="flex items-center gap-3">
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

              {user?.role === UserRole.Lecturer && (
                <button
                  onClick={() => handleDeleteAssignment(activeAssignment.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer"
                  title="Delete Assignment"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Description Scroll pane */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-[rgba(255,255,255,0.18)] rounded-[1.5rem] p-6 shadow-soft space-y-4">
              <h2 className="text-lg font-black text-slate-855 dark:text-[#F8FAFC]">
                {activeAssignment.title}
              </h2>
              
              <div className="flex items-center gap-2 text-xs text-slate-455 dark:text-[#94A3B8] font-semibold">
                <Calendar size={13} />
                <span>Deadline: {activeAssignment.dueDate}</span>
              </div>

              <p className="text-xs leading-relaxed text-slate-655 dark:text-slate-350 font-medium pt-3 border-t border-slate-100 dark:border-[rgba(255,255,255,0.18)]">
                {activeAssignment.desc}
              </p>
            </div>

            {/* Checklist */}
            <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-[rgba(255,255,255,0.18)] rounded-[1.5rem] p-6 shadow-soft space-y-3">
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
          <div className="p-4 border-t border-[#ece8f3]/80 dark:border-[rgba(255,255,255,0.18)] bg-white/50 dark:bg-[#1F2937]/10 shrink-0">
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
                  className="flex-1 px-4.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-[#1F2937] text-slate-855 dark:text-slate-105 border border-transparent focus:outline-none focus:border-brand-green/30 transition-all font-semibold"
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
