import React, { useState } from 'react';
import { Search, Plus, Calendar, Edit, Trash2, Paperclip, Send, ChevronDown, Megaphone, CheckSquare, Beaker, Clock, BookOpen, FileText, GraduationCap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAnnouncements, useCreateAnnouncement, useUpdateAnnouncement, useDeleteAnnouncement } from '../hooks/useAnnouncements';
import { UserRole } from '../types';

interface Announcement {
  id: string;
  title: string;
  desc: string;
  category: string;
  course: string;
  sender: string;
  senderRole: string;
  senderAvatar: string;
  date: string;
  unread: boolean;
  comments: Array<{
    id: number;
    sender: 'me' | 'them';
    senderName: string;
    text: string;
    time: string;
  }>;
}

export const categoryStyles: Record<string, { icon: any; bg: string; text: string; label: string }> = {
  exam: { icon: GraduationCap, bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-600 dark:text-red-400 border-red-200', label: '📢 Examination' },
  assignment: { icon: CheckSquare, bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-600 dark:text-purple-400 border-purple-200', label: '📝 Assignment' },
  quiz: { icon: Beaker, bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400 border-emerald-200', label: '🧪 Quiz' },
  deadline: { icon: Clock, bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-600 dark:text-rose-400 border-rose-200', label: '⏰ Deadline' },
  meeting: { icon: Calendar, bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-400 border-amber-200', label: '📅 Meeting' },
  resource: { icon: BookOpen, bg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-600 dark:text-teal-400 border-teal-200', label: '📚 Resource' },
  pdf: { icon: FileText, bg: 'bg-slate-50 dark:bg-slate-900/40', text: 'text-slate-600 dark:text-slate-400 border-slate-200', label: '📄 PDF' },
  general: { icon: Megaphone, bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-600 dark:text-blue-400 border-blue-200', label: '📢 Announcement' }
};

const AnnouncementsPage: React.FC = () => {
  const { user } = useAuth();
  const { classes, activeClass } = useWorkspace();
  const { data: apiAnnouncements, isLoading, error } = useAnnouncements(activeClass?.id);
  const createAnnouncement = useCreateAnnouncement();
  const updateAnnouncement = useUpdateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [commentInput, setCommentInput] = useState('');
  const [commentError, setCommentError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Map API announcements to UI format
  const mappedAnnouncements: Announcement[] = apiAnnouncements?.map((ann) => {
    let cat = 'general';
    const titleLower = ann.title.toLowerCase();
    if (titleLower.includes('exam') || titleLower.includes('test')) cat = 'exam';
    else if (titleLower.includes('assignment')) cat = 'assignment';
    else if (titleLower.includes('quiz')) cat = 'quiz';
    else if (titleLower.includes('deadline')) cat = 'deadline';
    else if (titleLower.includes('meeting')) cat = 'meeting';
    else if (titleLower.includes('resource') || titleLower.includes('lecture')) cat = 'resource';
    else if (titleLower.includes('pdf')) cat = 'pdf';

    return {
      id: ann.id,
      title: ann.title,
      desc: ann.content,
      category: cat,
      course: activeClass?.name || 'General Info',
      sender: ann.createdBy || 'Faculty Instructor',
      senderRole: 'Lecturer',
      senderAvatar: ann.createdBy?.[0] || 'F',
      date: ann.publishedAt 
        ? new Date(ann.publishedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
        : new Date(ann.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      unread: false,
      comments: []
    };
  }) || [];

  const announcements = mappedAnnouncements;

  const activeAnnouncement = announcements.find(a => a.id === selectedItemId) || announcements[0];

  const handleCreateAnnouncement = () => {
    const title = window.prompt("Enter Announcement Title:");
    if (!title) return;
    const desc = window.prompt("Enter Announcement Description:");
    if (!desc) return;
    
    const targetClassId = activeClass?.id || (classes.length > 0 ? classes[0].id : '');
    if (!targetClassId) {
      alert("Please join or select a class first.");
      return;
    }

    createAnnouncement.mutate({
      title,
      content: desc,
      classWorkspaceId: targetClassId,
      isGlobal: false,
      isPinned: false
    }, {
      onSuccess: () => {
        setSuccessMsg('Success: Announcement created successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    });
  };

  const handleEditAnnouncement = (id: string) => {
    const target = announcements.find(a => a.id === id);
    if (!target) return;
    const newTitle = window.prompt("Edit Title:", target.title);
    const newDesc = window.prompt("Edit Description:", target.desc);
    if (newTitle !== null && newDesc !== null) {
      updateAnnouncement.mutate({
        id,
        data: { title: newTitle, content: newDesc }
      }, {
        onSuccess: () => {
          setSuccessMsg('Success: Announcement updated successfully!');
          setTimeout(() => setSuccessMsg(''), 3000);
        }
      });
    }
  };

  const handleDeleteAnnouncement = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    deleteAnnouncement.mutate(id, {
      onSuccess: () => {
        setSuccessMsg('Success: Announcement deleted successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    });
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) {
      setCommentError('Please enter a comment before you can proceed.');
      return;
    }
    setCommentError('');
    setCommentInput('');
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <div className="text-slate-500 dark:text-[#94A3B8]">Loading announcements...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <div className="text-red-500">Failed to load announcements. Please try again later.</div>
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
                <Megaphone size={12} />
              </div>
              <h2 className="font-extrabold text-slate-805 dark:text-white text-sm">
                Announcements
              </h2>
            </div>
            
            {user?.role === UserRole.Lecturer && (
              <button 
                onClick={handleCreateAnnouncement}
                className="w-7 h-7 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-premium hover:scale-[1.05] active:scale-[0.98] transition-all cursor-pointer"
                title="Create Announcement"
              >
                <Plus size={14} />
              </button>
            )}
          </div>

          <div className="relative">
            <input 
              type="text" 
              placeholder="Search announcements..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/40 text-xs rounded-xl focus:outline-none focus:border-brand-primary font-semibold text-slate-700 dark:text-[#CBD5E1]"
            />
            <Search size={13} className="absolute right-3.5 top-3 text-slate-405" />
          </div>
        </div>

        {/* List of cards */}
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {announcements.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8 font-semibold">No announcements found for this class.</p>
          ) : (
            announcements
              .filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.desc.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((item) => {
                const isSelected = item.id === activeAnnouncement?.id;
                const style = categoryStyles[item.category] || categoryStyles.general;
                const Icon = style.icon;

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
                      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${style.bg} ${style.text} border`}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-[#CBD5E1] truncate">
                            {item.sender}
                          </h4>
                          <span className="text-[8px] text-slate-400 font-bold shrink-0">{item.date}</span>
                        </div>
                        <p className="text-xs font-black text-slate-750 dark:text-slate-105 truncate mt-1">
                          {item.title}
                        </p>
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
        {activeAnnouncement ? (
          <div className="flex flex-col h-full overflow-hidden">
            
            {/* Header */}
            <div className="px-8 py-5 border-b border-[#ece8f3]/80 dark:border-slate-800/40 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-primary text-white font-extrabold flex items-center justify-center text-sm shadow-sm select-none">
                  {activeAnnouncement.senderAvatar}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-805 dark:text-slate-150 text-sm">
                    {activeAnnouncement.sender}
                  </h3>
                  <p className="text-[9px] font-bold text-slate-405 uppercase tracking-wider mt-0.5">
                    {activeAnnouncement.senderRole} • {activeAnnouncement.course}
                  </p>
                </div>
              </div>
              
              {user?.role === UserRole.Lecturer && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleEditAnnouncement(activeAnnouncement.id)}
                    className="p-2 text-slate-400 hover:text-brand-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                    title="Edit Notice"
                  >
                    <Edit size={14} />
                  </button>
                  <button 
                    onClick={() => handleDeleteAnnouncement(activeAnnouncement.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all cursor-pointer"
                    title="Delete Notice"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3]/80 dark:border-slate-800/40 rounded-[2.5rem] p-8 shadow-soft space-y-4">
                <div className="flex justify-between items-center">
                  <span className={`text-[8px] font-extrabold px-2.5 py-1 border rounded-md uppercase tracking-wider ${categoryStyles[activeAnnouncement.category]?.bg} ${categoryStyles[activeAnnouncement.category]?.text}`}>
                    {categoryStyles[activeAnnouncement.category]?.label || '📢 Announcement'}
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-800 dark:text-[#F8FAFC]">
                  {activeAnnouncement.title}
                </h2>
                <p className="text-xs text-slate-600 dark:text-[#94A3B8] font-semibold leading-relaxed whitespace-pre-line">
                  {activeAnnouncement.desc}
                </p>
              </div>

              {/* Discussion Forum */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/40">
                <h4 className="text-[10px] font-bold text-slate-405 uppercase tracking-widest">Notice Comments</h4>
                <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                  Comments forum holds interactive discussions.
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-405 dark:text-[#94A3B8] font-extrabold text-xs">
            No announcements selected. Select a notice from the left list.
          </div>
        )}
      </section>
    </div>
  );
};

export default AnnouncementsPage;
