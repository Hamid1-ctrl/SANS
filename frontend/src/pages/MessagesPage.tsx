import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Send, 
  Paperclip, 
  MessageSquare, 
  FileText,
  Search,
  Pin,
  Lock,
  Unlock,
  Trash2,
  X,
  CheckCircle,
  Download,
  BookOpen,
  CornerDownRight,
  Image as ImageIcon,
  User as UserIcon,
  Mail as MailIcon,
  School,
  GraduationCap, 
  Users,
  Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import api from '../lib/axios';
import { UserRole } from '../types';
import type { DiscussionThread, DiscussionReply } from '../types';
import { StudentProfileModal } from '../components/modals/StudentProfileModal';
import { ClassRosterModal } from '../components/modals/ClassRosterModal';

const CATEGORIES = [
  'All',
  'General',
  'Assignment',
  'Quiz',
  'Lecture',
  'Meeting',
  'Announcement Follow-up',
  'Question',
  'Academic Help',
  'Other'
];

const MessagesPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { activeClass, classes } = useWorkspace();

  const [threads, setThreads] = useState<DiscussionThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [currentThread, setCurrentThread] = useState<DiscussionThread | null>(null);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Right sidebar tab state
  const [activeRightTab, setActiveRightTab] = useState<'overview' | 'notes' | 'files' | 'roster'>('overview');

  // Personal notes per thread (stored in memory keyed by threadId)
  const [threadNotes, setThreadNotes] = useState<Record<string, string>>({});

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filterType, setFilterType] = useState<'all' | 'pinned' | 'unanswered' | 'newest'>('all');

  // Create Thread Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newContent, setNewContent] = useState('');
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [isSubmittingThread, setIsSubmittingThread] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedStudentIdForModal, setSelectedStudentIdForModal] = useState<string | null>(null);
  const [isRosterOpen, setIsRosterOpen] = useState(false);

  // Reply Input State
  const [replyContent, setReplyContent] = useState('');
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [parentReply, setParentReply] = useState<DiscussionReply | null>(null);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Moderation Action Pending States
  const [isTogglingPin, setIsTogglingPin] = useState(false);
  const [isTogglingLock, setIsTogglingLock] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const repliesEndRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ─── Fetch Threads List ──────────────────────────────────────────────────
  const fetchThreads = async () => {
    setIsLoadingThreads(true);
    try {
      const params: any = {};
      if (activeClass?.id) {
        params.classWorkspaceId = activeClass.id;
      }
      if (selectedCategory && selectedCategory !== 'All') {
        params.category = selectedCategory;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (filterType !== 'all') {
        params.filter = filterType;
      }

      const response = await api.get<DiscussionThread[]>('/discussions', { params });
      setThreads(response.data);

      if (response.data.length > 0) {
        if (!selectedThreadId || !response.data.some(t => t.id === selectedThreadId)) {
          setSelectedThreadId(response.data[0].id);
        }
      } else {
        setSelectedThreadId(null);
        setCurrentThread(null);
      }
    } catch (err) {
      console.error('Failed to fetch discussion threads:', err);
    } finally {
      setIsLoadingThreads(false);
    }
  };

  // ─── Fetch Thread Detail ─────────────────────────────────────────────────
  const fetchThreadDetail = async (threadId: string) => {
    setIsLoadingDetail(true);
    try {
      const response = await api.get<DiscussionThread>(`/discussions/${threadId}`);
      setCurrentThread(response.data);
    } catch (err) {
      console.error('Failed to fetch thread details:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, [activeClass?.id, selectedCategory, filterType]);

  useEffect(() => {
    if (selectedThreadId) {
      fetchThreadDetail(selectedThreadId);
    }
  }, [selectedThreadId]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchThreads();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ─── Create Thread Handler ───────────────────────────────────────────────
  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      setCreateError('Please provide both a Title and Message.');
      return;
    }

    const targetClassId = activeClass?.id || (classes.length > 0 ? classes[0].id : null);
    if (!targetClassId) {
      setCreateError('Please select a class workspace first.');
      return;
    }

    setIsSubmittingThread(true);
    setCreateError(null);

    const formData = new FormData();
    formData.append('classWorkspaceId', targetClassId);
    formData.append('title', newTitle.trim());
    formData.append('category', newCategory);
    formData.append('content', newContent.trim());

    newFiles.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await api.post<{ threadId: string }>('/discussions', formData);
      showToast('Discussion thread posted successfully!');
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewContent('');
      setNewCategory('General');
      setNewFiles([]);
      await fetchThreads();
      if (response.data.threadId) {
        setSelectedThreadId(response.data.threadId);
      }
    } catch (err: any) {
      setCreateError(err?.response?.data?.message || 'Failed to create discussion thread.');
    } finally {
      setIsSubmittingThread(false);
    }
  };

  // ─── Create Reply Handler ────────────────────────────────────────────────
  const handleCreateReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThreadId || !replyContent.trim()) return;

    setIsSubmittingReply(true);
    setReplyError(null);

    const formData = new FormData();
    formData.append('content', replyContent.trim());
    if (parentReply) {
      formData.append('parentReplyId', parentReply.id);
    }

    replyFiles.forEach((file) => {
      formData.append('files', file);
    });

    try {
      await api.post(`/discussions/${selectedThreadId}/replies`, formData);
      setReplyContent('');
      setReplyFiles([]);
      setParentReply(null);
      await fetchThreadDetail(selectedThreadId);
      await fetchThreads();
      setTimeout(() => {
        repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      setReplyError(err?.response?.data?.message || 'Failed to post reply.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // ─── Moderation Handlers ────────────────────────────────────────────────
  const handleTogglePin = async () => {
    if (!selectedThreadId || isTogglingPin) return;
    setIsTogglingPin(true);
    const targetState = !(currentThread?.isPinned);
    
    // Optimistic local state update for instant button feel
    if (currentThread) {
      setCurrentThread({ ...currentThread, isPinned: targetState });
    }
    setThreads(prev => prev.map(t => t.id === selectedThreadId ? { ...t, isPinned: targetState } : t));

    try {
      const res = await api.post(`/discussions/${selectedThreadId}/pin`);
      const isPinnedNow = res.data?.isPinned ?? res.data?.IsPinned ?? targetState;
      showToast(isPinnedNow ? '📌 Discussion thread pinned to top.' : 'Discussion thread unpinned.');
      if (currentThread) {
        setCurrentThread({ ...currentThread, isPinned: isPinnedNow });
      }
      await fetchThreads();
    } catch (err: any) {
      console.error('Failed to toggle pin:', err);
      // Revert on error
      if (currentThread) {
        setCurrentThread({ ...currentThread, isPinned: !targetState });
      }
      setThreads(prev => prev.map(t => t.id === selectedThreadId ? { ...t, isPinned: !targetState } : t));
      showToast(err?.response?.data?.message || 'Failed to toggle pin state.');
    } finally {
      setIsTogglingPin(false);
    }
  };

  const handleToggleLock = async () => {
    if (!selectedThreadId || isTogglingLock) return;
    setIsTogglingLock(true);
    const targetState = !(currentThread?.isLocked);

    // Optimistic local state update for instant button feel
    if (currentThread) {
      setCurrentThread({ ...currentThread, isLocked: targetState });
    }
    setThreads(prev => prev.map(t => t.id === selectedThreadId ? { ...t, isLocked: targetState } : t));

    try {
      const res = await api.post(`/discussions/${selectedThreadId}/lock`);
      const isLockedNow = res.data?.isLocked ?? res.data?.IsLocked ?? targetState;
      showToast(isLockedNow ? '🔒 Discussion thread locked.' : 'Discussion thread unlocked.');
      if (currentThread) {
        setCurrentThread({ ...currentThread, isLocked: isLockedNow });
      }
      await fetchThreads();
    } catch (err: any) {
      console.error('Failed to toggle lock:', err);
      // Revert on error
      if (currentThread) {
        setCurrentThread({ ...currentThread, isLocked: !targetState });
      }
      setThreads(prev => prev.map(t => t.id === selectedThreadId ? { ...t, isLocked: !targetState } : t));
      showToast(err?.response?.data?.message || 'Failed to toggle lock state.');
    } finally {
      setIsTogglingLock(false);
    }
  };

  const handleDeleteThread = async () => {
    if (!selectedThreadId || !window.confirm('Are you sure you want to delete this discussion thread?')) return;
    try {
      await api.delete(`/discussions/${selectedThreadId}`);
      showToast('Discussion thread deleted.');
      setSelectedThreadId(null);
      setCurrentThread(null);
      await fetchThreads();
    } catch (err) {
      console.error('Failed to delete thread:', err);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!selectedThreadId || !window.confirm('Are you sure you want to delete this reply?')) return;
    try {
      await api.delete(`/discussions/replies/${replyId}`);
      showToast('Reply deleted.');
      await fetchThreadDetail(selectedThreadId);
      await fetchThreads();
    } catch (err) {
      console.error('Failed to delete reply:', err);
    }
  };

  // Helper checks
  const roleVal = currentUser?.role as any;
  const isLecturer = roleVal === UserRole.Lecturer || roleVal === 1 || String(roleVal) === 'Lecturer' || String(roleVal) === '1';
  const isCourseRep = roleVal === UserRole.ClassRepresentative || roleVal === 2 || String(roleVal) === 'ClassRepresentative' || String(roleVal) === 'CourseRep' || String(roleVal) === '2';
  const isAdmin = roleVal === UserRole.Administrator || roleVal === 3 || String(roleVal) === 'Administrator' || String(roleVal) === 'Admin' || String(roleVal) === '3';
  const isLecturerOrAdmin = isLecturer || isAdmin;
  const isStaff = isLecturerOrAdmin || isCourseRep;

  const getRoleBadge = (roleName?: string) => {
    // Backend sends Role.ToString() (e.g. "ClassRepresentative", "Administrator")
    if (roleName === 'Lecturer') {
      return <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-500/10 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-500/20">Lecturer</span>;
    }
    if (roleName === 'ClassRepresentative' || roleName === 'CourseRep') {
      return <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-500/10 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-500/20">Course Rep</span>;
    }
    if (roleName === 'Administrator' || roleName === 'Admin') {
      return <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/10 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-500/20">Administrator</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500">Student</span>;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImageFile = (type: string) => ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(type.toLowerCase());

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-[#f4f3f8] dark:bg-[#0F172A] relative font-sans">

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-bounce border border-slate-800">
          <CheckCircle size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner / Class Workspace Selector Info */}
      <div className="px-6 py-3.5 bg-white dark:bg-[#1E293B] border-b border-[#ece8f3] dark:border-slate-800/80 shrink-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center font-black">
            <MessageSquare size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">
                Academic Discussion Inbox
              </h1>
              <span className="px-2.5 py-0.5 bg-emerald-500/10 dark:bg-emerald-950/50 text-[#1e7a34] dark:text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">
                {activeClass ? activeClass.code : 'All Classes'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
              {activeClass 
                ? `Active academic discussion hub for ${activeClass.name}`
                : 'Centralized discussion threads across all your enrolled class workspaces'}
            </p>
          </div>
        </div>

        {/* Filter Quick-Bar & New Thread Button */}
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800 text-[11px] font-bold">
            <button 
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filterType === 'all' ? 'bg-white dark:bg-[#1E293B] text-slate-800 dark:text-white shadow-xs font-extrabold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              All
            </button>
            <button 
              onClick={() => setFilterType('pinned')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${filterType === 'pinned' ? 'bg-white dark:bg-[#1E293B] text-emerald-600 dark:text-emerald-400 shadow-xs font-extrabold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              <Pin size={10} /> Pinned
            </button>
            <button 
              onClick={() => setFilterType('unanswered')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filterType === 'unanswered' ? 'bg-white dark:bg-[#1E293B] text-slate-800 dark:text-white shadow-xs font-extrabold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              Unanswered
            </button>
            <button 
              onClick={() => setFilterType('newest')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filterType === 'newest' ? 'bg-white dark:bg-[#1E293B] text-slate-800 dark:text-white shadow-xs font-extrabold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              Newest
            </button>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-[#1e7a34] hover:bg-[#258d3f] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer active:scale-95 transition-all"
          >
            <Plus size={14} />
            <span>New Discussion</span>
          </button>
        </div>
      </div>

      {/* Main Container - 3 Column Layout Inspired by Modern Chat Workspace */}
      <div className="flex-1 flex min-h-0 overflow-hidden p-4 sm:p-5 gap-4">

        {/* ─── COLUMN 1: Threads List (Left Pane) ────────────────────────── */}
        <div className="w-full lg:w-80 xl:w-88 flex flex-col bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/80 rounded-[2rem] shadow-sm overflow-hidden shrink-0">
          
          {/* Header & Search Bar */}
          <div className="p-4 space-y-3 border-b border-slate-100 dark:border-slate-800/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                Your Inbox
              </span>
              <span className="text-[10px] font-bold text-[#1e7a34] bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {threads.length} Threads
              </span>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search visitor / discussion..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#f4f3f8] dark:bg-slate-900/60 border border-transparent dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#1e7a34]/40 transition-all"
              />
            </div>

            {/* Horizontal Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[10px] font-bold">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#1e7a34] text-white shadow-xs font-extrabold'
                      : 'bg-slate-100 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Threads List Scroll Area */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {isLoadingThreads ? (
              <div className="space-y-2.5 p-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="p-3.5 bg-slate-50 dark:bg-slate-900/30 rounded-2xl animate-pulse space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : threads.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
                  <MessageSquare size={20} />
                </div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">No discussions found</h4>
                <p className="text-[10px] text-slate-400">Be the first to start an academic discussion in this class.</p>
              </div>
            ) : (
              threads.map((thread) => {
                const isSelected = thread.id === selectedThreadId;
                return (
                  <div
                    key={thread.id}
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={`p-3.5 rounded-2xl transition-all cursor-pointer space-y-2 relative overflow-hidden ${
                      isSelected
                        ? 'bg-[#eef7f1] dark:bg-slate-800/90 border border-[#1e7a34]/30 shadow-xs ring-1 ring-[#1e7a34]/20'
                        : 'bg-white dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#1e7a34]" />
                    )}

                    {/* Author Avatar + Header line */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-[#1e7a34] text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs border border-white dark:border-slate-800 relative">
                          {thread.author?.profileImageUrl ? (
                            <img src={thread.author.profileImageUrl} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            thread.author?.avatarText || 'U'
                          )}
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-800" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-slate-800 dark:text-white truncate">
                            {thread.author?.name || 'User'}
                          </h4>
                          <span className="text-[10px] font-bold text-slate-400 block truncate">
                            {thread.category}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[9px] font-semibold text-slate-400 block">
                          {new Date(thread.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {thread.repliesCount > 0 && (
                          <span className="mt-1 inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-black bg-brand-green text-white">
                            {thread.repliesCount}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Thread Title & Content Snippet */}
                    <div>
                      <h3 className={`text-xs font-bold leading-snug line-clamp-1 ${isSelected ? 'text-[#1e7a34] dark:text-emerald-300 font-extrabold' : 'text-slate-800 dark:text-slate-200'}`}>
                        {thread.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1 mt-0.5">
                        {thread.content}
                      </p>
                    </div>

                    {/* Footer Badges */}
                    <div className="flex items-center justify-between text-[9px] font-bold pt-1 border-t border-slate-100/60 dark:border-slate-800/30 text-slate-400">
                      <span className="uppercase tracking-wider text-slate-450">{thread.classCode || thread.className}</span>
                      <div className="flex items-center gap-1.5">
                        {thread.isPinned && <Pin size={10} className="text-amber-500 fill-amber-500" />}
                        {thread.isLocked && <Lock size={10} className="text-rose-500" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ─── COLUMN 2: Thread Conversation / Chat Canvas (Middle Pane) ──── */}
        <div className="flex-1 flex flex-col bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/80 rounded-[2rem] shadow-sm overflow-hidden min-w-0">
          
          {isLoadingDetail ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="w-7 h-7 border-3 border-[#1e7a34] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : !currentThread ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#1e7a34]/10 flex items-center justify-center text-[#1e7a34]">
                <MessageSquare size={28} />
              </div>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Select a Discussion Thread</h3>
              <p className="text-xs text-slate-500 max-w-sm">Choose a discussion thread from your inbox or start a new academic topic.</p>
            </div>
          ) : (
            <>
              {/* Top Chat Header Bar */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 bg-[#fbfbfe]/70 dark:bg-slate-900/40 flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1e7a34] text-white text-xs font-black flex items-center justify-center shrink-0 border-2 border-white dark:border-slate-800 shadow-xs relative">
                    {currentThread.author?.profileImageUrl ? (
                      <img src={currentThread.author.profileImageUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      currentThread.author?.avatarText || 'U'
                    )}
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-800" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xs font-black text-slate-800 dark:text-white truncate">
                        {currentThread.author?.name}
                      </h2>
                      {getRoleBadge(currentThread.author?.roleName)}
                      <span className="text-[10px] text-slate-400 font-semibold">• {currentThread.category}</span>
                    </div>
                    <p className="text-xs font-extrabold text-[#1e7a34] dark:text-emerald-300 truncate mt-0.5">
                      {currentThread.title}
                    </p>
                  </div>
                </div>

                {/* Moderation Toolbar Icons — only shown to the author or staff */}
                {(currentThread.author?.id === currentUser?.id || isStaff) && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleTogglePin}
                      disabled={isTogglingPin}
                      title={currentThread.isPinned ? 'Click to Unpin Thread' : 'Click to Pin Thread'}
                      className={`px-3 py-2 rounded-xl text-xs font-black border flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 active:shadow-inner ${
                        currentThread.isPinned 
                          ? 'bg-amber-500 hover:bg-amber-600 border-amber-600 text-white shadow-amber-500/20 ring-2 ring-amber-400/40' 
                          : 'bg-slate-50 dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-amber-950/30 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-600 hover:border-amber-300'
                      }`}
                    >
                      {isTogglingPin ? (
                        <Loader2 size={14} className="animate-spin text-current" />
                      ) : (
                        <Pin size={14} className={currentThread.isPinned ? 'fill-white text-white rotate-45 transition-transform' : 'transition-transform hover:rotate-12'} />
                      )}
                      <span>{currentThread.isPinned ? 'Pinned' : 'Pin'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleLock}
                      disabled={isTogglingLock}
                      title={currentThread.isLocked ? 'Click to Unlock Thread' : 'Click to Lock Thread'}
                      className={`px-3 py-2 rounded-xl text-xs font-black border flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 active:shadow-inner ${
                        currentThread.isLocked 
                          ? 'bg-rose-600 hover:bg-rose-700 border-rose-700 text-white shadow-rose-500/20 ring-2 ring-rose-400/40' 
                          : 'bg-slate-50 dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:border-rose-300'
                      }`}
                    >
                      {isTogglingLock ? (
                        <Loader2 size={14} className="animate-spin text-current" />
                      ) : currentThread.isLocked ? (
                        <Lock size={14} className="fill-white text-white" />
                      ) : (
                        <Unlock size={14} />
                      )}
                      <span>{currentThread.isLocked ? 'Locked' : 'Lock'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDeleteThread}
                      title="Delete Discussion Thread"
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-600 hover:border-rose-300 transition-all cursor-pointer active:scale-95 shadow-xs"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Chat Thread Scrollable Messages Canvas */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-[#fbfbfe]/30 dark:bg-slate-900/20">
                
                {/* Date Divider Banner */}
                <div className="flex justify-center my-2">
                  <span className="px-3.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
                    Thread Started: {new Date(currentThread.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                {/* ORIGINAL POST CARD (MAIN TOPIC) */}
                <div className="bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 space-y-3.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1e7a34] text-white text-xs font-black flex items-center justify-center border border-white shadow-xs">
                        {currentThread.author?.profileImageUrl ? (
                          <img src={currentThread.author.profileImageUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          currentThread.author?.avatarText || 'U'
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-slate-800 dark:text-white">
                            {currentThread.author?.name || 'Author'}
                          </h4>
                          {getRoleBadge(currentThread.author?.roleName)}
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          {new Date(currentThread.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-800 dark:text-slate-100 font-medium whitespace-pre-wrap leading-relaxed">
                    {currentThread.content}
                  </div>

                  {currentThread.attachments && currentThread.attachments.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Attachments ({currentThread.attachments.length})</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {currentThread.attachments.map((att) => (
                          <a
                            key={att.id}
                            href={att.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between gap-2 hover:border-[#1e7a34]/40 transition-all text-xs group"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {isImageFile(att.fileType) ? <ImageIcon size={14} className="text-emerald-500 shrink-0" /> : <FileText size={14} className="text-blue-500 shrink-0" />}
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-[#1e7a34]">{att.fileName}</p>
                                <p className="text-[9px] text-slate-400">{formatFileSize(att.fileSize)}</p>
                              </div>
                            </div>
                            <Download size={12} className="text-slate-400 group-hover:text-[#1e7a34] shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* REPLIES / CHAT BUBBLES SECTION */}
                <div className="space-y-4 pt-2">
                  {currentThread.replies?.map((reply) => {
                    const isSelf = reply.author?.id === currentUser?.id;

                    return (
                      <div 
                        key={reply.id} 
                        className={`flex gap-3 max-w-[85%] ${isSelf ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                      >
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-[#1e7a34] text-white text-[10px] font-bold flex items-center justify-center shrink-0 border border-white dark:border-slate-800 shadow-2xs">
                          {reply.author?.profileImageUrl ? (
                            <img src={reply.author.profileImageUrl} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            reply.author?.avatarText || 'U'
                          )}
                        </div>

                        {/* Message Bubble Container */}
                        <div className="space-y-1 min-w-0">
                          {/* Sender Meta Header */}
                          <div className={`flex items-center gap-2 text-[10px] font-semibold text-slate-400 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                            <span className="font-extrabold text-slate-700 dark:text-slate-300">
                              {isSelf ? 'You (Me)' : reply.author?.name || 'User'}
                            </span>
                            {!isSelf && getRoleBadge(reply.author?.roleName)}
                            <span>{new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          {/* Chat Box Bubble */}
                          <div className={`p-4 rounded-2xl text-xs space-y-2.5 shadow-2xs ${
                            isSelf 
                              ? 'bg-[#1e7a34]/10 dark:bg-emerald-950/40 border border-[#1e7a34]/30 rounded-tr-xs text-slate-800 dark:text-slate-100'
                              : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-tl-xs text-slate-800 dark:text-slate-200'
                          }`}>
                            
                            {/* Quoted parent reply callout */}
                            {reply.parentAuthorName && (
                              <div className="p-2 bg-slate-100/80 dark:bg-slate-800/80 border-l-2 border-[#1e7a34] rounded-r-xl text-[10px] space-y-0.5">
                                <span className="font-bold text-[#1e7a34]">Replying to {reply.parentAuthorName}:</span>
                                <p className="text-slate-600 dark:text-slate-400 italic line-clamp-2">{reply.parentSnippet}</p>
                              </div>
                            )}

                            {/* Reply Message text */}
                            <p className="whitespace-pre-wrap font-medium leading-relaxed">
                              {reply.content}
                            </p>

                            {/* Reply Attachments */}
                            {reply.attachments && reply.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-200/40 dark:border-slate-800/40">
                                {reply.attachments.map((att) => (
                                  <a
                                    key={att.id}
                                    href={att.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-[10px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 hover:text-[#1e7a34]"
                                  >
                                    <Paperclip size={10} />
                                    <span className="truncate max-w-[140px]">{att.fileName}</span>
                                  </a>
                                ))}
                              </div>
                            )}

                            {/* Hover / Context Tools */}
                            <div className={`flex items-center gap-2 pt-1 text-[10px] text-slate-400 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                              <button
                                onClick={() => setParentReply(reply)}
                                className="hover:text-[#1e7a34] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <CornerDownRight size={10} /> Quote
                              </button>

                              {(reply.author?.id === currentUser?.id || isLecturerOrAdmin || (isCourseRep && reply.author?.roleName !== 'Lecturer' && reply.author?.role !== 1)) && (
                                <button
                                  onClick={() => handleDeleteReply(reply.id)}
                                  className="hover:text-rose-600 cursor-pointer transition-colors"
                                >
                                  <Trash2 size={10} />
                                </button>
                              )}
                            </div>

                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={repliesEndRef} />
                </div>

              </div>

              {/* REPLY FORM / COMPOSITION BOX (INSPIRED BY REFERENCE BOTTOM TOOLBAR) */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#1E293B] space-y-3 shrink-0">
                
                {currentThread.isLocked && !isLecturerOrAdmin ? (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-2xl text-xs font-bold flex items-center justify-center gap-2">
                    <Lock size={14} />
                    <span>This discussion has been locked by faculty moderation. Replies are disabled.</span>
                  </div>
                ) : (
                  <form onSubmit={handleCreateReply} className="space-y-2.5">
                    
                    {/* Header bar of composition box */}
                    {parentReply && (
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 px-1">
                        <div className="flex items-center gap-2 bg-[#eef7f1] dark:bg-slate-900 border border-[#1e7a34]/30 px-2.5 py-0.5 rounded-full text-[10px]">
                          <span className="text-[#1e7a34] font-bold">Replying to {parentReply.author?.name}</span>
                          <button type="button" onClick={() => setParentReply(null)} className="text-slate-400 hover:text-slate-700">
                            <X size={10} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Files Preview list */}
                    {replyFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 px-1">
                        {replyFiles.map((file, idx) => (
                          <div key={idx} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-900 border rounded-lg text-[10px] font-bold flex items-center gap-1.5">
                            <span className="truncate max-w-[120px]">{file.name}</span>
                            <button type="button" onClick={() => setReplyFiles(replyFiles.filter((_, i) => i !== idx))}>
                              <X size={10} className="text-slate-400 hover:text-red-500" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {replyError && (
                      <p className="text-[10px] font-bold text-rose-500 px-1">{replyError}</p>
                    )}

                    {/* Main Textarea & Actions Card Box */}
                    <div className="bg-[#f8f7fc] dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 space-y-2 focus-within:border-[#1e7a34]/40 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all shadow-2xs">
                      <textarea
                        rows={2}
                        placeholder="Type your response to this discussion thread..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        className="w-full bg-transparent border-none text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none"
                      />

                      {/* Bottom Action Bar inside Textarea Card */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <button
                            type="button"
                            onClick={() => replyFileInputRef.current?.click()}
                            className="p-1.5 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="Attach files (PDF, Images)"
                          >
                            <Paperclip size={15} />
                          </button>
                          <input
                            type="file"
                            ref={replyFileInputRef}
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files) {
                                setReplyFiles([...replyFiles, ...Array.from(e.target.files)]);
                              }
                            }}
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmittingReply || !replyContent.trim()}
                          className="px-5 py-2 bg-[#1e7a34] hover:bg-[#258d3f] disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm cursor-pointer transition-all"
                        >
                          <span>Send</span>
                          <Send size={13} />
                        </button>
                      </div>
                    </div>

                  </form>
                )}
              </div>
            </>
          )}
        </div>

        {/* ─── COLUMN 3: Right Details & Overview Sidebar ─── */}
        <div className="hidden xl:flex w-72 flex-col bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/80 rounded-[2rem] shadow-sm overflow-hidden shrink-0">

          {/* Top Tab Bar */}
          <div className="flex items-center border-b border-slate-100 dark:border-slate-800 px-4 pt-4 pb-0 gap-3 text-[11px] font-extrabold text-slate-400 shrink-0">
            {(['overview','notes','files', ...(isStaff ? ['roster'] : [])] as const).map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveRightTab(tab as any);
                  if (tab === 'roster') {
                    setIsRosterOpen(true);
                  }
                }}
                className={`pb-3 capitalize transition-all cursor-pointer border-b-2 ${
                  activeRightTab === tab
                    ? 'text-[#1e7a34] border-[#1e7a34] font-black'
                    : 'border-transparent hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* Quick Metrics Bar — always visible */}
            <div className="grid grid-cols-3 gap-2 bg-[#f8f7fc] dark:bg-slate-900/60 p-2.5 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-center">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Threads</span>
                <span className="text-xs font-black text-slate-800 dark:text-white">{threads.length}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Replies</span>
                <span className="text-xs font-black text-slate-800 dark:text-white">{currentThread?.repliesCount || 0}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Status</span>
                <span className={`text-[10px] font-black block ${currentThread?.isLocked ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {currentThread?.isLocked ? 'Locked' : 'Active'}
                </span>
              </div>
            </div>

            {/* ── OVERVIEW TAB ── */}
            {activeRightTab === 'overview' && (
              currentThread?.author ? (
                <div className="space-y-4">
                  {/* Author Card */}
                  <div className="space-y-3.5 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-[#1e7a34] to-[#3ea556] text-white text-xl font-black flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-md mx-auto relative">
                        {currentThread.author.profileImageUrl
                          ? <img src={currentThread.author.profileImageUrl} alt="Avatar" className="w-full h-full object-cover" />
                          : currentThread.author.avatarText}
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-800" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-slate-800 dark:text-white">{currentThread.author.name}</h3>
                        <div className="mt-1 flex justify-center">{getRoleBadge(currentThread.author.roleName)}</div>
                      </div>
                    </div>

                    <div className="space-y-2 text-[11px]">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">User Information</span>
                      <div className="flex items-center justify-between py-1 border-b border-slate-100/60 dark:border-slate-800/40">
                        <span className="text-slate-400 flex items-center gap-1.5 text-[10px]"><UserIcon size={12} /> Name</span>
                        <span className="font-bold text-slate-800 dark:text-white text-[11px]">{currentThread.author.name}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-slate-100/60 dark:border-slate-800/40">
                        <span className="text-slate-400 flex items-center gap-1.5 text-[10px]"><MailIcon size={12} /> Email</span>
                        <span className="font-bold text-slate-800 dark:text-white truncate max-w-[110px] text-[10px]">{currentThread.author.email || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-slate-100/60 dark:border-slate-800/40">
                        <span className="text-slate-400 flex items-center gap-1.5 text-[10px]"><School size={12} /> Class</span>
                        <span className="font-bold text-[#1e7a34] dark:text-emerald-300 text-[10px]">{currentThread.classCode || currentThread.className}</span>
                      </div>
                    </div>

                    {isLecturerOrAdmin && currentThread.author.id && currentThread.author.roleName !== 'Lecturer' && (
                      <button
                        onClick={() => setSelectedStudentIdForModal(currentThread.author.id!)}
                        className="w-full py-2 px-3 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-[#1e7a34] dark:text-emerald-300 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-emerald-500/20"
                      >
                        <GraduationCap size={13} /> View Student Profile
                      </button>
                    )}

                    {isStaff && (
                      <button
                        onClick={() => setIsRosterOpen(true)}
                        className="w-full py-2 px-3 bg-slate-100 dark:bg-slate-900 hover:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-white rounded-xl text-[10px] font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-800"
                      >
                        <Users size={13} /> Enrolled Students Directory
                      </button>
                    )}
                  </div>

                  {/* Class Context */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Class Context</span>
                    <div className="p-3 bg-[#eef7f1] dark:bg-slate-900/60 border border-[#1e7a34]/20 rounded-2xl space-y-1">
                      <h4 className="text-xs font-black text-slate-800 dark:text-white">{currentThread.className}</h4>
                      <p className="text-[10px] font-extrabold text-[#1e7a34] dark:text-emerald-300">{currentThread.classCode}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{currentThread.isPinned ? '📌 Pinned' : ''} {currentThread.isLocked ? '🔒 Locked' : ''}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 space-y-2 text-slate-400">
                  <BookOpen size={24} className="mx-auto" />
                  <p className="text-xs font-bold">Class Forum Hub</p>
                  <p className="text-[10px]">Select a thread to view author details.</p>
                </div>
              )
            )}

            {/* ── NOTES TAB ── Personal scratchpad per thread */}
            {activeRightTab === 'notes' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Personal Notes</span>
                  <span className="text-[9px] text-slate-400">{currentThread ? `Thread: ${currentThread.title.slice(0,20)}...` : 'No thread selected'}</span>
                </div>
                {currentThread ? (
                  <>
                    <textarea
                      rows={12}
                      placeholder="Jot down personal notes about this discussion...&#10;&#10;e.g. Key points, follow-up actions, questions to ask..."
                      value={threadNotes[currentThread.id] || ''}
                      onChange={e => setThreadNotes(prev => ({ ...prev, [currentThread.id]: e.target.value }))}
                      className="w-full p-3 bg-[#f8f7fc] dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#1e7a34]/40 resize-none transition-all leading-relaxed"
                    />
                    <p className="text-[9px] text-slate-400 text-right">{(threadNotes[currentThread.id] || '').length} chars · saved locally</p>
                  </>
                ) : (
                  <div className="p-6 text-center text-slate-400 space-y-2">
                    <FileText size={20} className="mx-auto" />
                    <p className="text-xs">Select a thread to take notes.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── FILES TAB ── All attachments from thread + replies */}
            {activeRightTab === 'files' && (
              <div className="space-y-3">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Thread Attachments</span>
                {(() => {
                  const allFiles = [
                    ...(currentThread?.attachments || []).map(a => ({ ...a, source: 'Original Post' })),
                    ...(currentThread?.replies || []).flatMap(r =>
                      (r.attachments || []).map(a => ({ ...a, source: r.author?.name || 'Reply' }))
                    )
                  ];
                  return allFiles.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 space-y-2">
                      <Paperclip size={20} className="mx-auto" />
                      <p className="text-xs font-bold">No files attached</p>
                      <p className="text-[10px]">Attachments from this thread will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {allFiles.map((att) => (
                        <a
                          key={att.id}
                          href={att.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2.5 bg-[#f8f7fc] dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-[#1e7a34]/40 transition-all group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isImageFile(att.fileType)
                              ? <ImageIcon size={14} className="text-emerald-500 shrink-0" />
                              : <FileText size={14} className="text-blue-500 shrink-0" />}
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-[#1e7a34]">{att.fileName}</p>
                              <p className="text-[9px] text-slate-400">{att.source} · {formatFileSize(att.fileSize)}</p>
                            </div>
                          </div>
                          <Download size={12} className="text-slate-400 group-hover:text-[#1e7a34] shrink-0" />
                        </a>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── ROSTER TAB ── Quick shortcut to open roster modal */}
            {activeRightTab === 'roster' && (
              <div className="space-y-3">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Class Roster</span>
                <div className="p-5 bg-[#eef7f1] dark:bg-slate-900/60 border border-[#1e7a34]/20 rounded-2xl text-center space-y-3">
                  <div className="w-12 h-12 bg-[#1e7a34]/10 rounded-full flex items-center justify-center mx-auto">
                    <Users size={22} className="text-[#1e7a34]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-white">{activeClass?.name || currentThread?.className || 'Class Roster'}</h4>
                    <p className="text-[10px] text-slate-500 mt-1">View all enrolled students and their profiles.</p>
                  </div>
                  <button
                    onClick={() => setIsRosterOpen(true)}
                    className="w-full py-2.5 bg-[#1e7a34] hover:bg-[#258d3f] text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Users size={13} /> Open Class Roster
                  </button>
                </div>

                {/* Mini thread participants list */}
                {currentThread && (() => {
                  const seen = new Set<string>();
                  const participants = [
                    currentThread.author,
                    ...(currentThread.replies || []).map(r => r.author)
                  ].filter(a => {
                    if (!a?.id || seen.has(a.id)) return false;
                    seen.add(a.id);
                    return true;
                  });
                  return participants.length > 0 ? (
                    <div className="space-y-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Thread Participants ({participants.length})</span>
                      {participants.map(p => p && (
                        <div key={p.id} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-all">
                          <div className="w-7 h-7 rounded-full bg-[#1e7a34] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {p.avatarText || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-slate-800 dark:text-white truncate">{p.name}</p>
                            <div>{getRoleBadge(p.roleName)}</div>
                          </div>
                          {(currentUser?.role === UserRole.Lecturer || currentUser?.role === UserRole.Administrator) && p.roleName !== 'Lecturer' && (
                            <button
                              onClick={() => setSelectedStudentIdForModal(p.id!)}
                              title="View profile"
                              className="ml-auto p-1 text-slate-400 hover:text-[#1e7a34] cursor-pointer transition-colors shrink-0"
                            >
                              <UserIcon size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null;
                })()}
              </div>
            )}

          </div>
        </div>

      </div>

      {/* ─── CREATE THREAD MODAL ────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-6 w-full max-w-xl shadow-2xl space-y-5">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Start New Academic Discussion</h3>
                <p className="text-[11px] text-slate-400 font-medium">Post a thread to {activeClass?.name || 'your class workspace'}</p>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-xs font-bold">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateThread} className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Discussion Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Question on Lecture 4 Database Normalization"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#fbfbfe] dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1e7a34]/40"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#fbfbfe] dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-[#1e7a34]/40 cursor-pointer"
                >
                  {CATEGORIES.filter(c => c !== 'All').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Discussion Message</label>
                <textarea
                  rows={5}
                  required
                  placeholder="Provide context, questions, or instructions..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#fbfbfe] dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1e7a34]/40 resize-none"
                />
              </div>

              {/* Attachments Upload */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Attachments (PDF, Images, Word)</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-[#1e7a34] rounded-2xl text-center cursor-pointer transition-colors space-y-1 bg-slate-50/50 dark:bg-slate-900/20"
                >
                  <Paperclip size={18} className="mx-auto text-slate-400" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Click to upload files</p>
                  <p className="text-[10px] text-slate-400">PDF, PNG, JPG, DOCX supported up to 50 MB</p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      setNewFiles([...newFiles, ...Array.from(e.target.files)]);
                    }
                  }}
                />

                {newFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {newFiles.map((file, idx) => (
                      <div key={idx} className="px-3 py-1 bg-slate-100 dark:bg-slate-900 border rounded-lg text-xs font-bold flex items-center gap-2">
                        <span className="truncate max-w-[150px]">{file.name}</span>
                        <button type="button" onClick={() => setNewFiles(newFiles.filter((_, i) => i !== idx))}>
                          <X size={12} className="text-slate-400 hover:text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-900 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingThread}
                  className="px-6 py-2.5 bg-[#1e7a34] hover:bg-[#258d3f] disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer transition-all"
                >
                  {isSubmittingThread ? 'Posting...' : 'Post Thread'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Student Profile Modal for Lecturer Inspection */}
      <StudentProfileModal
        studentId={selectedStudentIdForModal}
        isOpen={!!selectedStudentIdForModal}
        onClose={() => setSelectedStudentIdForModal(null)}
      />

      {/* Class Roster Directory Modal */}
      <ClassRosterModal
        classWorkspaceId={activeClass?.id || currentThread?.classWorkspaceId || (currentThread as any)?.classId || (classes.length > 0 ? classes[0].id : null)}
        classWorkspaceName={activeClass?.name || currentThread?.className}
        isOpen={isRosterOpen}
        onClose={() => setIsRosterOpen(false)}
        onSelectStudent={(id) => {
          setSelectedStudentIdForModal(id);
          setIsRosterOpen(false);
        }}
      />
    </div>
  );
};

export default MessagesPage;
