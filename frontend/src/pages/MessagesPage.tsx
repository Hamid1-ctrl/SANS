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
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import api from '../lib/axios';
import { UserRole } from '../types';
import type { DiscussionThread, DiscussionReply } from '../types';
import { StudentProfileModal } from '../components/modals/StudentProfileModal';
import { ClassRosterModal } from '../components/modals/ClassRosterModal';
import { GraduationCap, Users } from 'lucide-react';

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
      const response = await api.post<{ threadId: string }>('/discussions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
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
    if (!replyContent.trim() || !selectedThreadId) return;

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
      await api.post(`/discussions/${selectedThreadId}/replies`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setReplyContent('');
      setReplyFiles([]);
      setParentReply(null);
      await fetchThreadDetail(selectedThreadId);
      await fetchThreads();
      setTimeout(() => {
        repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    } catch (err: any) {
      setReplyError(err?.response?.data?.message || 'Failed to post reply.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // ─── Moderation Actions ──────────────────────────────────────────────────
  const handleTogglePin = async () => {
    if (!selectedThreadId) return;
    try {
      const res = await api.put<{ isPinned: boolean }>(`/discussions/${selectedThreadId}/pin`);
      showToast(res.data.isPinned ? 'Discussion thread pinned to top.' : 'Discussion thread unpinned.');
      fetchThreadDetail(selectedThreadId);
      fetchThreads();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleLock = async () => {
    if (!selectedThreadId) return;
    try {
      const res = await api.put<{ isLocked: boolean }>(`/discussions/${selectedThreadId}/lock`);
      showToast(res.data.isLocked ? 'Discussion thread locked.' : 'Discussion thread unlocked.');
      fetchThreadDetail(selectedThreadId);
      fetchThreads();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteThread = async () => {
    if (!selectedThreadId || !window.confirm('Are you sure you want to delete this discussion thread?')) return;
    try {
      await api.delete(`/discussions/${selectedThreadId}`);
      showToast('Discussion thread deleted.');
      setSelectedThreadId(null);
      setCurrentThread(null);
      fetchThreads();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!selectedThreadId || !window.confirm('Delete this reply?')) return;
    try {
      await api.delete(`/discussions/replies/${replyId}`);
      fetchThreadDetail(selectedThreadId);
      fetchThreads();
    } catch (err) {
      console.error(err);
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const isStaff = currentUser?.role === UserRole.Lecturer || currentUser?.role === UserRole.ClassRepresentative || currentUser?.role === UserRole.Administrator;
  const isLecturerOrAdmin = currentUser?.role === UserRole.Lecturer || currentUser?.role === UserRole.Administrator;
  const isCourseRep = currentUser?.role === UserRole.ClassRepresentative;

  const getRoleBadge = (roleName?: string) => {
    if (roleName === 'Lecturer' || roleName === '1') {
      return <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Instructor</span>;
    }
    if (roleName === 'ClassRepresentative' || roleName === '2') {
      return <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-teal-500/10 text-teal-600 border border-teal-500/20">Course Rep</span>;
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
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-[#f7f6fb] dark:bg-[#0F172A] relative">

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-large flex items-center gap-2 animate-bounce border border-slate-800">
          <CheckCircle size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner / Class Workspace Selector Info */}
      <div className="px-8 py-4 bg-white dark:bg-[#1E293B] border-b border-[#ece8f3] dark:border-slate-800/80 shrink-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-800 dark:text-white tracking-tight">
              Academic Discussion Board
            </h1>
            <span className="px-2.5 py-0.5 bg-emerald-500/10 dark:bg-emerald-950/50 text-[#1e7a34] dark:text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">
              {activeClass ? activeClass.code : 'All Classes'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            {activeClass 
              ? `Formal academic forum for ${activeClass.name}`
              : 'Showing discussion threads from all your enrolled class workspaces'}
          </p>
        </div>

        {/* Filter Quick-Bar & New Thread Button */}
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800 text-[11px] font-bold">
            <button 
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${filterType === 'all' ? 'bg-white dark:bg-[#1E293B] text-slate-800 dark:text-white shadow-xs font-extrabold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              All
            </button>
            <button 
              onClick={() => setFilterType('pinned')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${filterType === 'pinned' ? 'bg-white dark:bg-[#1E293B] text-emerald-600 dark:text-emerald-400 shadow-xs font-extrabold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              <Pin size={10} /> Pinned
            </button>
            <button 
              onClick={() => setFilterType('unanswered')}
              className={`px-3 py-1.5 rounded-lg transition-all ${filterType === 'unanswered' ? 'bg-white dark:bg-[#1E293B] text-slate-800 dark:text-white shadow-xs font-extrabold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              Unanswered
            </button>
            <button 
              onClick={() => setFilterType('newest')}
              className={`px-3 py-1.5 rounded-lg transition-all ${filterType === 'newest' ? 'bg-white dark:bg-[#1E293B] text-slate-800 dark:text-white shadow-xs font-extrabold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              Newest
            </button>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-[#1e7a34] hover:bg-[#258d3f] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shrink-0 cursor-pointer active:scale-95 transition-all"
          >
            <Plus size={14} />
            <span>New Discussion</span>
          </button>
        </div>
      </div>

      {/* Main Container - 3 Column Layout */}
      <div className="flex-1 flex min-h-0 overflow-hidden p-6 gap-6">

        {/* ─── COLUMN 1: Threads List (Left Pane) ────────────────────────── */}
        <div className="w-full lg:w-80 xl:w-96 flex flex-col bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/80 rounded-[2rem] shadow-soft overflow-hidden shrink-0">
          
          {/* Search & Category Filter Header */}
          <div className="p-4 space-y-3 border-b border-slate-100 dark:border-slate-800/50">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search discussion threads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#fbfbfe] dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-brand-primary/30"
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
                      ? 'bg-[#1e7a34] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Threads List Scroll Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoadingThreads ? (
              <div className="space-y-3 p-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl animate-pulse space-y-2">
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
                    className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-[#f0f7f2] dark:bg-slate-800/80 border-[#3ea556]/40 shadow-xs'
                        : 'bg-white dark:bg-slate-900/20 border-slate-100 dark:border-slate-800/40 hover:border-slate-200 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Header line: Category & Pinned/Locked */}
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-950/50 text-[#1e7a34] dark:text-emerald-300">
                        {thread.category}
                      </span>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        {thread.isPinned && <Pin size={11} className="text-amber-500 fill-amber-500" />}
                        {thread.isLocked && <Lock size={11} className="text-slate-500" />}
                        <span>{new Date(thread.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className={`text-xs font-extrabold leading-snug line-clamp-2 ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                      {thread.title}
                    </h3>

                    {/* Author & Stats Line */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100/60 dark:border-slate-800/30">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full overflow-hidden bg-[#1e7a34] text-white text-[8px] font-bold flex items-center justify-center">
                          {thread.author?.profileImageUrl ? (
                            <img src={thread.author.profileImageUrl} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            thread.author?.avatarText || 'U'
                          )}
                        </div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[110px]">
                          {thread.author?.name || 'User'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[9px] font-bold">
                        <MessageSquare size={10} className="text-slate-400" />
                        <span>{thread.repliesCount}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ─── COLUMN 2: Thread Detail & Conversation (Middle Pane) ───────── */}
        <div className="flex-1 flex flex-col bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/80 rounded-[2rem] shadow-soft overflow-hidden min-w-0">
          
          {isLoadingDetail ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="w-6 h-6 border-2 border-[#1e7a34] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : !currentThread ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#1e7a34]/10 flex items-center justify-center text-[#1e7a34]">
                <MessageSquare size={28} />
              </div>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Select a Discussion Thread</h3>
              <p className="text-xs text-slate-500 max-w-sm">Choose a discussion from the left list or create a new discussion thread for your class.</p>
            </div>
          ) : (
            <>
              {/* Thread Detail Header & Moderation Actions */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800/60 bg-[#fbfbfe]/50 dark:bg-slate-900/30 flex items-start justify-between gap-4 shrink-0">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 dark:bg-emerald-950/50 text-[#1e7a34] dark:text-emerald-300 border border-emerald-500/20">
                      {currentThread.category}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800">
                      {currentThread.classCode || currentThread.className}
                    </span>
                    {currentThread.isPinned && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 flex items-center gap-1">
                        <Pin size={9} /> Pinned Thread
                      </span>
                    )}
                    {currentThread.isLocked && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/10 text-rose-600 flex items-center gap-1">
                        <Lock size={9} /> Locked
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-black text-slate-800 dark:text-white tracking-tight leading-snug">
                    {currentThread.title}
                  </h2>
                </div>

                {/* Moderation Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isStaff && (
                    <button
                      onClick={handleTogglePin}
                      title={currentThread.isPinned ? 'Unpin thread' : 'Pin thread'}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        currentThread.isPinned 
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' 
                          : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <Pin size={14} />
                    </button>
                  )}

                  {/* Course Reps, Lecturers, and Admins can lock group discussions */}
                  {isStaff && (
                    <button
                      onClick={handleToggleLock}
                      title={currentThread.isLocked ? 'Unlock thread' : 'Lock thread'}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        currentThread.isLocked 
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-600' 
                          : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      {currentThread.isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                  )}

                  {/* Delete Thread: Course Reps CANNOT delete a Lecturer's thread */}
                  {(currentThread.author?.id === currentUser?.id || isLecturerOrAdmin || (isCourseRep && currentThread.author?.roleName !== 'Lecturer' && currentThread.author?.role !== 1)) && (
                    <button
                      onClick={handleDeleteThread}
                      title="Delete discussion"
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Thread Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* ORIGINAL POST CARD */}
                <div className="bg-[#fcfbfe] dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1e7a34] text-white text-xs font-bold flex items-center justify-center border border-white shadow-xs">
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
                          Posted on {new Date(currentThread.createdAt).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="text-xs text-slate-700 dark:text-slate-200 font-medium whitespace-pre-wrap leading-relaxed">
                    {currentThread.content}
                  </div>

                  {/* Original Post Attachments */}
                  {currentThread.attachments && currentThread.attachments.length > 0 && (
                    <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/40 space-y-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Attachments ({currentThread.attachments.length})</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {currentThread.attachments.map((att) => (
                          <a
                            key={att.id}
                            href={att.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between gap-2 hover:border-[#3ea556]/40 transition-all text-xs group"
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

                {/* REPLIES SECTION DIVIDER */}
                <div className="flex items-center gap-3 pt-2">
                  <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {currentThread.replies?.length || 0} Replies
                  </span>
                  <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                </div>

                {/* REPLIES CHRONOLOGICAL LIST */}
                <div className="space-y-4">
                  {currentThread.replies?.map((reply) => (
                    <div 
                      key={reply.id} 
                      className="bg-white dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-4 space-y-3 shadow-xs"
                    >
                      {/* Reply Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-[#1e7a34] text-white text-[10px] font-bold flex items-center justify-center">
                            {reply.author?.profileImageUrl ? (
                              <img src={reply.author.profileImageUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              reply.author?.avatarText || 'U'
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-bold text-slate-800 dark:text-white">
                                {reply.author?.name || 'User'}
                              </h5>
                              {getRoleBadge(reply.author?.roleName)}
                              {isStaff && reply.author?.id && reply.author?.roleName !== 'Lecturer' && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedStudentIdForModal(reply.author.id)}
                                  className="text-[9px] font-extrabold px-1.5 py-0.2 bg-emerald-500/10 hover:bg-emerald-500/20 text-[#1e7a34] dark:text-emerald-300 rounded border border-emerald-500/20 transition-all cursor-pointer flex items-center gap-0.5"
                                  title="Inspect Student Profile Details"
                                >
                                  <GraduationCap size={9} /> Profile
                                </button>
                              )}
                            </div>
                            <p className="text-[9px] text-slate-400">
                              {new Date(reply.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        {/* Reply Action Tools */}
                        <div className="flex items-center gap-1 text-slate-400">
                          <button
                            onClick={() => setParentReply(reply)}
                            title="Quote/Reply"
                            className="p-1 hover:text-[#1e7a34] text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <CornerDownRight size={12} />
                            <span>Quote</span>
                          </button>

                          {/* Course Reps CANNOT delete a Lecturer's reply */}
                          {(reply.author?.id === currentUser?.id || isLecturerOrAdmin || (isCourseRep && reply.author?.roleName !== 'Lecturer' && reply.author?.role !== 1)) && (
                            <button
                              onClick={() => handleDeleteReply(reply.id)}
                              title="Delete reply"
                              className="p-1 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Parent Reply Quote Callout */}
                      {reply.parentAuthorName && (
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border-l-2 border-[#1e7a34] rounded-r-xl text-[10px] space-y-0.5">
                          <span className="font-bold text-[#1e7a34]">Replying to {reply.parentAuthorName}:</span>
                          <p className="text-slate-600 dark:text-slate-400 italic line-clamp-2">{reply.parentSnippet}</p>
                        </div>
                      )}

                      {/* Reply Content */}
                      <div className="text-xs text-slate-700 dark:text-slate-200 font-medium whitespace-pre-wrap leading-relaxed">
                        {reply.content}
                      </div>

                      {/* Reply Attachments */}
                      {reply.attachments && reply.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
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
                    </div>
                  ))}
                  <div ref={repliesEndRef} />
                </div>
              </div>

              {/* REPLY FORM / INPUT AREA */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-white dark:bg-[#1E293B] space-y-2 shrink-0">
                
                {currentThread.isLocked && !(isStaff) ? (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                    <Lock size={14} />
                    <span>This discussion has been locked by faculty moderation. Replies are disabled.</span>
                  </div>
                ) : (
                  <form onSubmit={handleCreateReply} className="space-y-2">
                    
                    {currentThread.isLocked && (
                      <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-[#1e7a34] dark:text-emerald-300 rounded-xl text-[10px] font-bold flex items-center justify-between px-3">
                        <span className="flex items-center gap-1.5"><Lock size={12} /> Thread Locked (Faculty & Course Rep Posting Enabled)</span>
                      </div>
                    )}
                    
                    {/* Quoting Banner */}
                    {parentReply && (
                      <div className="flex items-center justify-between px-3 py-1.5 bg-[#f0f7f2] dark:bg-slate-900 border border-[#3ea556]/30 rounded-xl text-xs font-semibold">
                        <span className="text-[#1e7a34] dark:text-emerald-300 text-[10px] font-bold">
                          Replying to <span className="underline">{parentReply.author?.name}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setParentReply(null)}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}

                    {/* Files Preview list */}
                    {replyFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 pb-1">
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

                    <div className="flex items-end gap-2">
                      <div className="flex-1 relative">
                        <textarea
                          rows={2}
                          placeholder="Type your academic reply..."
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          className="w-full px-4 py-2.5 bg-[#fbfbfe] dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-brand-primary/30 resize-none"
                        />
                      </div>

                      {/* Attach Button */}
                      <button
                        type="button"
                        onClick={() => replyFileInputRef.current?.click()}
                        className="p-3 bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl border border-slate-200 dark:border-slate-800 transition-all cursor-pointer shrink-0"
                        title="Attach files (PDF, Word, Images)"
                      >
                        <Paperclip size={16} />
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

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={isSubmittingReply || !replyContent.trim()}
                        className="px-5 py-3 bg-[#1e7a34] hover:bg-[#258d3f] disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all shrink-0"
                      >
                        <Send size={14} />
                        <span>Reply</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </div>

        {/* ─── COLUMN 3: Author & Class Info Card (Right Pane) ───────────── */}
        <div className="hidden xl:flex w-72 flex-col bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/80 rounded-[2rem] shadow-soft p-5 space-y-6 overflow-y-auto shrink-0">
          {currentThread?.author ? (
            <>
              {/* Selected Author Contact Card */}
              <div className="text-center space-y-3 pb-5 border-b border-slate-100 dark:border-slate-800/50">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-[#1e7a34] to-[#3ea556] text-white text-2xl font-black flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-md mx-auto select-none">
                  {currentThread.author.profileImageUrl ? (
                    <img src={currentThread.author.profileImageUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    currentThread.author.avatarText
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">
                    {currentThread.author.name}
                  </h3>
                  <div className="mt-1 flex justify-center">
                    {getRoleBadge(currentThread.author.roleName)}
                  </div>
                  {(currentUser?.role === UserRole.Lecturer || currentUser?.role === UserRole.Administrator) && currentThread.author.id && currentThread.author.roleName !== 'Lecturer' && (
                    <button
                      onClick={() => setSelectedStudentIdForModal(currentThread.author.id!)}
                      className="mt-3 w-full py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-[#1e7a34] dark:text-emerald-300 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-emerald-500/20 shadow-xs"
                    >
                      <GraduationCap size={13} /> View Student Profile
                    </button>
                  )}
                  {(currentUser?.role === UserRole.Lecturer || currentUser?.role === UserRole.Administrator) && (
                    <button
                      onClick={() => setIsRosterOpen(true)}
                      className="mt-2 w-full py-2 px-3 bg-slate-100 dark:bg-slate-900 hover:bg-slate-800 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-white rounded-xl text-[10px] font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-800"
                    >
                      <Users size={13} /> Enrolled Students Directory
                    </button>
                  )}
                </div>
              </div>

              {/* Class Info Box */}
              <div className="space-y-3">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Class Context</span>
                <div className="p-3.5 bg-[#f0f7f2] dark:bg-slate-900/50 border border-[#3ea556]/20 rounded-2xl space-y-1">
                  <h4 className="text-xs font-black text-slate-800 dark:text-white">{currentThread.className}</h4>
                  <p className="text-[10px] font-extrabold text-[#1e7a34] dark:text-emerald-300">{currentThread.classCode}</p>
                </div>
              </div>

              {/* Quick Academic Guidelines */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Forum Rules</span>
                <ul className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold space-y-2 pl-3 list-disc">
                  <li>Keep discussions respectful and academic.</li>
                  <li>Tag topics accurately with categories.</li>
                  <li>Do not post solutions to graded quizzes.</li>
                  <li>Lecturers may pin or lock important threads.</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="text-center py-12 space-y-2 text-slate-400">
              <BookOpen size={24} className="mx-auto" />
              <p className="text-xs font-bold">Class Forum Hub</p>
              <p className="text-[10px]">Select a thread to view discussion details & author information.</p>
            </div>
          )}
        </div>

      </div>

      {/* ─── CREATE THREAD MODAL ────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-6 w-full max-w-xl shadow-large space-y-5">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Start New Academic Discussion</h3>
                <p className="text-[11px] text-slate-400 font-medium">Post a thread to {activeClass?.name || 'your class workspace'}</p>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg"
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
                  className="w-full px-4 py-2.5 bg-[#fbfbfe] dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-primary/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#fbfbfe] dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-brand-primary/30 cursor-pointer"
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
                  className="w-full px-4 py-2.5 bg-[#fbfbfe] dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-primary/30 resize-none"
                />
              </div>

              {/* Attachments Upload */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Attachments (PDF, Images, Word)</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-[#3ea556] rounded-2xl text-center cursor-pointer transition-colors space-y-1 bg-slate-50/50 dark:bg-slate-900/20"
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
        classWorkspaceId={activeClass?.id || currentThread?.classWorkspaceId || null}
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
