import React, { useState } from 'react';
import { Search, Plus, Calendar, AlertCircle, CheckCircle, Paperclip, Send, ChevronDown, Check, Trash2, Clock, CheckSquare, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAssignments, useCreateAssignment, useDeleteAssignment, useSubmitAssignment } from '../hooks/useAssignments';
import { UserRole } from '../types';
import { categoryStyles } from './AnnouncementsPage';

interface Assignment {
  id: string;
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
  const { classes, activeClass } = useWorkspace();
  const { data: apiAssignments, isLoading, error } = useAssignments(activeClass?.id);
  const createAssignment = useCreateAssignment();
  const deleteAssignment = useDeleteAssignment();
  const submitAssignment = useSubmitAssignment();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [submittingLink, setSubmittingLink] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const mappedAssignments: Assignment[] = apiAssignments?.map((assign) => ({
    id: assign.id,
    title: assign.title,
    desc: assign.description,
    course: activeClass?.name || 'General Info',
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

  const assignments = mappedAssignments;

  const activeAssignment = assignments.find(a => a.id === selectedItemId) || assignments[0];

  const handleCreateAssignment = () => {
    const title = window.prompt("Enter Assignment Title:");
    if (!title) return;
    const description = window.prompt("Enter Assignment Description:");
    if (!description) return;
    const instructions = window.prompt("Enter Instructions (optional):") || "";
    const dueDateStr = window.prompt("Enter Due Date (YYYY-MM-DD):", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    if (!dueDateStr) return;

    const targetClassId = activeClass?.id || (classes.length > 0 ? classes[0].id : '');
    if (!targetClassId) {
      alert("Please join or select a class first.");
      return;
    }

    createAssignment.mutate({
      title,
      description,
      instructions,
      dueDate: dueDateStr,
      classWorkspaceId: targetClassId,
      maxPoints: 100,
      allowLateSubmission: true
    }, {
      onSuccess: () => {
        setSuccessMsg('Success: Assignment posted successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    });
  };

  const handleDeleteAssignment = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this assignment?")) return;
    deleteAssignment.mutate(id, {
      onSuccess: () => {
        setSuccessMsg('Success: Assignment deleted successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingLink.trim() || !activeAssignment) return;

    submitAssignment.mutate({
      assignmentId: activeAssignment.id,
      submissionUrl: submittingLink,
      comments: 'Submitted via SANS Assignment Board.'
    }, {
      onSuccess: () => {
        setSuccessMsg('Success: Assignment deliverables submitted successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    });
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

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#f7f6fb] dark:bg-[#0F172A] transition-colors duration-300 relative">
      
      {/* Toast Feedback */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-large flex items-center gap-2 animate-bounce z-[9999]">
          <CheckCircle2 size={14} className="text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* PANEL 1: Left List Panel */}
      <aside className="w-80 bg-white dark:bg-[#1E293B] border-r border-[#ece8f3] dark:border-slate-800/40 p-5 flex flex-col shrink-0 h-full overflow-y-auto">
        <div className="mb-4 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-brand-primary-light dark:bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                <CheckSquare size={12} />
              </div>
              <h2 className="font-extrabold text-slate-805 dark:text-white text-sm">
                Assignments
              </h2>
            </div>
            
            {user?.role === UserRole.Lecturer && (
              <button 
                onClick={handleCreateAssignment}
                className="w-7 h-7 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-premium hover:scale-[1.05] active:scale-[0.98] transition-all cursor-pointer"
                title="Upload Assignment"
              >
                <Plus size={14} />
              </button>
            )}
          </div>

          <div className="relative">
            <input 
              type="text" 
              placeholder="Search assignments..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/40 text-xs rounded-xl focus:outline-none focus:border-brand-primary font-semibold text-slate-700 dark:text-[#CBD5E1]"
            />
            <Search size={13} className="absolute right-3.5 top-3 text-slate-405" />
          </div>
        </div>

        {/* List of cards */}
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {assignments.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8 font-semibold">No assignments found for this class.</p>
          ) : (
            assignments
              .filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.desc.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((item) => {
                const isSelected = item.id === activeAssignment?.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={`p-4 rounded-[1.5rem] cursor-pointer transition-all duration-300 border ${
                      isSelected
                        ? 'bg-slate-50 dark:bg-slate-905 border-[#ece8f3]/80 dark:border-slate-800 shadow-soft'
                        : 'border-transparent bg-transparent hover:bg-white/40 dark:hover:bg-slate-900/10'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200">
                        <CheckSquare size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-[#CBD5E1] truncate">
                            {item.title}
                          </h4>
                          <span className="text-[8px] text-slate-405 font-bold shrink-0">{item.dueDate}</span>
                        </div>
                        <p className="text-[11px] text-slate-455 dark:text-[#94A3B8] truncate mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                );
            })
          )}
        </div>
      </aside>

      {/* PANEL 2: Middle details view */}
      <section className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white/45 dark:bg-[#1F2937]/10">
        {activeAssignment ? (
          <div className="flex flex-col h-full overflow-hidden">
            
            {/* Header */}
            <div className="px-8 py-5 border-b border-[#ece8f3]/80 dark:border-slate-800/40 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-primary text-white font-extrabold flex items-center justify-center text-sm shadow-sm select-none">
                  {activeAssignment.avatarText}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-850 dark:text-slate-150 text-sm">
                    {activeAssignment.title}
                  </h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                    {activeAssignment.course} • {activeAssignment.dueDate}
                  </p>
                </div>
              </div>
              
              {user?.role === UserRole.Lecturer && (
                <button 
                  onClick={() => handleDeleteAssignment(activeAssignment.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all cursor-pointer"
                  title="Delete Assignment"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3]/80 dark:border-slate-800/40 rounded-[2.5rem] p-8 shadow-soft space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-extrabold px-2.5 py-1 border rounded-md uppercase tracking-wider bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200">
                    📝 Assignment Task
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-[#94A3B8] font-semibold leading-relaxed whitespace-pre-line">
                  {activeAssignment.desc}
                </p>
              </div>

              {/* Submissions Panel */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/40">
                <h4 className="text-[10px] font-bold text-slate-405 uppercase tracking-widest">Submission Portal</h4>
                {user?.role === UserRole.Student ? (
                  <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/40 rounded-[2rem] p-6 shadow-sm space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Resource Attachment Link</label>
                      <input 
                        type="url" 
                        placeholder="https://github.com/... or cloud PDF link" 
                        value={submittingLink}
                        onChange={(e) => setSubmittingLink(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-955 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800/40 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-primary"
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="w-full py-2.5 bg-brand-primary text-white text-xs font-bold rounded-xl hover:bg-brand-primary-medium shadow-premium cursor-pointer"
                    >
                      Submit Assignment Deliverables
                    </button>
                  </form>
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                    Submissions can be managed from workspace analytics boards.
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-[#94A3B8] font-extrabold text-xs">
            No assignments selected. Select an assignment from the left list.
          </div>
        )}
      </section>
    </div>
  );
};

export default AssignmentsPage;
