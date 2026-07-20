import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../components/layout/ThemeProvider';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAnnouncements, useCreateAnnouncement, useDeleteAnnouncement } from '../hooks/useAnnouncements';
import { useAssignments, useCreateAssignment, useDeleteAssignment } from '../hooks/useAssignments';
import { useCreateSchedule, useSchedules, useDeleteSchedule } from '../hooks/useSchedules';
import { useQuizzes, useCreateQuiz, useDeleteQuiz } from '../hooks/useQuizzes';
import { useResources, useDeleteResource } from '../hooks/useResources';
import { UserRole } from '../types';
import api from '../lib/axios';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Clock, 
  BookOpen, 
  CheckCircle, 
  FileText, 
  Search, 
  Zap, 
  Megaphone, 
  Users, 
  Calendar, 
  Beaker,
  FolderOpen,
  ArrowLeft,
  ChevronRight,
  Trash2
} from 'lucide-react';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { classes, activeClass, setActiveClass, refreshClasses } = useWorkspace();
  const queryClient = useQueryClient();

  const getDynamicGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // State
  const [joinCode, setJoinCode] = useState('');
  const [showJoinToast, setShowJoinToast] = useState(false);
  const [joinClassError, setJoinClassError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Scoped Data Queries
  const { data: announcements = [] } = useAnnouncements(activeClass?.id);
  const { data: assignments = [] } = useAssignments(activeClass?.id);
  const { data: quizzes = [] } = useQuizzes(activeClass?.id);
  const { data: resources = [] } = useResources(activeClass?.id);
  const { data: schedules = [] } = useSchedules(activeClass?.id);

  // Student specific panel state
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  const activeAnnouncement = announcements.find(a => a.id === selectedStudentId) || null;

  // Lecturer specific state
  const [lecturerTab, setLecturerTab] = useState<'courses' | 'approvals'>('courses');
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'announcements' | 'assignments' | 'quizzes' | 'resources' | 'students' | 'meetings'>('announcements');
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // Creation forms within Lecturer Class Workspace
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newAsgTitle, setNewAsgTitle] = useState('');
  const [newAsgDue, setNewAsgDue] = useState('');
  const [newAsgDesc, setNewAsgDesc] = useState('');
  const [newAsgFile, setNewAsgFile] = useState<File | null>(null);
  const [isUploadingAsg, setIsUploadingAsg] = useState(false);
  const [asgErrorMsg, setAsgErrorMsg] = useState('');
  const [assignmentMode, setAssignmentMode] = useState<'typed' | 'file'>('typed');
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizDate, setNewQuizDate] = useState('');
  const [newQuizPoints, setNewQuizPoints] = useState(10);
  const [newSchedTitle, setNewSchedTitle] = useState('');
  const [newSchedTime, setNewSchedTime] = useState('');

  // Learning Resources tab upload states
  const [newResTitle, setNewResTitle] = useState('');
  const [newResCategory, setNewResCategory] = useState('Document');
  const [newResFile, setNewResFile] = useState<File | null>(null);
  const [isUploadingRes, setIsUploadingRes] = useState(false);
  const [annTarget, setAnnTarget] = useState<'class' | 'global'>('class');
  const [quizTarget, setQuizTarget] = useState<'class' | 'global'>('class');
  const [resTarget, setResTarget] = useState<'class' | 'global'>('class');
  const [resErrorMsg, setResErrorMsg] = useState('');

  // Class enrollment roster state
  const [classMembers, setClassMembers] = useState<{ lecturer: any; students: any[] }>({ lecturer: null, students: [] });
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState('');

  const createAnnMutation = useCreateAnnouncement();
  const createAsgMutation = useCreateAssignment();
  const createQuizMutation = useCreateQuiz();
  const createSchedMutation = useCreateSchedule();

  const deleteAnnMutation = useDeleteAnnouncement();
  const deleteAsgMutation = useDeleteAssignment();
  const deleteQuizMutation = useDeleteQuiz();
  const deleteSchedMutation = useDeleteSchedule();
  const deleteResMutation = useDeleteResource();

  // Mock proposals for lecturers (for demonstration UI compatibility)
  const repNotices = [
    { id: '1', title: 'Liaison Committee Meeting with Dean', rep: 'Tricia McMillan', status: 'Pending' },
    { id: '2', title: 'Proposed Study Group: Algorithms', rep: 'Arthur Dent', status: 'Pending' }
  ];

  const fetchClassMembers = async (classId: string) => {
    setIsLoadingMembers(true);
    setMembersError('');
    try {
      const response = await api.get(`/classworkspaces/${classId}/members`);
      setClassMembers(response.data);
    } catch (err) {
      console.error(err);
      setMembersError('Failed to load class enrollment list.');
    } finally {
      setIsLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (activeClass && activeWorkspaceTab === 'students') {
      fetchClassMembers(activeClass.id);
    }
  }, [activeClass?.id, activeWorkspaceTab]);

  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setJoinClassError('Please enter a class code before you can proceed.');
      return;
    }
    setJoinClassError('');
    try {
      await api.post('/classworkspaces/join', { code: joinCode });
      setShowJoinToast(true);
      setJoinCode('');
      await refreshClasses();
      queryClient.invalidateQueries();
      setTimeout(() => {
        setShowJoinToast(false);
      }, 3000);
    } catch (err: any) {
      setJoinClassError(err.response?.data?.message || 'Invalid code or already joined.');
    }
  };

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnContent.trim()) return;
    try {
      const isGlobal = user?.role === UserRole.ClassRepresentative ? false : annTarget === 'global';
      await createAnnMutation.mutateAsync({
        title: newAnnTitle,
        content: newAnnContent,
        classWorkspaceId: isGlobal ? undefined : activeClass?.id,
        isGlobal: isGlobal
      });
      setNewAnnTitle('');
      setNewAnnContent('');
      setSuccessMsg('Success: Announcement posted successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsgTitle.trim() || !newAsgDue || !activeClass) return;
    setAsgErrorMsg('');
    setIsUploadingAsg(true);

    try {
      let attachmentUrl = '';
      let attachmentFileName = '';
      let attachmentFileSize = 0;
      if (assignmentMode === 'file') {
        if (!newAsgFile) {
          setAsgErrorMsg('Please select a file to upload for this assignment.');
          setIsUploadingAsg(false);
          return;
        }
        const formData = new FormData();
        formData.append('file', newAsgFile);

        const uploadRes = await api.post('/storage/upload-attachment', formData);
        attachmentUrl = uploadRes.data.fileUrl || '';
        attachmentFileName = uploadRes.data.fileName || '';
        attachmentFileSize = uploadRes.data.fileSize || 0;
      }

      await createAsgMutation.mutateAsync({
        title: newAsgTitle,
        description: assignmentMode === 'typed' 
          ? newAsgDesc || 'No written description provided.'
          : 'Please download and review the guidelines inside the attached document for this assignment.',
        instructions: assignmentMode === 'typed'
          ? newAsgDesc || 'No written instructions provided.'
          : 'Please download and review the guidelines inside the attached document for this assignment.',
        dueDate: newAsgDue,
        classWorkspaceId: activeClass.id,
        maxPoints: 100,
        allowLateSubmission: true,
        attachmentUrl: assignmentMode === 'file' ? (attachmentUrl || undefined) : undefined,
        attachmentFileName: assignmentMode === 'file' ? (attachmentFileName || undefined) : undefined,
        attachmentFileSize: assignmentMode === 'file' ? (attachmentFileSize || undefined) : undefined
      });

      setNewAsgTitle('');
      setNewAsgDue('');
      setNewAsgDesc('');
      setNewAsgFile(null);
      setSuccessMsg('Success: Assignment posted successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error(err);
      setAsgErrorMsg(err.response?.data?.message || 'Failed to post assignment.');
    } finally {
      setIsUploadingAsg(false);
    }
  };

  const handleAddQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuizTitle.trim() || !newQuizDate) return;
    try {
      const isGlobal = quizTarget === 'global';
      await createQuizMutation.mutateAsync({
        title: newQuizTitle,
        date: newQuizDate,
        points: Number(newQuizPoints),
        questionsCount: 5,
        classWorkspaceId: isGlobal ? '00000000-0000-0000-0000-000000000000' : (activeClass?.id || '')
      });
      setNewQuizTitle('');
      setNewQuizDate('');
      setSuccessMsg('Success: Academic Quiz Scheduled!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchedTitle.trim() || !newSchedTime || !activeClass) return;
    try {
      await createSchedMutation.mutateAsync({
        title: newSchedTitle,
        startTime: newSchedTime,
        endTime: newSchedTime,
        classWorkspaceId: activeClass.id,
        isRecurring: false
      });
      setNewSchedTitle('');
      setNewSchedTime('');
      setSuccessMsg('Success: Class session scheduled successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResFile) return;
    setIsUploadingRes(true);
    setResErrorMsg('');

    try {
      const isGlobal = user?.role === UserRole.ClassRepresentative ? false : resTarget === 'global';
      const formData = new FormData();
      formData.append('file', newResFile);
      formData.append('title', newResTitle || newResFile.name.substring(0, newResFile.name.lastIndexOf('.')) || newResFile.name);
      formData.append('description', isGlobal ? 'Uploaded globally to University Hub.' : 'Uploaded via SANS class resources tab.');
      formData.append('category', newResCategory);
      if (isGlobal) {
        formData.append('isGlobal', 'true');
      } else if (activeClass) {
        formData.append('classWorkspaceIds', activeClass.id);
      }

      await api.post('/resources/upload', formData);
      setNewResTitle('');
      setNewResFile(null);
      setSuccessMsg('Success: Learning resource uploaded!');
      setTimeout(() => setSuccessMsg(''), 3000);
      if (activeClass) {
        queryClient.invalidateQueries({ queryKey: ['resources', activeClass.id] });
      }
    } catch (err: any) {
      console.error(err);
      setResErrorMsg(err.response?.data?.message || 'Failed to upload resource.');
    } finally {
      setIsUploadingRes(false);
    }
  };

  const handleSelectClass = (cls: any) => {
    setSelectedClassId(cls.id);
    setActiveClass(cls);
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    try {
      await deleteAnnMutation.mutateAsync(id);
      setSuccessMsg("Announcement deleted successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this assignment?")) return;
    try {
      await deleteAsgMutation.mutateAsync(id);
      setSuccessMsg("Assignment deleted successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this quiz?")) return;
    try {
      await deleteQuizMutation.mutateAsync(id);
      setSuccessMsg("Quiz deleted successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this learning resource?")) return;
    try {
      await deleteResMutation.mutateAsync(id);
      setSuccessMsg("Learning resource deleted successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!window.confirm("Are you sure you want to cancel this class session?")) return;
    try {
      await deleteSchedMutation.mutateAsync(id);
      setSuccessMsg("Scheduled session deleted successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  // ==========================================
  // RENDER STUDENT — Forest Green Theme
  // ==========================================
  const renderStudent = () => {
    const isHub = !activeClass;

    return (
      <div className={`flex h-[calc(100vh-64px)] overflow-hidden bg-[#f7f6fb] dark:bg-[#0F172A] ${theme === 'dark' ? 'dark' : ''}`}>
        
        {/* Panel 1: Announcements Bulletins List */}
        <aside className="w-72 bg-white dark:bg-[#1E293B] border-r border-[#ece8f3] dark:border-slate-800/40 p-5 flex flex-col shrink-0 h-full overflow-y-auto">
          <div className="mb-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-[#1e7a34]/10 flex items-center justify-center text-[#1e7a34]">
                <Megaphone size={12} />
              </div>
              <h2 className="font-extrabold text-slate-850 dark:text-[#F8FAFC] text-sm">
                {isHub ? 'University News' : 'Class Announcements'}
              </h2>
            </div>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search notices..." 
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/40 text-xs rounded-xl focus:outline-none focus:border-[#1e7a34] font-semibold"
              />
              <Search size={12} className="absolute right-3.5 top-3 text-slate-400" />
            </div>
          </div>

          <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
            {announcements.length === 0 ? (
              <p className="text-[11px] text-slate-400 dark:text-[#94A3B8] font-bold text-center py-4">No announcements available.</p>
            ) : (
              announcements
                .filter(a => isHub ? !a.classWorkspaceId : true)
                .filter(a => a.title.toLowerCase().includes(studentSearch.toLowerCase()) || a.content.toLowerCase().includes(studentSearch.toLowerCase()))
                .map(item => {
                  const isActive = item.id === selectedStudentId;
                  return (
                    <div 
                      key={item.id}
                      onClick={() => setSelectedStudentId(item.id)}
                      className={`py-3 px-3 border-l-4 cursor-pointer transition-all duration-200 flex items-center gap-3 rounded-r-xl ${
                        isActive
                          ? 'border-[#1e7a34] bg-[#f0f7f2] dark:bg-[#1e7a34]/10 shadow-sm'
                          : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-900/40'
                      }`}
                    >
                      {/* Left icon wrapper */}
                      <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center ${
                        isActive
                          ? 'bg-[#1e7a34]/20 text-[#1e7a34]'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}>
                        <Megaphone size={11} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <h4 className={`text-[11px] font-bold truncate ${
                            isActive ? 'text-[#1e7a34] dark:text-emerald-400 font-extrabold' : 'text-slate-700 dark:text-slate-200'
                          }`}>
                            {item.title}
                          </h4>
                          <span className="text-[8px] font-extrabold text-slate-400 shrink-0">
                            {new Date(item.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-405 dark:text-slate-450 truncate mt-0.5 font-medium leading-normal">
                          {item.content}
                        </p>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </aside>

        {/* Panel 2: Active Bulletin Details / Overview Content */}
        <section className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#1E293B] overflow-hidden">
          {activeAnnouncement ? (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800/40 flex items-center justify-between shrink-0 bg-white dark:bg-[#1E293B]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#1e7a34] to-[#3ea556] text-white flex items-center justify-center font-black text-xs shadow-sm">
                    {activeAnnouncement.createdBy?.[0]?.toUpperCase() || 'S'}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-xs">{activeAnnouncement.title}</h3>
                    <p className="text-[9px] font-bold text-slate-405 dark:text-[#94A3B8] uppercase">Posted by {activeAnnouncement.createdBy} • {new Date(activeAnnouncement.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStudentId('')}
                  className="px-3.5 py-1.5 border border-slate-150 dark:border-slate-800 text-[10px] hover:bg-slate-50 dark:hover:bg-slate-900 font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer text-slate-500 dark:text-slate-350"
                >
                  <ArrowLeft size={12} /> Back to Overview
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 bg-slate-50/20 dark:bg-slate-900/10 space-y-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 rounded-2xl p-6 space-y-4 shadow-sm">
                  <p className="text-xs text-slate-700 dark:text-[#CBD5E1] font-semibold leading-relaxed whitespace-pre-line">{activeAnnouncement.content}</p>
                  {activeAnnouncement.tags && (
                    <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-50 dark:border-slate-850">
                      {activeAnnouncement.tags.split(',').map((tag: string, i: number) => (
                        <span key={i} className="text-[9px] font-bold text-[#1e7a34] bg-[#f0f7f2] dark:bg-[#1e7a34]/10 px-2.5 py-0.5 rounded-full">
                          #{tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : isHub ? (
            // =================================================================
            // UNIVERSITY HUB SUMMARY DASHBOARD (FEATURE 10)
            // =================================================================
            <div className="flex-1 overflow-y-auto p-8 space-y-6 flex flex-col bg-slate-50/20 dark:bg-slate-900/10">
              {/* Welcome Banner */}
              <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/5 dark:from-emerald-500/5 dark:to-transparent border border-emerald-500/20 rounded-3xl p-6">
                <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">{getDynamicGreeting()}, {user?.firstName}!</h2>
                <p className="text-xs text-slate-500 dark:text-slate-350 font-medium mt-1 leading-relaxed">Welcome to the SANS University Hub. Central academic portal and notification manager.</p>
              </div>

              {/* Summary Dashboard Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Latest University Notice */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
                  <div>
                    <span className="text-[8px] font-extrabold text-[#1e7a34] bg-[#f0f7f2] dark:bg-[#1e7a34]/10 px-2 py-0.5 rounded uppercase">📢 Global News</span>
                    <h3 className="text-xs font-black text-slate-800 dark:text-white mt-2.5 line-clamp-1">
                      {announcements.filter(a => a.isGlobal || !a.classWorkspaceId)[0]?.title || 'No university notices'}
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 font-semibold leading-normal">
                      {announcements.filter(a => a.isGlobal || !a.classWorkspaceId)[0]?.content || 'All quiet at the university level. Check back later.'}
                    </p>
                  </div>
                  {announcements.filter(a => a.isGlobal || !a.classWorkspaceId)[0] && (
                    <button
                      onClick={() => setSelectedStudentId(announcements.filter(a => a.isGlobal || !a.classWorkspaceId)[0].id)}
                      className="text-[9px] font-bold text-[#1e7a34] hover:underline text-left mt-2 flex items-center gap-0.5 cursor-pointer"
                    >
                      Read Notice <ChevronRight size={10} />
                    </button>
                  )}
                </div>

                {/* Latest Class Announcement */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
                  <div>
                    <span className="text-[8px] font-extrabold text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded uppercase">💬 Class Bulletin</span>
                    <h3 className="text-xs font-black text-slate-800 dark:text-white mt-2.5 line-clamp-1">
                      {announcements.filter(a => a.classWorkspaceId)[0]?.title || 'No class announcements'}
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 font-semibold leading-normal">
                      {announcements.filter(a => a.classWorkspaceId)[0]?.content || 'Select a class workspace to review specific course announcement boards.'}
                    </p>
                  </div>
                  {announcements.filter(a => a.classWorkspaceId)[0] && (
                    <button
                      onClick={() => {
                        const target = announcements.filter(a => a.classWorkspaceId)[0];
                        const cls = classes.find(c => c.id === target.classWorkspaceId);
                        if (cls) setActiveClass(cls);
                        navigate('/announcements');
                      }}
                      className="text-[9px] font-bold text-purple-600 hover:underline text-left mt-2 flex items-center gap-0.5 cursor-pointer"
                    >
                      Go to Bulletins <ChevronRight size={10} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // =================================================================
            // CLASS WORKSPACE OVERVIEW DASHBOARD (FEATURE 11)
            // =================================================================
            <div className="flex-1 overflow-y-auto p-8 space-y-6 flex flex-col bg-[#f0f7f2]/10 dark:bg-[#0F172A]">
              {/* Workspace Header Banner */}
              <div className="bg-gradient-to-r from-[#1e7a34]/15 to-[#3ea556]/5 dark:from-[#1e7a34]/10 dark:to-transparent border border-[#1e7a34]/25 rounded-3xl p-6">
                <span className="text-[8px] font-extrabold bg-[#1e7a34] text-white px-2.5 py-0.5 rounded uppercase tracking-wider shadow-sm">
                  {activeClass.code} Class Dashboard
                </span>
                <h2 className="text-base font-black text-slate-805 dark:text-white mt-3 leading-tight">{activeClass.name} Workspace</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">Lecturer: {activeClass.lecturerName || 'Unassigned'}</p>
              </div>

              {/* Class overview layout columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Column 1 & 2: Overview Cards */}
                <div className="md:col-span-2 space-y-4">
                  {/* Latest Announcement */}
                  <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800/40 rounded-2xl p-5 shadow-sm space-y-2">
                    <span className="text-[8px] font-extrabold text-[#1e7a34] bg-[#f0f7f2] dark:bg-[#1e7a34]/15 px-2 py-0.5 rounded uppercase">📢 Latest Bulletin Notice</span>
                    {announcements.length > 0 ? (
                      <>
                        <h4 className="text-xs font-black text-slate-800 dark:text-white pt-1">{announcements[0].title}</h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-semibold">{announcements[0].content}</p>
                        <button
                          onClick={() => setSelectedStudentId(announcements[0].id)}
                          className="text-[9px] font-bold text-[#1e7a34] hover:underline flex items-center gap-0.5 mt-2 cursor-pointer"
                        >
                          Read Bulletin Details <ChevronRight size={10} />
                        </button>
                      </>
                    ) : (
                      <p className="text-[10px] text-slate-400 font-semibold py-4">No bulletins have been posted for this course.</p>
                    )}
                  </div>

                  {/* Upcoming Academic Tasks */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Assignment card */}
                    <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800/40 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                      <div>
                        <span className="text-[8px] font-extrabold text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded uppercase">📝 Assignment</span>
                        {assignments.length > 0 ? (
                          <div className="mt-3">
                            <h4 className="text-[11px] font-black text-slate-800 dark:text-white truncate">{assignments[0].title}</h4>
                            <p className="text-[9px] text-purple-600 font-bold mt-1">Due: {new Date(assignments[0].dueDate).toLocaleDateString()}</p>
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 font-semibold py-3">No assignments due</p>
                        )}
                      </div>
                      {assignments.length > 0 && (
                        <button onClick={() => navigate('/assignments')} className="text-[9px] font-bold text-purple-600 hover:underline text-left mt-3 flex items-center gap-0.5 cursor-pointer">
                          Submit Deliverable <ChevronRight size={9} />
                        </button>
                      )}
                    </div>

                    {/* Quiz card */}
                    <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800/40 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                      <div>
                        <span className="text-[8px] font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded uppercase">🧪 Quiz Assessment</span>
                        {quizzes.length > 0 ? (
                          <div className="mt-3">
                            <h4 className="text-[11px] font-black text-slate-800 dark:text-white truncate">{quizzes[0].title}</h4>
                            <p className="text-[9px] text-emerald-600 font-bold mt-1">{quizzes[0].points} points • {new Date(quizzes[0].date).toLocaleDateString()}</p>
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 font-semibold py-3">No quizzes scheduled</p>
                        )}
                      </div>
                      {quizzes.length > 0 && (
                        <button onClick={() => navigate('/quizzes')} className="text-[9px] font-bold text-emerald-600 hover:underline text-left mt-3 flex items-center gap-0.5 cursor-pointer">
                          Open Assessments <ChevronRight size={9} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Recent Resource card */}
                  <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800/40 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center text-teal-600 shrink-0">
                        <FolderOpen size={16} />
                      </div>
                      <div>
                        <span className="text-[8px] font-extrabold text-teal-600 uppercase tracking-widest block">Latest Learning Slide</span>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-xs mt-0.5">
                          {resources.length > 0 ? resources[0].title : 'No reference materials uploaded'}
                        </h4>
                      </div>
                    </div>
                    {resources.length > 0 && (
                      <button onClick={() => navigate('/resources')} className="text-[9px] font-bold text-teal-600 hover:underline flex items-center gap-0.5 cursor-pointer shrink-0">
                        Browse <ChevronRight size={9} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Column 3: Timetable & Actions */}
                <div className="space-y-4">
                  {/* Today's Timetable */}
                  <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800/40 rounded-2xl p-5 shadow-sm space-y-3">
                    <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block">Today's Class Timetable</span>
                    <div className="space-y-2">
                      {schedules.length === 0 ? (
                        <p className="text-[10px] text-slate-400 font-semibold py-4 text-center">No scheduled sync sessions today.</p>
                      ) : (
                        schedules.slice(0, 2).map(item => (
                          <div key={item.id} className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-xl space-y-0.5">
                            <h5 className="text-[11px] font-black text-slate-800 dark:text-white truncate">{item.title}</h5>
                            <p className="text-[9px] text-[#1e7a34] font-bold">
                              {new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {item.room && ` • Room: ${item.room}`}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                    {schedules.length > 0 && (
                      <button onClick={() => navigate('/schedule')} className="w-full text-center text-[9px] font-bold text-[#1e7a34] hover:underline flex items-center justify-center gap-0.5 cursor-pointer">
                        Full Course Timetable <ChevronRight size={10} />
                      </button>
                    )}
                  </div>

                  {/* Quick Action Panels (LMS role specific) */}
                  <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800/40 rounded-2xl p-5 shadow-sm space-y-2.5">
                    <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block">LMS Quick Actions</span>
                    {user?.role === UserRole.ClassRepresentative ? (
                      <div className="flex flex-col gap-2">
                        <button onClick={() => navigate('/announcements')} className="w-full py-2 bg-[#1e7a34] hover:bg-[#258d3f] text-white text-[10px] font-bold rounded-xl transition-all shadow-sm cursor-pointer text-center">
                          Post Liaison Notice
                        </button>
                        <button onClick={() => navigate('/schedule')} className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold rounded-xl transition-all cursor-pointer text-center">
                          Modify Schedule Slots
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <button onClick={() => navigate('/assignments')} className="w-full py-2 bg-[#1e7a34] hover:bg-[#258d3f] text-white text-[10px] font-bold rounded-xl transition-all shadow-sm cursor-pointer text-center">
                          Submit Deliverable
                        </button>
                        <button onClick={() => navigate('/resources')} className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold rounded-xl transition-all cursor-pointer text-center">
                          Download Materials
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </section>

        {/* Panel 3: Student Class Workspace Widgets / Enrolled Portfolio */}
        <aside className="w-80 bg-white dark:bg-[#1E293B] border-l border-[#ece8f3] dark:border-slate-800/40 p-5 flex flex-col gap-6 shrink-0 h-full overflow-y-auto">
          {/* Welcome Profile Widget */}
          <div className="flex flex-col items-center text-center bg-gradient-to-b from-[#f0f7f2] to-white dark:from-slate-900/40 dark:to-slate-950/40 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/40">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1e7a34] to-[#3ea556] flex items-center justify-center text-white text-xl font-black border-4 border-white dark:border-slate-900 shadow-md">
              {user?.firstName?.[0] || 'S'}{user?.lastName?.[0] || 'D'}
            </div>
            <h3 className="text-xs font-black text-slate-800 dark:text-[#F8FAFC] mt-3">{user?.firstName} {user?.lastName}</h3>
            <p className="text-[9px] text-[#1e7a34] dark:text-[#3ea556] font-bold uppercase tracking-wider mt-0.5">
              {user?.role === UserRole.ClassRepresentative ? 'Class Representative' : 'Enrolled Student'}
            </p>
          </div>

          {/* University Hub Summary Stats — only on hub */}
          {isHub && (
            <div className="grid grid-cols-2 gap-2 shrink-0">
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 rounded-2xl p-3 text-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">My Classes</span>
                <span className="text-xl font-black text-[#1e7a34] block mt-0.5">{classes.length}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 rounded-2xl p-3 text-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Notices</span>
                <span className="text-xl font-black text-slate-800 dark:text-white block mt-0.5">{announcements.length}</span>
              </div>
            </div>
          )}

          {/* LEVEL 1: Render Classes Portfolio & Quick Join */}
          {isHub ? (
            <>
              {/* Classes Portfolio List */}
              <div className="space-y-3 shrink-0">
                <h4 className="text-[10px] font-bold text-[#1e7a34]/60 uppercase tracking-widest px-1">My Class Portfolios</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {classes.length === 0 ? (
                    <p className="text-[9px] text-slate-400 dark:text-[#94A3B8] font-bold text-center py-4 bg-slate-50/50 dark:bg-slate-900/10 border border-slate-100 dark:border-slate-800/40 rounded-2xl">No enrolled classes.</p>
                  ) : (
                    classes.map(item => (
                      <div 
                        key={item.id}
                        onClick={() => {
                          setActiveClass(item);
                        }}
                        className="p-3 bg-slate-50/50 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800/40 rounded-xl cursor-pointer hover:border-[#1e7a34] hover:bg-[#f0f7f2] dark:hover:bg-slate-800/60 transition-all hover:scale-[1.01]"
                      >
                        <p className="text-xs font-black text-slate-800 dark:text-[#CBD5E1] truncate">{item.name}</p>
                        <p className="text-[9px] text-slate-405 font-bold uppercase tracking-wider mt-0.5">{item.code} • {item.lecturerName}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Quick Join Class */}
              <div className="bg-[#f0f7f2] dark:bg-slate-900/60 border border-[#d6eedd] dark:border-slate-800/40 rounded-2xl p-4 shrink-0">
                <h4 className="text-[10px] font-bold text-[#1e7a34]/60 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Zap size={12} className="text-[#1e7a34]" />
                  <span>Quick Join Class</span>
                </h4>
                <form onSubmit={handleJoinClass} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Enter Class Code"
                    value={joinCode}
                    onChange={(e) => {
                      setJoinCode(e.target.value);
                      if (joinClassError) setJoinClassError('');
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-[#d6eedd] dark:border-slate-800/40 text-xs rounded-xl focus:outline-none focus:border-[#1e7a34] font-semibold text-center uppercase"
                  />
                  {joinClassError && (
                    <p className="text-[10px] font-bold text-red-500 text-center select-none animate-pulse">
                      {joinClassError}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#1e7a34] text-white hover:bg-[#258d3f] rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    Join Course
                  </button>
                </form>
              </div>
            </>
          ) : (
            // LEVEL 2: Render Class Info details
            <div className="bg-[#f0f7f2] dark:bg-slate-900/60 border border-[#d6eedd] dark:border-slate-800/40 rounded-2xl p-4 shrink-0 space-y-2.5 text-slate-700 dark:text-[#CBD5E1]">
              <h4 className="text-[10px] font-bold text-[#1e7a34] uppercase tracking-widest border-b border-[#d6eedd] pb-1.5 mb-1.5">Class Workspace</h4>
              <p className="text-xs font-extrabold text-slate-850 dark:text-white leading-tight">{activeClass.name}</p>
              <div className="text-[10px] space-y-1.5 pt-1 font-semibold">
                <p><span className="text-slate-400">Class Code:</span> {activeClass.code}</p>
                <p><span className="text-slate-400">Lecturer:</span> {activeClass.lecturerName}</p>
                <p><span className="text-slate-400">Students:</span> {activeClass.studentsCount || 0} enrolled</p>
              </div>
            </div>
          )}

          {/* Deadlines & Quizzes — Class workspace only, not on University Hub */}
          {!isHub && (
            <>
              {/* Upcoming Deadlines */}
              <div className="space-y-3 shrink-0">
                <h4 className="text-[10px] font-bold text-[#1e7a34]/60 uppercase tracking-widest px-1">Upcoming Deadlines</h4>
                <div className="space-y-2">
                  {assignments.length === 0 ? (
                    <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] font-bold text-center py-2 bg-slate-50/50 dark:bg-slate-900/10 border border-slate-100 dark:border-slate-800/40 rounded-2xl">No upcoming deadlines.</p>
                  ) : (
                    assignments.map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => navigate('/assignments')}
                        className="flex items-center gap-3 p-3 bg-[#f0f7f2] dark:bg-slate-900/40 border border-[#d6eedd] dark:border-slate-800/40 rounded-2xl cursor-pointer hover:border-[#1e7a34]/50 transition-all hover:scale-[1.01]"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#1e7a34]/10 flex items-center justify-center text-[#1e7a34] shrink-0"><Clock size={14} /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-850 dark:text-[#CBD5E1] truncate">{item.title}</p>
                          <p className="text-[9px] text-[#1e7a34]/60 font-semibold">{new Date(item.dueDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Upcoming Quizzes */}
              <div className="space-y-3 shrink-0">
                <h4 className="text-[10px] font-bold text-[#1e7a34]/60 uppercase tracking-widest px-1">Upcoming Quizzes</h4>
                <div className="space-y-2">
                  {quizzes.length === 0 ? (
                    <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] font-bold text-center py-2 bg-slate-50/50 dark:bg-slate-900/10 border border-slate-100 dark:border-slate-800/40 rounded-2xl">No upcoming quizzes.</p>
                  ) : (
                    quizzes.map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => navigate('/quizzes')}
                        className="flex items-center gap-3 p-3 bg-[#f0f7f2] dark:bg-slate-900/40 border border-[#d6eedd] dark:border-slate-800/40 rounded-2xl cursor-pointer hover:border-[#1e7a34]/50 transition-all hover:scale-[1.01]"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#1e7a34]/10 flex items-center justify-center text-[#1e7a34] shrink-0"><Beaker size={14} /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-850 dark:text-[#CBD5E1] truncate">{item.title}</p>
                          <p className="text-[9px] text-[#1e7a34]/60 font-semibold">{new Date(item.date).toLocaleDateString()} • {item.points} pts</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {showJoinToast && (
            <div className="fixed bottom-6 right-6 bg-[#1e7a34] text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-large flex items-center gap-2 z-100">
              <CheckCircle size={14} className="text-white" />
              <span>Success: Joined class catalog!</span>
            </div>
          )}
        </aside>
      </div>
    );
  };

  // ==========================================
  // RENDER COURSE REPRESENTATIVE — Teal/Cyan Theme
  // ==========================================
  const renderRep = () => renderStudent();

  // ==========================================
  // RENDER LECTURER — Dedicated Class workspaces console
  // ==========================================
  const renderLecturer = () => {
    const isHub = !activeClass;

    return (
      <div className={`flex h-[calc(100vh-64px)] overflow-hidden bg-[#f7f6fb] dark:bg-[#0F172A] ${theme === 'dark' ? 'dark' : ''}`}>
        
        {/* Panel 1: Faculty Console Sidebar */}
        <aside className="w-72 bg-white dark:bg-[#1E293B] border-r border-[#ece8f3] dark:border-slate-800/40 p-5 flex flex-col shrink-0 h-full overflow-y-auto">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-[#1e7a34]/10 flex items-center justify-center text-[#1e7a34]">
                <BookOpen size={12} />
              </div>
              <h2 className="font-extrabold text-slate-850 dark:text-[#F8FAFC] text-sm">Faculty Console</h2>
            </div>
          </div>

          <div className="bg-[#f0f7f2] dark:bg-slate-900/60 rounded-xl p-1 flex mb-5 border border-slate-100 dark:border-slate-800/40">
            <button
              onClick={() => setLecturerTab('courses')}
              className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all ${
                lecturerTab === 'courses' ? 'bg-[#1e7a34] text-white shadow-sm' : 'text-slate-500 hover:text-[#1e7a34]'
              }`}
            >
              My Classes
            </button>
            <button
              onClick={() => setLecturerTab('approvals')}
              className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all ${
                lecturerTab === 'approvals' ? 'bg-[#1e7a34] text-white shadow-sm' : 'text-slate-500 hover:text-[#1e7a34]'
              }`}
            >
              Rep Proposals
            </button>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
            {lecturerTab === 'courses' ? (
              classes.map(item => (
                <div 
                  key={item.id}
                  onClick={() => handleSelectClass(item)}
                  className={`p-3.5 rounded-2xl cursor-pointer transition-all duration-200 border ${
                    item.id === activeClass?.id ? 'bg-[#1e7a34] border-[#1e7a34] text-white shadow-md' : 'border-slate-100 dark:border-slate-800/40 bg-[#f0f7f2] dark:bg-slate-900/40 hover:border-[#1e7a34]/40'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${item.id === activeClass?.id ? 'bg-white/20 text-white' : 'bg-[#1e7a34]/10 text-[#1e7a34]'}`}>
                      <BookOpen size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-xs font-bold truncate ${item.id === activeClass?.id ? 'text-white' : 'text-slate-800 dark:text-[#CBD5E1]'}`}>{item.name}</h4>
                      <p className={`text-[9px] mt-0.5 ${item.id === activeClass?.id ? 'text-white/80' : 'text-slate-400'}`}>{item.code}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              repNotices.map(item => (
                <div 
                  key={item.id}
                  className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/40"
                >
                  <h4 className="text-xs font-bold text-slate-805 dark:text-white truncate">{item.title}</h4>
                  <p className="text-[10px] text-slate-455">Rep: {item.rep}</p>
                  <span className="text-[8px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full mt-1.5 inline-block uppercase font-bold">{item.status}</span>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Panel 2: Class Workspace Tabs dashboard / University Hub details */}
        <section className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white dark:bg-[#1E293B]">
          {!isHub && activeClass ? (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header detail */}
              <div className="px-8 py-4 border-b border-slate-100 dark:border-slate-800/40 flex items-center justify-between bg-slate-50/40 dark:bg-slate-900/20 shrink-0">
                <div>
                  <h3 className="font-extrabold text-slate-805 dark:text-[#F8FAFC] text-sm">{activeClass.name} Workspace</h3>
                  <p className="text-[9px] font-bold text-[#1e7a34] uppercase">{activeClass.code} • Management Console</p>
                </div>
                <button 
                  onClick={() => navigate('/classes')}
                  className="px-3.5 py-1.5 bg-[#1e7a34]/10 text-[#1e7a34] dark:text-[#3ea556] hover:bg-[#1e7a34] hover:text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer"
                >
                  Class Settings
                </button>
              </div>

              {/* Workspace tabs selector */}
              <div className="px-8 border-b border-slate-100 dark:border-slate-800/40 flex items-center gap-6 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 py-2.5 overflow-x-auto shrink-0 select-none bg-white dark:bg-[#1E293B]">
                {[
                  { id: 'announcements', label: 'Announcements', icon: Megaphone },
                  { id: 'assignments', label: 'Assignments', icon: FileText },
                  { id: 'quizzes', label: 'Quizzes', icon: Beaker },
                  { id: 'resources', label: 'Learning Resources', icon: FolderOpen },
                  { id: 'students', label: 'Students', icon: Users },
                  { id: 'meetings', label: 'Meetings', icon: Calendar }
                ].map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveWorkspaceTab(tab.id as any)}
                      className={`pb-1.5 flex items-center gap-1 border-b-2 hover:text-[#1e7a34] transition-all cursor-pointer whitespace-nowrap ${
                        activeWorkspaceTab === tab.id ? 'border-[#1e7a34] text-[#1e7a34] dark:text-[#3ea556] dark:border-[#3ea556]' : 'border-transparent'
                      }`}
                    >
                      <Icon size={12} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Workspace tabs content pane */}
              <div className="flex-1 overflow-y-auto p-8 bg-slate-50/10 dark:bg-slate-900/10 space-y-6">
                
                {activeWorkspaceTab === 'announcements' && (
                  <div className="space-y-6">
                    {/* Post Form */}
                    <form onSubmit={handleAddAnnouncement} className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/40 rounded-3xl p-6 shadow-sm space-y-4">
                      <h4 className="text-xs font-black text-slate-850 dark:text-white flex items-center gap-2">
                        <Megaphone size={14} className="text-[#1e7a34]" />
                        <span>Publish Class Announcement</span>
                      </h4>
                      <div className="space-y-3">
                        {user?.role !== UserRole.ClassRepresentative && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Target Location</label>
                            <select 
                              value={annTarget} 
                              onChange={(e) => setAnnTarget(e.target.value as 'class' | 'global')}
                              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800/40 font-semibold text-slate-800 dark:text-white cursor-pointer"
                            >
                              <option value="class">This Course Workspace Only ({activeClass?.code})</option>
                              <option value="global">University Hub (Visible to all students)</option>
                            </select>
                          </div>
                        )}
                        <input 
                          type="text" 
                          placeholder="Notice Headline..." 
                          value={newAnnTitle}
                          onChange={(e) => setNewAnnTitle(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800/40 font-semibold text-slate-800 dark:text-white"
                        />
                        <textarea 
                          placeholder="Detailed content of the announcement..." 
                          value={newAnnContent}
                          onChange={(e) => setNewAnnContent(e.target.value)}
                          rows={3}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800/40 font-semibold resize-none text-slate-800 dark:text-white"
                        />
                        <button 
                          type="submit"
                          className="px-4 py-2.5 bg-[#1e7a34] text-white hover:bg-[#258d3f] text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                        >
                          Post Announcement
                        </button>
                      </div>
                    </form>

                    {/* Announcements List */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/40 rounded-3xl p-6 shadow-sm space-y-4">
                      <h4 className="text-xs font-black text-slate-800 dark:text-white">Existing Announcements ({announcements.length})</h4>
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {announcements.length === 0 ? (
                          <p className="text-xs text-slate-400 italic font-semibold">No announcements published for this class yet.</p>
                        ) : (
                          announcements.map(ann => (
                            <div key={ann.id} className="p-4 bg-slate-50/50 dark:bg-slate-955/30 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-start justify-between gap-4">
                              <div className="space-y-1 min-w-0">
                                <h5 className="text-xs font-black text-slate-850 dark:text-slate-200 truncate">{ann.title}</h5>
                                <p className="text-[10px] text-slate-500 dark:text-[#94A3B8] line-clamp-2 leading-relaxed font-semibold">{ann.content}</p>
                                <span className="text-[8px] font-bold text-slate-400 block uppercase tracking-wider">Posted on {new Date(ann.createdAt).toLocaleDateString()}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteAnnouncement(ann.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all cursor-pointer shrink-0"
                                title="Delete announcement"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeWorkspaceTab === 'assignments' && (
                  <div className="space-y-6">
                    <form onSubmit={handleAddAssignment} className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/40 rounded-3xl p-6 shadow-sm space-y-4">
                      <h4 className="text-xs font-black text-slate-805 dark:text-white flex items-center gap-2">
                        <FileText size={14} className="text-[#1e7a34]" />
                        <span>Create Assignment Task</span>
                      </h4>

                      {/* Mode toggle */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Assignment Mode</label>
                        <div className="flex gap-2 p-1 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/40 max-w-sm">
                          <button
                            type="button"
                            onClick={() => {
                              setAssignmentMode('typed');
                              setAsgErrorMsg('');
                            }}
                            className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                              assignmentMode === 'typed'
                                ? 'bg-[#1e7a34] text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                          >
                            ✍ Typed Instructions
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAssignmentMode('file');
                              setAsgErrorMsg('');
                            }}
                            className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                              assignmentMode === 'file'
                                ? 'bg-[#1e7a34] text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                          >
                            📁 File Attachment
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Assignment Title</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Midterm Lab Report..." 
                            value={newAsgTitle}
                            onChange={(e) => setNewAsgTitle(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800/40 font-semibold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Due Date</label>
                          <input 
                            type="date" 
                            value={newAsgDue}
                            onChange={(e) => setNewAsgDue(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800/40 font-semibold"
                          />
                        </div>
                      </div>
                      
                      {assignmentMode === 'typed' ? (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Written Instructions / Description</label>
                          <textarea
                            placeholder="Write assignment instructions, requirements, deliverables, or questions here..."
                            value={newAsgDesc}
                            onChange={(e) => setNewAsgDesc(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-955 text-xs rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800/40 font-semibold h-24 resize-none"
                          />
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Upload Assignment File Guidelines (PDF, Docx, ZIP...)</label>
                          <input 
                            type="file" 
                            onChange={(e) => setNewAsgFile(e.target.files?.[0] || null)}
                            disabled={isUploadingAsg}
                            className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#1e7a34]/10 file:text-[#1e7a34] hover:file:bg-[#1e7a34]/20 cursor-pointer disabled:opacity-50"
                          />
                        </div>
                      )}

                      {asgErrorMsg && (
                        <p className="text-[10px] text-red-500 font-bold">{asgErrorMsg}</p>
                      )}

                      <button 
                        type="submit"
                        disabled={isUploadingAsg}
                        className="px-4 py-2.5 bg-[#1e7a34] text-white hover:bg-[#258d3f] text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isUploadingAsg ? 'Uploading File & Publishing...' : 'Publish Assignment'}
                      </button>
                    </form>

                    {/* Assignments List */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/40 rounded-3xl p-6 shadow-sm space-y-4">
                      <h4 className="text-xs font-black text-slate-800 dark:text-white">Existing Assignments ({assignments.length})</h4>
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {assignments.length === 0 ? (
                          <p className="text-xs text-slate-400 italic font-semibold">No assignments created for this class yet.</p>
                        ) : (
                          assignments.map(asg => (
                            <div key={asg.id} className="p-4 bg-slate-50/50 dark:bg-slate-955/30 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-start justify-between gap-4">
                              <div className="space-y-1 min-w-0">
                                <h5 className="text-xs font-black text-slate-850 dark:text-slate-200 truncate">{asg.title}</h5>
                                <p className="text-[10px] text-slate-500 dark:text-[#94A3B8] line-clamp-1 font-semibold">{asg.description || asg.instructions}</p>
                                <span className="text-[8px] font-bold text-red-500 dark:text-red-400 block uppercase tracking-wider">Due on {new Date(asg.dueDate).toLocaleDateString()}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteAssignment(asg.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all cursor-pointer shrink-0"
                                title="Delete assignment"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeWorkspaceTab === 'quizzes' && (
                  <div className="space-y-6">
                    <form onSubmit={handleAddQuiz} className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/40 rounded-3xl p-6 shadow-sm space-y-4">
                      <h4 className="text-xs font-black text-slate-850 dark:text-white flex items-center gap-2">
                        <Beaker size={14} className="text-[#1e7a34]" />
                        <span>Schedule Assessment Quiz</span>
                      </h4>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Target Location</label>
                        <select 
                          value={quizTarget} 
                          onChange={(e) => setQuizTarget(e.target.value as 'class' | 'global')}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800/40 font-semibold text-slate-800 dark:text-white cursor-pointer"
                        >
                          <option value="class">This Course Workspace Only ({activeClass?.code})</option>
                          <option value="global">University Hub (Visible to all students)</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input 
                          type="text" 
                          placeholder="Quiz Title..." 
                          value={newQuizTitle}
                          onChange={(e) => setNewQuizTitle(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800/40 font-semibold md:col-span-2"
                        />
                        <input 
                          type="number" 
                          placeholder="Points (e.g. 20)" 
                          value={newQuizPoints}
                          onChange={(e) => setNewQuizPoints(Number(e.target.value))}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800/40 font-semibold"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input 
                          type="date" 
                          value={newQuizDate}
                          onChange={(e) => setNewQuizDate(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800/40 font-semibold"
                        />
                      </div>
                      <button 
                        type="submit"
                        className="px-4 py-2.5 bg-[#1e7a34] text-white hover:bg-[#258d3f] text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                      >
                        Schedule Quiz
                      </button>
                    </form>

                    {/* Quizzes List */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/40 rounded-3xl p-6 shadow-sm space-y-4">
                      <h4 className="text-xs font-black text-slate-800 dark:text-white">Scheduled Quizzes ({quizzes.length})</h4>
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {quizzes.length === 0 ? (
                          <p className="text-xs text-slate-400 italic font-semibold">No quizzes scheduled for this class yet.</p>
                        ) : (
                          quizzes.map(qz => (
                            <div key={qz.id} className="p-4 bg-slate-50/50 dark:bg-slate-955/30 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-start justify-between gap-4">
                              <div className="space-y-1 min-w-0">
                                <h5 className="text-xs font-black text-slate-850 dark:text-slate-200 truncate">{qz.title}</h5>
                                <p className="text-[10px] text-slate-500 dark:text-[#94A3B8] font-bold">Max Score: {qz.points} pts • Questions: {qz.questionsCount || 0}</p>
                                <span className="text-[8px] font-bold text-[#1e7a34] block uppercase tracking-wider">Scheduled for {new Date(qz.date).toLocaleDateString()}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteQuiz(qz.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all cursor-pointer shrink-0"
                                title="Delete quiz"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeWorkspaceTab === 'resources' && (
                  <div className="space-y-6">
                    {/* Upload Resource Form */}
                    <form onSubmit={handleUploadResource} className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/40 rounded-3xl p-6 shadow-sm space-y-4">
                      <h4 className="text-xs font-black text-slate-850 dark:text-white flex items-center gap-2">
                        <FolderOpen size={14} className="text-[#1e7a34]" />
                        <span>Upload Class Learning Resource</span>
                      </h4>
                      <div className="space-y-3">
                        {user?.role !== UserRole.ClassRepresentative && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Target Location</label>
                            <select 
                              value={resTarget} 
                              onChange={(e) => setResTarget(e.target.value as 'class' | 'global')}
                              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800/40 font-semibold text-slate-800 dark:text-white cursor-pointer"
                            >
                              <option value="class">This Course Workspace Only ({activeClass?.code})</option>
                              <option value="global">University Hub (Visible to all students)</option>
                            </select>
                          </div>
                        )}
                        <input 
                          type="text" 
                          placeholder="Resource Document Title (e.g. Lecture 4 Notes)..." 
                          value={newResTitle}
                          onChange={(e) => setNewResTitle(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800/40 font-semibold text-slate-800 dark:text-white"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase block pl-1">Category</label>
                            <select 
                              value={newResCategory}
                              onChange={(e) => setNewResCategory(e.target.value)}
                              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800/40 font-semibold text-slate-700 dark:text-slate-350"
                            >
                              <option value="Document">📄 Document (Syllabus/Slides)</option>
                              <option value="Assignment">📝 Assignment Guidelines</option>
                              <option value="Reference">📚 Reference book</option>
                              <option value="Syllabus">🗓️ Course Outline</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase block pl-1">Select File</label>
                            <input 
                              type="file" 
                              onChange={(e) => setNewResFile(e.target.files?.[0] || null)}
                              disabled={isUploadingRes}
                              className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-bold file:bg-[#1e7a34]/10 file:text-[#1e7a34] hover:file:bg-[#1e7a34]/20 cursor-pointer disabled:opacity-50 mt-1"
                            />
                          </div>
                        </div>
                        {resErrorMsg && (
                          <p className="text-[10px] text-red-500 font-bold pl-1">{resErrorMsg}</p>
                        )}
                        <button 
                          type="submit"
                          disabled={isUploadingRes}
                          className="px-4 py-2.5 bg-[#1e7a34] text-white hover:bg-[#258d3f] text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
                        >
                          {isUploadingRes ? 'Uploading file...' : 'Upload Learning Material'}
                        </button>
                      </div>
                    </form>

                    {/* Resources List */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/40 rounded-3xl p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-800 dark:text-white">Uploaded Resources ({resources.length})</h4>
                        <button 
                          onClick={() => navigate('/resources')}
                          className="text-[10px] font-bold text-[#1e7a34] hover:underline cursor-pointer"
                        >
                          Open Resource Hub Manager
                        </button>
                      </div>
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {resources.length === 0 ? (
                          <p className="text-xs text-slate-400 italic font-semibold">No learning resources uploaded for this class yet.</p>
                        ) : (
                          resources.map(res => (
                            <div key={res.id} className="p-4 bg-slate-50/50 dark:bg-slate-955/30 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-start justify-between gap-4">
                              <div className="space-y-1 min-w-0">
                                <h5 className="text-xs font-black text-slate-850 dark:text-slate-200 truncate">{res.title}</h5>
                                <p className="text-[9px] text-[#1e7a34] font-bold uppercase">{res.category || 'Material'}</p>
                                <span className="text-[8px] font-bold text-slate-400 block uppercase tracking-wider">Uploaded on {new Date(res.createdAt).toLocaleDateString()}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteResource(res.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all cursor-pointer shrink-0"
                                title="Delete learning resource"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeWorkspaceTab === 'students' && (
                  <div className="space-y-6">
                    {/* Enrollment Card header */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/40 rounded-3xl p-6 shadow-sm space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-slate-805 dark:text-white flex items-center gap-2">
                            <Users size={14} className="text-[#1e7a34]" />
                            <span>Class Enrollment List ({classMembers.students?.length ?? 0})</span>
                          </h4>
                          <p className="text-[11px] text-slate-550 dark:text-slate-400 font-semibold leading-relaxed">
                            View students enrolled in this course and appoint the Course Representative.
                          </p>
                        </div>
                        {user?.role !== UserRole.Student && (
                          <button 
                            onClick={() => navigate('/classes')}
                            className="px-4 py-2 bg-[#1e7a34] text-white hover:bg-[#258d3f] text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer shrink-0 animate-fade-in"
                          >
                            Invite / Manage Enrolled Students
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Members List Table / Cards */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/40 rounded-3xl p-6 shadow-sm">
                      {isLoadingMembers ? (
                        <div className="py-12 text-center text-xs text-slate-400 font-semibold">Loading class roster...</div>
                      ) : membersError ? (
                        <div className="py-12 text-center text-xs text-red-500 font-bold">{membersError}</div>
                      ) : !classMembers.students || classMembers.students.length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-405 font-semibold">No students are currently enrolled in this class.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50/50 dark:bg-slate-900/30 text-[9px] font-bold text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800/20">
                                <th className="px-4 py-3">Student Details</th>
                                <th className="px-4 py-3">Identification ID</th>
                                <th className="px-4 py-3">Role Status</th>
                                {user?.role !== UserRole.Student && <th className="px-4 py-3 text-right">Actions</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/20">
                              {classMembers.students.map(student => {
                                const isRep = student.isClassRepresentative;
                                const hasAnyRep = classMembers.students.some(s => s.isClassRepresentative);
                                return (
                                  <tr key={student.id} className="text-[11px] font-semibold text-slate-700 dark:text-slate-350 hover:bg-slate-50/50 dark:hover:bg-slate-950/10 transition-colors">
                                    <td className="px-4 py-3">
                                      <div className="font-extrabold text-slate-800 dark:text-white">{student.name}</div>
                                      <div className="text-[9px] text-slate-400">{student.email}</div>
                                    </td>
                                    <td className="px-4 py-3 font-mono">{student.studentId}</td>
                                    <td className="px-4 py-3">
                                      {isRep ? (
                                        <span className="inline-flex px-2 py-0.5 border border-purple-200 dark:border-purple-900/30 text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 rounded text-[9px] font-bold">
                                          ★ Course Rep
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Student</span>
                                      )}
                                    </td>
                                    {user?.role !== UserRole.Student && (
                                      <td className="px-4 py-3 text-right">
                                        {isRep ? (
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              if (window.confirm(`Are you sure you want to remove ${student.name} as Course Representative?`)) {
                                                try {
                                                  await api.post(`/classworkspaces/${activeClass.id}/remove-rep`);
                                                  fetchClassMembers(activeClass.id);
                                                  setSuccessMsg('Representative removed successfully!');
                                                  setTimeout(() => setSuccessMsg(''), 3000);
                                                } catch (err: any) {
                                                  alert(err.response?.data?.message || 'Failed to remove representative.');
                                                }
                                              }
                                            }}
                                            className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-600 hover:bg-red-500 hover:text-white rounded-lg text-[9px] font-bold cursor-pointer transition-all"
                                          >
                                            Remove Rep
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              const confirmMsg = hasAnyRep 
                                                ? `This will replace the current representative. Appoint ${student.name} as the Course Representative?` 
                                                : `Appoint ${student.name} as the Course Representative for this class?`;
                                              if (window.confirm(confirmMsg)) {
                                                try {
                                                  await api.post(`/classworkspaces/${activeClass.id}/assign-rep`, { studentId: student.id });
                                                  fetchClassMembers(activeClass.id);
                                                  setSuccessMsg('Representative appointed successfully!');
                                                  setTimeout(() => setSuccessMsg(''), 3000);
                                                } catch (err: any) {
                                                  alert(err.response?.data?.message || 'Failed to assign representative.');
                                                }
                                              }
                                            }}
                                            className="px-2.5 py-1 bg-[#1e7a34]/10 border border-[#1e7a34]/20 text-[#1e7a34] hover:bg-[#1e7a34] hover:text-white rounded-lg text-[9px] font-bold cursor-pointer transition-all"
                                          >
                                            Appoint Rep
                                          </button>
                                        )}
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeWorkspaceTab === 'meetings' && (
                  <div className="space-y-6">
                    <form onSubmit={handleAddSchedule} className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/40 rounded-3xl p-6 shadow-sm space-y-4">
                      <h4 className="text-xs font-black text-slate-805 dark:text-white flex items-center gap-2">
                        <Calendar size={14} className="text-[#1e7a34]" />
                        <span>Schedule Class Session / Meeting</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input 
                          type="text" 
                          placeholder="Session Title (e.g. Lab Sync)..." 
                          value={newSchedTitle}
                          onChange={(e) => setNewSchedTitle(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800/40 font-semibold"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input 
                          type="time" 
                          value={newSchedTime}
                          onChange={(e) => setNewSchedTime(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800/40 font-semibold"
                        />
                      </div>
                      <button 
                        type="submit"
                        className="px-4 py-2.5 bg-[#1e7a34] text-white hover:bg-[#258d3f] text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                      >
                        Schedule Session
                      </button>
                    </form>

                    {/* Sessions List */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/40 rounded-3xl p-6 shadow-sm space-y-4">
                      <h4 className="text-xs font-black text-slate-800 dark:text-white">Scheduled Sessions ({schedules.length})</h4>
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {schedules.length === 0 ? (
                          <p className="text-xs text-slate-400 italic font-semibold">No sync sessions scheduled for this class yet.</p>
                        ) : (
                          schedules.map(sch => (
                            <div key={sch.id} className="p-4 bg-slate-50/50 dark:bg-slate-955/30 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-start justify-between gap-4">
                              <div className="space-y-1 min-w-0">
                                <h5 className="text-xs font-black text-slate-850 dark:text-slate-200 truncate">{sch.title}</h5>
                                <p className="text-[10px] text-[#1e7a34] font-bold">
                                  {new Date(sch.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  {sch.room && ` • Room: ${sch.room}`}
                                </p>
                                <span className="text-[8px] font-bold text-slate-455 block uppercase tracking-wider">Date: {new Date(sch.startTime).toLocaleDateString()}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteSchedule(sch.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all cursor-pointer shrink-0"
                                title="Delete sync session"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          ) : (
            // UNIVERSITY HUB: Welcome, stats, recent activity
            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/5 dark:bg-slate-900/5">
              {/* Welcome Banner */}
              <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/5 dark:from-emerald-500/5 dark:to-transparent border border-emerald-500/20 rounded-3xl p-8">
                <h2 className="text-base font-black text-slate-805 dark:text-white uppercase tracking-wider">{getDynamicGreeting()}, Dr. {user?.lastName || 'Faculty'}!</h2>
                <p className="text-xs text-slate-500 dark:text-slate-350 font-medium mt-1 leading-relaxed">Welcome to SANS University Hub. This portal aggregates management metrics, proposal pending queues, and active announcements. Enter any course workspace from the left pane to manage class assets.</p>
              </div>

              {/* Statistics Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 rounded-3xl p-5 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Active Classes</span>
                  <span className="text-2xl font-black text-slate-800 dark:text-white block mt-1">{classes.length}</span>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 rounded-3xl p-5 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Students</span>
                  <span className="text-2xl font-black text-[#1e7a34] block mt-1">
                    {classes.reduce((sum, c) => sum + (c.studentsCount || 0), 0)}
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 rounded-3xl p-5 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Pending Proposals</span>
                  <span className="text-2xl font-black text-amber-500 block mt-1">{repNotices.length}</span>
                </div>
              </div>

              {/* Taught classes grid */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-800 dark:text-[#CBD5E1] uppercase tracking-wider px-1">Classes Portfolio</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {classes.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-[#94A3B8] font-bold py-6 text-center bg-white dark:bg-slate-900 border border-slate-150 rounded-2xl col-span-2">No courses created yet.</p>
                  ) : (
                    classes.map(cls => (
                      <div 
                        key={cls.id}
                        onClick={() => handleSelectClass(cls)}
                        className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 rounded-3xl cursor-pointer hover:border-[#1e7a34] hover:shadow-soft transition-all hover:scale-[1.01] flex flex-col justify-between"
                      >
                        <div>
                          <span className="text-[8px] font-extrabold text-[#1e7a34] bg-[#f0f7f2] dark:bg-slate-800 px-2 py-0.5 rounded uppercase">
                            {cls.code}
                          </span>
                          <h4 className="text-xs font-bold text-slate-805 dark:text-white mt-3 leading-tight">{cls.name}</h4>
                        </div>
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-4 flex items-center justify-between text-[9px] text-slate-400 font-bold">
                          <span>Enter Workspace</span>
                          <span>{cls.studentsCount || 0} Students</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    );
  };

  return (
    <>
      {user?.role === UserRole.Lecturer && renderLecturer()}
      {user?.role === UserRole.ClassRepresentative && renderRep()}
      {user?.role === UserRole.Student && renderStudent()}
      {successMsg && (
        <div className="fixed bottom-6 right-6 bg-[#1e7a34] text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-large flex items-center gap-2 z-[9999] transition-all duration-300 animate-bounce">
          <CheckCircle size={14} className="text-white shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
    </>
  );
};

export default DashboardPage;
