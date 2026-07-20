import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Calendar, Trash2, Megaphone, CheckSquare, 
  Beaker, Clock, BookOpen, FileText, GraduationCap, CheckCircle2, 
  X, Pin, Eye, Share2, EyeOff, AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAnnouncements, useCreateAnnouncement, useDeleteAnnouncement } from '../hooks/useAnnouncements';
import { UserRole } from '../types';

// Category style mapping
export const categoryStyles: Record<string, { icon: any; bg: string; text: string; label: string }> = {
  exam: { icon: GraduationCap, bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30', label: 'Exam' },
  assignment: { icon: CheckSquare, bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/30', label: 'Assignment' },
  quiz: { icon: Beaker, bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30', label: 'Quiz' },
  deadline: { icon: Clock, bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/30', label: 'Deadline' },
  meeting: { icon: Calendar, bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/30', label: 'Meeting' },
  resource: { icon: BookOpen, bg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-900/30', label: 'Resource' },
  pdf: { icon: FileText, bg: 'bg-slate-50 dark:bg-slate-900/40', text: 'text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800/30', label: 'PDF' },
  general: { icon: Megaphone, bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/30', label: 'General' }
};

// Priority styles
export const priorityStyles: Record<string, { badge: string; text: string; bg: string; border: string }> = {
  Urgent: { badge: '🔴 Urgent', text: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-900/40' },
  Important: { badge: '🟡 Important', text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-900/40' },
  General: { badge: '🟢 General', text: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-900/40', border: 'border-slate-250 dark:border-slate-800' }
};

interface UIAnnouncement {
  id: string;
  title: string;
  desc: string;
  category: string;
  priority: 'Urgent' | 'Important' | 'General';
  isPinned: boolean;
  course: string;
  courseId?: string;
  sender: string;
  senderRole: string;
  senderAvatar: string;
  date: string;
  rawDate: Date;
  unread: boolean;
  isGlobal: boolean;
}

const AnnouncementsPage: React.FC = () => {
  const { user } = useAuth();
  const { classes, activeClass } = useWorkspace();
  const { data: apiAnnouncements, isLoading, error } = useAnnouncements(activeClass?.id);
  const createAnnouncement = useCreateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState('');

  // Local read tracker
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('sans_read_announcements');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Creation form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAnnScope, setNewAnnScope] = useState<'class' | 'global'>('class');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newPriority, setNewPriority] = useState<'Urgent' | 'Important' | 'General'>('General');
  const [newIsPinned, setNewIsPinned] = useState(false);
  const [createError, setCreateError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters state
  const [activeFilter, setActiveFilter] = useState<'All' | 'University' | 'Class' | 'Urgent' | 'Unread' | 'Pinned'>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  useEffect(() => {
    try {
      localStorage.setItem('sans_read_announcements', JSON.stringify(readIds));
    } catch (e) {
      console.error('Failed to save read state', e);
    }
  }, [readIds]);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[#1e7a34] border-t-transparent animate-spin" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Loading notices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center max-w-xs">
          <AlertCircle size={32} className="text-red-400" />
          <p className="text-sm font-bold text-slate-800 dark:text-white">Failed to load notices</p>
          <p className="text-xs text-slate-500">Please check your connection and try again.</p>
        </div>
      </div>
    );
  }

  // Map API announcements to UI format
  const mappedAnnouncements: UIAnnouncement[] = apiAnnouncements?.map((ann) => {
    let cat = ann.category?.toLowerCase() || 'general';
    if (cat === 'general') {
      const titleLower = ann.title.toLowerCase();
      if (titleLower.includes('exam') || titleLower.includes('test')) cat = 'exam';
      else if (titleLower.includes('assignment')) cat = 'assignment';
      else if (titleLower.includes('quiz')) cat = 'quiz';
      else if (titleLower.includes('deadline')) cat = 'deadline';
      else if (titleLower.includes('meeting')) cat = 'meeting';
      else if (titleLower.includes('resource') || titleLower.includes('lecture')) cat = 'resource';
      else if (titleLower.includes('pdf')) cat = 'pdf';
    }

    const priority = (ann.priority === 'Urgent' || ann.priority === 'Important' || ann.priority === 'General')
      ? ann.priority : 'General';

    // Derive sender role from sender name if possible or default to Lecturer
    const senderName = ann.createdBy || 'Faculty Instructor';
    let senderRole = 'Lecturer';
    if (senderName.includes('Rep') || ann.status === 'PendingApproval') {
      senderRole = 'Class Representative';
    }

    return {
      id: ann.id,
      title: ann.title,
      desc: ann.content,
      category: cat,
      priority,
      isPinned: ann.isPinned || false,
      course: activeClass?.name || (ann.classWorkspaceId ? 'Class Workspace' : 'University Hub'),
      courseId: ann.classWorkspaceId,
      sender: senderName,
      senderRole,
      senderAvatar: senderName.substring(0, 2).toUpperCase(),
      date: ann.publishedAt 
        ? new Date(ann.publishedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
        : new Date(ann.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      rawDate: ann.publishedAt ? new Date(ann.publishedAt) : new Date(ann.createdAt),
      unread: !readIds.includes(ann.id),
      isGlobal: ann.isGlobal || !ann.classWorkspaceId
    };
  }) || [];

  // Filter & Search announcements
  const filteredAnnouncements = mappedAnnouncements.filter(ann => {
    // If we are on the University Hub, do not show class announcements!
    if (!activeClass && ann.courseId) return false;

    // 1. Search Query filter
    const matchesSearch = 
      ann.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      ann.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.sender.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Active Tab filter
    if (activeFilter === 'University') return ann.isGlobal;
    if (activeFilter === 'Class') return !ann.isGlobal;
    if (activeFilter === 'Urgent') return ann.priority === 'Urgent';
    if (activeFilter === 'Unread') return ann.unread;
    if (activeFilter === 'Pinned') return ann.isPinned;
    return true;
  });

  // Sort announcements
  // Sort logic: 
  // Pinned items always go first.
  // Urgent items go next.
  // Then sorted by newest/oldest date.
  const sortedAnnouncements = [...filteredAnnouncements].sort((a, b) => {
    // 1. Pinned first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    // 2. Urgent next
    const getPriorityVal = (p: string) => p === 'Urgent' ? 0 : p === 'Important' ? 1 : 2;
    const pA = getPriorityVal(a.priority);
    const pB = getPriorityVal(b.priority);
    if (pA !== pB) return pA - pB;

    // 3. Date sort
    const timeA = a.rawDate.getTime();
    const timeB = b.rawDate.getTime();
    return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
  });

  const activeAnnouncement = sortedAnnouncements.find(a => a.id === selectedItemId) || sortedAnnouncements[0];
  const isAuthor = activeAnnouncement?.sender === `${user?.firstName} ${user?.lastName}`;

  // Mark active announcement as read
  useEffect(() => {
    if (activeAnnouncement && !readIds.includes(activeAnnouncement.id)) {
      setReadIds(prev => [...prev, activeAnnouncement.id]);
    }
  }, [activeAnnouncement, readIds]);

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const isGlobal = user?.role === UserRole.ClassRepresentative ? false : newAnnScope === 'global';
    const targetClassId = isGlobal ? undefined : (activeClass?.id || (Array.isArray(classes) && classes.length > 0 ? classes[0].id : ''));
    if (!isGlobal && !targetClassId) {
      setCreateError('Please join or select a class workspace first.');
      return;
    }

    setCreateError('');
    setIsSubmitting(true);

    try {
      await createAnnouncement.mutateAsync({
        title: newTitle,
        content: newContent,
        classWorkspaceId: targetClassId,
        isGlobal: isGlobal,
        isPinned: newIsPinned,
        priority: newPriority,
        category: newCategory
      });

      setNewTitle('');
      setNewContent('');
      setNewCategory('general');
      setNewPriority('General');
      setNewIsPinned(false);
      setShowCreateForm(false);
      
      setSuccessMsg('Notice posted successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Failed to create announcement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!readIds.includes(id)) {
      setReadIds(prev => [...prev, id]);
    } else {
      setReadIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleShareAnnouncement = (ann: UIAnnouncement) => {
    const text = `SANS NOTICE: ${ann.title}\nBy ${ann.sender} (${ann.date})\n\n${ann.desc}`;
    navigator.clipboard.writeText(text).then(() => {
      setSuccessMsg('Notice details copied to clipboard!');
      setTimeout(() => setSuccessMsg(''), 3000);
    }).catch(() => {
      alert('Failed to copy to clipboard.');
    });
  };

  const handleDeleteAnnouncement = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this notice?")) return;
    deleteAnnouncement.mutate(id, {
      onSuccess: () => {
        setSuccessMsg('Notice deleted successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    });
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#f7f6fb] dark:bg-[#0F172A] transition-colors duration-300 relative">
      
      {/* Toast Feedback */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 bg-slate-900 dark:bg-slate-800 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-large flex items-center gap-2 animate-bounce z-[9999]">
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
              <h2 className="font-extrabold text-slate-800 dark:text-white text-sm">
                Announcements
              </h2>
            </div>
            
            {(user?.role === UserRole.Lecturer || user?.role === UserRole.ClassRepresentative) && (
              <button 
                onClick={() => { setShowCreateForm(v => !v); setCreateError(''); }}
                className="w-7 h-7 rounded-full bg-[#1e7a34] text-white flex items-center justify-center shadow hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title={showCreateForm ? 'Close panel' : 'Create announcement'}
              >
                {showCreateForm ? <X size={14} /> : <Plus size={14} />}
              </button>
            )}
          </div>

          {/* Creation Form */}
          {showCreateForm && (
            <form onSubmit={handleCreateNotice} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/40 rounded-2xl p-4 space-y-3">
              {user?.role !== UserRole.ClassRepresentative && (
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Target Location</label>
                  <select 
                    value={newAnnScope} 
                    onChange={e => setNewAnnScope(e.target.value as 'class' | 'global')}
                    className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/40 rounded-lg text-[10px] font-semibold text-slate-705 dark:text-slate-305 focus:outline-none cursor-pointer"
                  >
                    <option value="class">This Course Workspace Only ({activeClass?.code || 'None Selected'})</option>
                    <option value="global">University Hub (Visible to all students)</option>
                  </select>
                </div>
              )}
              <input 
                type="text" 
                placeholder="Title of announcement..." 
                value={newTitle} 
                onChange={e => setNewTitle(e.target.value)} 
                required
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-[11px] rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800/40 font-semibold text-slate-800 dark:text-white"
              />
              
              <textarea 
                placeholder="Content details..." 
                value={newContent} 
                onChange={e => setNewContent(e.target.value)} 
                required
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-[11px] rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800/40 font-semibold text-slate-800 dark:text-white h-20 resize-none"
              />

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Category</label>
                  <select 
                    value={newCategory} 
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white dark:bg-slate-905 border border-slate-200 dark:border-slate-800/40 rounded-lg text-[10px] font-semibold text-slate-700 dark:text-slate-350 focus:outline-none"
                  >
                    <option value="general">General</option>
                    <option value="exam">Exam</option>
                    <option value="assignment">Assignment</option>
                    <option value="quiz">Quiz</option>
                    <option value="deadline">Deadline</option>
                    <option value="meeting">Meeting</option>
                    <option value="resource">Resource</option>
                    <option value="pdf">PDF Doc</option>
                  </select>
                </div>

                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Priority</label>
                  <select 
                    value={newPriority} 
                    onChange={e => setNewPriority(e.target.value as any)}
                    className="w-full px-2 py-1.5 bg-white dark:bg-slate-905 border border-slate-200 dark:border-slate-800/40 rounded-lg text-[10px] font-semibold text-slate-700 dark:text-slate-350 focus:outline-none"
                  >
                    <option value="General">🟢 General</option>
                    <option value="Important">🟡 Important</option>
                    <option value="Urgent">🔴 Urgent</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input 
                  type="checkbox" 
                  id="newIsPinned" 
                  checked={newIsPinned} 
                  onChange={e => setNewIsPinned(e.target.checked)}
                  className="rounded border-slate-300 text-[#1e7a34] focus:ring-[#1e7a34] cursor-pointer"
                />
                <label htmlFor="newIsPinned" className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                  Pin notice to top
                </label>
              </div>

              {createError && <p className="text-[10px] text-red-500 font-bold">{createError}</p>}
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-2 bg-[#1e7a34] text-white text-[11px] font-bold rounded-xl hover:bg-[#258d3f] transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Publishing...' : 'Publish Announcement'}
              </button>
            </form>
          )}

          {/* Search Bar */}
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search announcements..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/40 text-xs rounded-xl focus:outline-none focus:border-brand-primary font-semibold text-slate-700 dark:text-[#CBD5E1]"
            />
            <Search size={13} className="absolute right-3.5 top-3 text-slate-400" />
          </div>

          {/* Filters buttons */}
          <div className="flex flex-wrap gap-1 pb-1 border-b border-slate-100 dark:border-slate-800/40">
            {(['All', 'University', 'Class', 'Urgent', 'Unread', 'Pinned'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all cursor-pointer ${
                  activeFilter === filter
                    ? 'bg-[#1e7a34]/15 text-[#1e7a34] dark:bg-[#1e7a34]/20'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                {filter === 'Urgent' ? '🔴 Urgent' : filter === 'Pinned' ? '📌 Pinned' : filter}
              </button>
            ))}
          </div>

          {/* Sort selection */}
          <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold shrink-0">
            <span>{filteredAnnouncements.length} notices found</span>
            <div className="flex items-center gap-1">
              <span>Sort:</span>
              <button 
                onClick={() => setSortBy(prev => prev === 'newest' ? 'oldest' : 'newest')}
                className="text-[#1e7a34] underline cursor-pointer"
              >
                {sortBy === 'newest' ? 'Newest first' : 'Oldest first'}
              </button>
            </div>
          </div>
        </div>

        {/* Announcements List */}
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {sortedAnnouncements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <Megaphone size={20} className="text-slate-350" />
              <p className="text-xs text-slate-400 font-semibold">No announcements found</p>
            </div>
          ) : (
            sortedAnnouncements.map((item) => {
              const isSelected = item.id === activeAnnouncement?.id;
              const style = categoryStyles[item.category] || categoryStyles.general;
              const Icon = style.icon;
              const priority = priorityStyles[item.priority] || priorityStyles.General;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  className={`p-4 rounded-[1.5rem] cursor-pointer transition-all duration-300 border relative ${
                    isSelected
                      ? 'bg-slate-50 dark:bg-slate-805 border-[#1e7a34]/25 shadow-sm'
                      : 'border-transparent bg-transparent hover:bg-white/40 dark:hover:bg-slate-900/10'
                  }`}
                >
                  {/* Left priority border stripe */}
                  {item.priority !== 'General' && (
                    <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-md ${
                      item.priority === 'Urgent' ? 'bg-red-500' : 'bg-amber-500'
                    }`} />
                  )}

                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center border ${style.bg} ${style.text}`}>
                      <Icon size={13} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold text-slate-800 dark:text-[#CBD5E1] truncate">
                          {item.sender}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {item.isPinned && <Pin size={10} className="text-amber-500 fill-amber-500 rotate-45" />}
                          <span className="text-[8px] text-slate-400 font-bold">{item.date}</span>
                        </div>
                      </div>

                      {/* Badges row */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className={`text-[7px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                        {item.priority !== 'General' && (
                          <span className={`text-[7px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${priority.bg} ${priority.text} ${priority.border}`}>
                            {item.priority}
                          </span>
                        )}
                        {item.unread && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5" title="Unread notice" />
                        )}
                      </div>

                      <h4 className="text-xs font-black text-slate-750 dark:text-slate-100 truncate mt-2 leading-tight">
                        {item.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-[#94A3B8] line-clamp-2 mt-0.5 leading-normal">
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

      {/* PANEL 2: Details View */}
      <section className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white/45 dark:bg-[#1F2937]/10">
        {activeAnnouncement ? (
          <div className="flex flex-col h-full overflow-hidden">
            
            {/* Header / Author card */}
            <div className="px-8 py-5 border-b border-[#ece8f3]/80 dark:border-slate-800/40 flex items-center justify-between shrink-0 bg-white dark:bg-[#1E293B]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-primary text-white font-extrabold flex items-center justify-center text-sm shadow select-none">
                  {activeAnnouncement.senderAvatar}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-slate-850 dark:text-slate-100 text-xs">
                      {activeAnnouncement.sender}
                    </h3>
                    <span className="text-[8px] font-bold px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded">
                      {activeAnnouncement.senderRole}
                    </span>
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                    Posted on {activeAnnouncement.date} • {activeAnnouncement.course}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleShareAnnouncement(activeAnnouncement)}
                  className="p-2 text-slate-400 hover:text-[#1e7a34] hover:bg-slate-50 dark:hover:bg-slate-805 rounded-xl transition-all cursor-pointer"
                  title="Share announcement content"
                >
                  <Share2 size={13} />
                </button>

                <button
                  onClick={(e) => handleMarkAsRead(activeAnnouncement.id, e)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-805 rounded-xl transition-all cursor-pointer"
                  title={activeAnnouncement.unread ? 'Mark as read' : 'Mark as unread'}
                >
                  {activeAnnouncement.unread ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>

                {(user?.role === UserRole.Lecturer || isAuthor) && (
                  <button 
                    onClick={() => handleDeleteAnnouncement(activeAnnouncement.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all cursor-pointer"
                    title="Delete Notice"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3]/80 dark:border-slate-800/40 rounded-3xl p-8 shadow-sm space-y-5">
                
                {/* Category & priority badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[8px] font-extrabold px-2.5 py-1 border rounded-md uppercase tracking-wider ${categoryStyles[activeAnnouncement.category]?.bg} ${categoryStyles[activeAnnouncement.category]?.text}`}>
                    {categoryStyles[activeAnnouncement.category]?.label || '📢 Announcement'}
                  </span>
                  
                  <span className={`text-[8px] font-extrabold px-2.5 py-1 border rounded-md uppercase tracking-wider ${priorityStyles[activeAnnouncement.priority]?.bg} ${priorityStyles[activeAnnouncement.priority]?.text} ${priorityStyles[activeAnnouncement.priority]?.border}`}>
                    {priorityStyles[activeAnnouncement.priority]?.badge}
                  </span>

                  {activeAnnouncement.isPinned && (
                    <span className="text-[8px] font-extrabold px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-600 border border-amber-200 dark:border-amber-900/30 rounded-md uppercase tracking-wider flex items-center gap-1">
                      <Pin size={9} className="rotate-45 fill-amber-500 text-amber-500" /> Pinned Notice
                    </span>
                  )}
                </div>

                <h2 className="text-base font-black text-slate-800 dark:text-white leading-tight">
                  {activeAnnouncement.title}
                </h2>
                
                <p className="text-xs text-slate-600 dark:text-[#CBD5E1] font-medium leading-relaxed whitespace-pre-line">
                  {activeAnnouncement.desc}
                </p>
              </div>

              {/* Discussion Forum / Comments */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/40">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Discussion Thread</h4>
                <div className="bg-slate-50 dark:bg-slate-905 border border-slate-150 dark:border-slate-800/40 rounded-2xl p-6 text-center text-slate-450 dark:text-slate-400 text-xs font-semibold">
                  Comments forum holds interactive discussions. Live threads will aggregate here.
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Megaphone size={28} className="text-slate-455" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">No notice selected</p>
              <p className="text-xs text-slate-400 mt-1">Select an announcement from the list to read it</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default AnnouncementsPage;
