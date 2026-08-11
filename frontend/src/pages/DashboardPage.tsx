import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../components/layout/ThemeProvider';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAnnouncements, useCreateAnnouncement, useDeleteAnnouncement } from '../hooks/useAnnouncements';
import { useAssignments, useDeleteAssignment } from '../hooks/useAssignments';
import { useSchedules, useDeleteSchedule, useTodaySummary } from '../hooks/useSchedules';
import { useQuizzes } from '../hooks/useQuizzes';
import { useResources } from '../hooks/useResources';
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
  Trash2,
  Plus,
  X
} from 'lucide-react';
import { StudentProfileModal } from '../components/modals/StudentProfileModal';
import { ClassRosterModal } from '../components/modals/ClassRosterModal';

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
  const [selectedStudentIdForModal, setSelectedStudentIdForModal] = useState<string | null>(null);
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  
  // Scoped Data Queries
  const { data: announcements = [] } = useAnnouncements(activeClass?.id);
  const { data: assignments = [] } = useAssignments(activeClass?.id);
  const { data: quizzes = [] } = useQuizzes(activeClass?.id);
  const { data: resources = [] } = useResources(activeClass?.id);
  const { data: schedules = [] } = useSchedules(activeClass?.id);
  const { data: todaySummary } = useTodaySummary(activeClass?.id);

  // Class Representative Authorization check
  const isUserClassRep = user?.role === UserRole.ClassRepresentative || 
    Boolean(activeClass && (activeClass.classRepresentativeId === user?.id || activeClass.secondClassRepresentativeId === user?.id));

  // Student specific panel state
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  const activeAnnouncement = announcements.find(a => a.id === selectedStudentId) || null;

  // Lecturer specific state
  const [lecturerTab, setLecturerTab] = useState<'courses' | 'approvals'>('courses');
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // Creation forms within Lecturer Class Workspace
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [annTarget, setAnnTarget] = useState<'class' | 'global'>('class');

  // Class enrollment roster state
  const [classMembers, setClassMembers] = useState<{ lecturer: any; students: any[] }>({ lecturer: null, students: [] });
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState('');

  const createAnnMutation = useCreateAnnouncement();
  const deleteAnnMutation = useDeleteAnnouncement();
  const deleteAsgMutation = useDeleteAssignment();
  const deleteSchedMutation = useDeleteSchedule();

  // Real Backend Database Rep Proposals State
  const [repProposalsList, setRepProposalsList] = useState<Array<{ 
    id: string; 
    title: string; 
    rep: string; 
    repEmail?: string;
    repAvatar?: string;
    details: string; 
    status: 'Pending' | 'Approved' | 'Rejected'; 
    date: string;
    classWorkspaceId?: string;
    classCode?: string;
    className?: string;
  }>>([]);

  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [isNewProposalModalOpen, setIsNewProposalModalOpen] = useState(false);
  const [newPropTitle, setNewPropTitle] = useState('');
  const [newPropDetails, setNewPropDetails] = useState('');

  const fetchProposals = async () => {
    try {
      const res = await api.get('/repproposals');
      setRepProposalsList(res.data || []);
    } catch (err) {
      console.error('Failed to fetch real rep proposals from database:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProposals();
    }
  }, [user]);

  const showSuccessToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  const handleApproveProposal = async (id: string) => {
    try {
      await api.put(`/repproposals/${id}/approve`);
      setRepProposalsList((prev: any[]) => prev.map((p: any) => p.id === id ? { ...p, status: 'Approved' } : p));
      if (selectedProposal && selectedProposal.id === id) {
        setSelectedProposal((prev: any) => prev ? { ...prev, status: 'Approved' } : null);
      }
      showSuccessToast('Rep proposal approved successfully!');
    } catch (err) {
      console.error('Failed to approve proposal:', err);
      alert('Failed to approve proposal.');
    }
  };

  const handleRejectProposal = async (id: string) => {
    try {
      await api.put(`/repproposals/${id}/reject`);
      setRepProposalsList((prev: any[]) => prev.map((p: any) => p.id === id ? { ...p, status: 'Rejected' } : p));
      if (selectedProposal && selectedProposal.id === id) {
        setSelectedProposal((prev: any) => prev ? { ...prev, status: 'Rejected' } : null);
      }
      showSuccessToast('Rep proposal rejected.');
    } catch (err) {
      console.error('Failed to reject proposal:', err);
      alert('Failed to reject proposal.');
    }
  };

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropTitle.trim() || !newPropDetails.trim()) return;
    const targetClassId = activeClass?.id || (classes.length > 0 ? classes[0].id : '');
    if (!targetClassId) {
      alert('Please select or join a class workspace first.');
      return;
    }
    try {
      const res = await api.post('/repproposals', {
        title: newPropTitle.trim(),
        description: newPropDetails.trim(),
        classWorkspaceId: targetClassId
      });
      setRepProposalsList(prev => [res.data, ...prev]);
      setNewPropTitle('');
      setNewPropDetails('');
      setIsNewProposalModalOpen(false);
      showSuccessToast('New Rep proposal submitted successfully!');
    } catch (err) {
      console.error('Failed to submit proposal:', err);
      alert('Failed to submit proposal. Please check requirements.');
    }
  };

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
    if (activeClass) {
      fetchClassMembers(activeClass.id);
    }
  }, [activeClass?.id]);

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

  const handleSelectClass = async (cls: any) => {
    const isStudent = user?.role === UserRole.Student || (user?.role as any) === 0 || (user?.role as any) === 'Student';
    if (cls && cls.isEnrolled === false && isStudent) {
      const enteredCode = prompt(`To enter "${cls.name}", please enter the Course Code (e.g. ${cls.code || cls.courseCode || 'CE300'}):`, cls.code || cls.courseCode || '');
      if (!enteredCode || !enteredCode.trim()) return;

      try {
        await api.post('/classworkspaces/join', { code: enteredCode.trim() });
        setSuccessMsg(`Successfully joined ${cls.name}!`);
        await refreshClasses();
        setSelectedClassId(cls.id);
        setActiveClass({ ...cls, isEnrolled: true });
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (err: any) {
        alert(err.response?.data?.message || 'Invalid course code. Access denied.');
      }
      return;
    }

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
      <div className={`flex flex-col lg:flex-row h-full lg:h-[calc(100vh-64px)] overflow-y-auto lg:overflow-hidden bg-[#f7f6fb] dark:bg-[#0F172A] ${theme === 'dark' ? 'dark' : ''}`}>
        
        {/* Panel 1: Announcements Bulletins List */}
        <aside className="w-full lg:w-72 bg-white dark:bg-[#1E293B] border-b lg:border-b-0 lg:border-r border-[#ece8f3] dark:border-slate-800/40 p-5 flex flex-col shrink-0 h-auto lg:h-full overflow-y-auto">
          <div className="mb-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 dark:bg-emerald-950/40 flex items-center justify-center text-[#1e7a34] dark:text-emerald-300">
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
                          ? 'bg-emerald-500/20 dark:bg-emerald-950/60 text-[#1e7a34] dark:text-emerald-300'
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

              {/* Class Representative Action Callout Banner */}
              {isUserClassRep && (
                <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 dark:border-amber-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center font-black shrink-0 text-base">
                      🎓
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 dark:text-white">Class Representative Console Active</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Submit formal academic proposals directly to course lecturers on behalf of your class.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsNewProposalModalOpen(true)}
                    className="px-3.5 py-2 bg-[#1e7a34] hover:bg-[#258d3f] text-white text-xs font-extrabold rounded-xl transition-all shadow-xs cursor-pointer shrink-0 flex items-center gap-1.5"
                  >
                    <Plus size={13} /> Submit Proposal to Lecturer
                  </button>
                </div>
              )}

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
              <div className="bg-gradient-to-r from-[#1e7a34]/15 to-[#3ea556]/5 dark:from-[#1e7a34]/10 dark:to-transparent border border-[#1e7a34]/25 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-[8px] font-extrabold bg-[#1e7a34] text-white px-2.5 py-0.5 rounded uppercase tracking-wider shadow-sm">
                    {activeClass.code} Class Dashboard
                  </span>
                  <h2 className="text-base font-black text-slate-805 dark:text-white mt-3 leading-tight">{activeClass.name} Workspace</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">Lecturer: {activeClass.lecturerName || 'Unassigned'}</p>
                </div>
                {isUserClassRep && (
                  <button
                    onClick={() => setIsNewProposalModalOpen(true)}
                    className="px-4 py-2.5 bg-[#1e7a34] hover:bg-[#258d3f] text-white text-xs font-black rounded-xl transition-all shadow-md cursor-pointer shrink-0 flex items-center gap-1.5 self-start md:self-auto"
                  >
                    <Plus size={14} /> Submit Academic Proposal to Lecturer
                  </button>
                )}
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
                  {/* Today's Academic Timetable & Next Class Widget */}
                  <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800/40 rounded-2xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-extrabold text-[#1e7a34] dark:text-emerald-400 uppercase tracking-widest block">Today's Academic Schedule</span>
                      {todaySummary?.startsIn && (
                        <span className="text-[8px] font-extrabold bg-emerald-500/10 dark:bg-emerald-950/50 text-[#1e7a34] dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/20">{todaySummary.startsIn}</span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {(!todaySummary?.todayClasses || todaySummary.todayClasses.length === 0) ? (
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-center space-y-1">
                          <p className="text-[10px] text-slate-500 font-bold">No scheduled classes today</p>
                          <p className="text-[8px] text-slate-400">Enjoy your day or work on self-paced study!</p>
                        </div>
                      ) : (
                        todaySummary.todayClasses.slice(0, 3).map(item => (
                          <div key={item.id} className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-xl space-y-0.5">
                            <div className="flex items-center justify-between">
                              <h5 className="text-[11px] font-black text-slate-800 dark:text-white truncate">{item.courseCode} {item.title}</h5>
                              <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-600">{item.lectureType}</span>
                            </div>
                            <p className="text-[9px] text-[#1e7a34] dark:text-emerald-400 font-bold">
                              {new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {item.room && ` • Room: ${item.room}`}
                              {item.lecturerName && ` • ${item.lecturerName}`}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <button onClick={() => navigate('/schedule')} className="w-full text-center text-[9px] font-bold text-[#1e7a34] dark:text-emerald-400 hover:underline flex items-center justify-center gap-0.5 cursor-pointer pt-1">
                      Full Course Timetable <ChevronRight size={10} />
                    </button>
                  </div>

                  {/* Class Rep Academic Proposals Card */}
                  <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800/40 rounded-2xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded uppercase">
                        🎓 Academic Proposals ({repProposalsList.length})
                      </span>
                      {isUserClassRep && (
                        <button 
                          onClick={() => setIsNewProposalModalOpen(true)}
                          className="text-[9px] font-bold text-[#1e7a34] dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus size={11} /> Submit New
                        </button>
                      )}
                    </div>

                    {repProposalsList.length === 0 ? (
                      <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-center space-y-1">
                        <p className="text-[10px] text-slate-600 dark:text-slate-300 font-bold">No proposals submitted yet</p>
                        <p className="text-[8px] text-slate-400 leading-normal">
                          {isUserClassRep 
                            ? "As Class Representative, click 'Submit New' above to send a formal request to your course lecturer."
                            : "Proposals submitted by your Class Rep to course lecturers will appear here."}
                        </p>
                        {isUserClassRep && (
                          <button 
                            onClick={() => setIsNewProposalModalOpen(true)}
                            className="mt-1 text-[9px] font-bold text-[#1e7a34] dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Plus size={10} /> Send Proposal Now
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
                        {repProposalsList.map(item => (
                          <div 
                            key={item.id}
                            onClick={() => setSelectedProposal(item)}
                            className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-[#1e7a34] transition-all cursor-pointer space-y-1"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <h5 className="text-[10px] font-extrabold text-slate-800 dark:text-white truncate flex-1">{item.title}</h5>
                              <span className={`text-[7px] px-1.5 py-0.2 rounded-full uppercase font-black shrink-0 ${
                                item.status === 'Approved' ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200' :
                                item.status === 'Rejected' ? 'bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-200' :
                                'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200'
                              }`}>
                                {item.status}
                              </span>
                            </div>
                            <p className="text-[9px] text-slate-500 dark:text-slate-400 line-clamp-1">{item.details}</p>
                          </div>
                        ))}
                      </div>
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
        <aside className="w-full lg:w-80 bg-white dark:bg-[#1E293B] border-t lg:border-t-0 lg:border-l border-[#ece8f3] dark:border-slate-800/40 p-5 flex flex-col gap-6 shrink-0 h-auto lg:h-full overflow-y-auto">
          {/* Welcome Profile Widget */}
          <div className="flex flex-col items-center text-center bg-gradient-to-b from-[#f0f7f2] to-white dark:from-slate-900/40 dark:to-slate-950/40 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/40">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1e7a34] to-[#3ea556] flex items-center justify-center text-white text-xl font-black border-4 border-white dark:border-slate-900 shadow-md">
              {user?.firstName?.[0] || 'S'}{user?.lastName?.[0] || 'D'}
            </div>
            <h3 className="text-xs font-black text-slate-800 dark:text-[#F8FAFC] mt-3">{user?.firstName} {user?.lastName}</h3>
            <p className="text-[9px] text-[#1e7a34] dark:text-emerald-400 font-bold uppercase tracking-wider mt-0.5">
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
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-950/40 flex items-center justify-center text-[#1e7a34] dark:text-emerald-300 shrink-0"><Clock size={14} /></div>
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
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-950/40 flex items-center justify-center text-[#1e7a34] dark:text-emerald-300 shrink-0"><Beaker size={14} /></div>
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
      <div className={`flex flex-col lg:flex-row h-full lg:h-[calc(100vh-64px)] overflow-y-auto lg:overflow-hidden bg-[#f7f6fb] dark:bg-[#0F172A] ${theme === 'dark' ? 'dark' : ''}`}>
        
        {/* Panel 1: Faculty Console Sidebar */}
        <aside className="w-full lg:w-72 bg-white dark:bg-[#1E293B] border-b lg:border-b-0 lg:border-r border-[#ece8f3] dark:border-slate-800/40 p-5 flex flex-col shrink-0 h-auto lg:h-full overflow-y-auto">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 dark:bg-emerald-950/40 flex items-center justify-center text-[#1e7a34] dark:text-emerald-300">
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
              classes.length === 0 ? (
                <div className="p-6 text-center text-slate-400 space-y-2">
                  <BookOpen size={22} className="mx-auto opacity-50" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No Class Workspaces</p>
                  <p className="text-[10px]">You haven't been assigned to any class workspaces yet. Use "My Classes" to create one.</p>
                  <button
                    onClick={() => navigate('/classes')}
                    className="mt-2 px-4 py-2 bg-[#1e7a34] text-white rounded-xl text-[10px] font-bold hover:bg-[#258d3f] transition-all cursor-pointer"
                  >
                    Go to My Classes
                  </button>
                </div>
              ) : (
                classes.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => handleSelectClass(item)}
                    className={`p-3.5 rounded-2xl cursor-pointer transition-all duration-200 border ${
                      item.id === activeClass?.id ? 'bg-[#1e7a34] border-[#1e7a34] text-white shadow-md' : 'border-slate-100 dark:border-slate-800/40 bg-[#f0f7f2] dark:bg-slate-900/40 hover:border-[#1e7a34]/40'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${item.id === activeClass?.id ? 'bg-white/20 text-white' : 'bg-emerald-500/10 dark:bg-emerald-950/40 text-[#1e7a34] dark:text-emerald-300'}`}>
                        <BookOpen size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-xs font-bold truncate ${item.id === activeClass?.id ? 'text-white' : 'text-slate-800 dark:text-[#CBD5E1]'}`}>{item.name}</h4>
                        <p className={`text-[9px] mt-0.5 ${item.id === activeClass?.id ? 'text-white/80' : 'text-slate-400'}`}>{item.code}</p>
                      </div>
                    </div>
                  </div>
                ))
              )
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1 mb-1">
                  <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Active Proposals ({repProposalsList.length})
                  </span>
                  {isUserClassRep && (
                    <button 
                      onClick={() => setIsNewProposalModalOpen(true)}
                      className="flex items-center gap-1 text-[10px] font-bold text-[#1e7a34] dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      <Plus size={11} /> Submit New
                    </button>
                  )}
                </div>

                {repProposalsList.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 font-semibold bg-slate-50 dark:bg-slate-900/40 rounded-2xl">
                    No proposals submitted yet.
                  </div>
                ) : (
                  repProposalsList.map(item => (
                    <div 
                      key={item.id}
                      onClick={() => setSelectedProposal(item)}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/60 hover:border-[#1e7a34] dark:hover:border-emerald-500/60 transition-all cursor-pointer space-y-2 shadow-xs group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate group-hover:text-[#1e7a34] dark:group-hover:text-emerald-300 transition-colors flex-1">
                          {item.title}
                        </h4>
                        <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase font-black shrink-0 ${
                          item.status === 'Approved' ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700/50' :
                          item.status === 'Rejected' ? 'bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-700/50' :
                          'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700/50'
                        }`}>
                          {item.status}
                        </span>
                      </div>

                      <p className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1">
                        <span className="text-slate-400 dark:text-slate-400 font-medium">Rep:</span>
                        <strong className="text-slate-800 dark:text-white font-bold">{item.rep}</strong>
                      </p>

                      {item.details && (
                        <p className="text-[9px] text-slate-500 dark:text-slate-300 font-medium line-clamp-2 leading-relaxed">
                          {item.details}
                        </p>
                      )}

                      <div className="pt-1 flex items-center justify-between text-[9px] border-t border-slate-100 dark:border-slate-800/40">
                        <span className="text-slate-400 font-medium">{item.date}</span>
                        <span className="text-[#1e7a34] dark:text-emerald-300 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                          Review &rarr;
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Panel 2: Class Workspace Tabs dashboard / University Hub details */}
        <section className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white dark:bg-[#1E293B]">
          {!isHub && activeClass ? (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header detail & Quick Launcher Bar */}
              <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800/40 flex items-center justify-between bg-slate-50/40 dark:bg-slate-900/20 shrink-0 flex-wrap gap-3">
                <div>
                  <h3 className="font-black text-slate-850 dark:text-[#F8FAFC] text-base">{activeClass.name} Workspace</h3>
                  <p className="text-[10px] font-extrabold text-[#1e7a34] dark:text-emerald-400 uppercase tracking-wider mt-0.5">{activeClass.code} • Management Console</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button 
                    onClick={() => setIsRosterOpen(true)}
                    className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-[#1e7a34] dark:text-emerald-300 border border-emerald-500/20 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Users size={14} /> Enrolled Students Directory
                  </button>
                  <button 
                    onClick={() => navigate('/classes')}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-extrabold rounded-xl transition-all cursor-pointer"
                  >
                    Class Settings
                  </button>
                </div>
              </div>

              {/* Workspace Overview Content Pane */}
              <div className="flex-1 overflow-y-auto p-8 bg-slate-50/10 dark:bg-slate-900/10 space-y-8">
                
                {/* 2-Column Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* Left Column: Announcements & Assignments */}
                  <div className="space-y-8">
                    
                    {/* Post Form */}
                    <form onSubmit={handleAddAnnouncement} className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/40 rounded-3xl p-6 shadow-sm space-y-4">
                      <h4 className="text-xs font-black text-slate-850 dark:text-white flex items-center gap-2">
                        <Megaphone size={14} className="text-[#1e7a34]" />
                        <span>Publish Class Announcement</span>
                      </h4>
                      <div className="space-y-3">
                        {user?.role !== UserRole.ClassRepresentative && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Target Location</label>
                            <select 
                              value={annTarget} 
                              onChange={(e) => setAnnTarget(e.target.value as 'class' | 'global')}
                              className="w-full px-4 py-2 bg-white dark:bg-slate-900 text-xs rounded-xl focus:outline-none border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-white cursor-pointer"
                            >
                              <option value="class" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium">This Course Workspace Only ({activeClass?.code || 'None Selected'})</option>
                              <option value="global" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium">University Hub (Visible to all students)</option>
                            </select>
                          </div>
                        )}
                        <input 
                          type="text" 
                          placeholder="Notice Headline..." 
                          value={newAnnTitle}
                          onChange={(e) => setNewAnnTitle(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800 font-semibold text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        />
                        <textarea 
                          placeholder="Detailed content of the announcement..." 
                          value={newAnnContent}
                          onChange={(e) => setNewAnnContent(e.target.value)}
                          rows={3}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800 font-semibold resize-none text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
                      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                        {announcements.length === 0 ? (
                          <p className="text-xs text-slate-400 italic font-semibold">No announcements published for this class yet.</p>
                        ) : (
                          announcements.map(ann => (
                            <div key={ann.id} className="p-4 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 rounded-2xl flex items-start justify-between gap-4">
                              <div className="space-y-1 min-w-0">
                                <h5 className="text-xs font-black text-slate-850 dark:text-slate-100 truncate">{ann.title}</h5>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-semibold">{ann.content}</p>
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

                    {/* Assignments List */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/40 rounded-3xl p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
                          <FileText size={14} className="text-[#1e7a34]" />
                          <span>Active Assignments ({assignments.length})</span>
                        </h4>
                        <button onClick={() => navigate('/assignments')} className="text-[10px] font-bold text-[#1e7a34] dark:text-emerald-400 hover:underline">
                          Open Assignments Page →
                        </button>
                      </div>
                      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                        {assignments.length === 0 ? (
                          <p className="text-xs text-slate-400 italic font-semibold">No assignments created for this class yet.</p>
                        ) : (
                          assignments.map(asg => (
                            <div key={asg.id} className="p-4 bg-slate-50/70 dark:bg-slate-955/30 border border-slate-100 dark:border-slate-800/80 rounded-2xl flex items-start justify-between gap-4">
                              <div className="space-y-1 min-w-0">
                                <h5 className="text-xs font-black text-slate-850 dark:text-slate-100 truncate">{asg.title}</h5>
                                <p className="text-[10px] text-[#1e7a34] dark:text-emerald-400 font-bold">Due: {new Date(asg.dueDate).toLocaleDateString()}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteAssignment(asg.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all cursor-pointer shrink-0"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Students Roster & Meetings */}
                  <div className="space-y-8">
                    
                    {/* Enrollment Card header */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/40 rounded-3xl p-6 shadow-sm space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-slate-805 dark:text-white flex items-center gap-2">
                            <Users size={14} className="text-[#1e7a34]" />
                            <span>Class Enrolled Roster ({classMembers.students?.length ?? 0})</span>
                          </h4>
                          <p className="text-[11px] text-slate-550 dark:text-slate-400 font-semibold leading-relaxed">
                            Appoint Course Representatives and inspect student profile details.
                          </p>
                        </div>
                        <button 
                          onClick={() => setIsRosterOpen(true)}
                          className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-[#1e7a34] dark:text-emerald-300 border border-emerald-500/20 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0"
                        >
                          Open Directory
                        </button>
                      </div>

                      {/* Members List Table */}
                      {isLoadingMembers ? (
                        <div className="py-8 text-center text-xs text-slate-400 font-semibold">Loading class roster...</div>
                      ) : membersError ? (
                        <div className="py-8 text-center text-xs text-red-500 font-bold">{membersError}</div>
                      ) : !classMembers.students || classMembers.students.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400 font-semibold">No students are currently enrolled in this class.</div>
                      ) : (
                        <div className="overflow-x-auto max-h-64">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50/50 dark:bg-slate-900/30 text-[9px] font-bold text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800/20">
                                <th className="px-3 py-2">Student</th>
                                <th className="px-3 py-2">ID</th>
                                <th className="px-3 py-2">Status</th>
                                <th className="px-3 py-2 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/20">
                              {classMembers.students.slice(0, 5).map(student => {
                                const isRep = student.isClassRepresentative;
                                const repCount = classMembers.students.filter(s => s.isClassRepresentative).length;
                                return (
                                  <tr key={student.id} className="text-[11px] font-semibold text-slate-700 dark:text-slate-350">
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-extrabold text-slate-800 dark:text-white truncate max-w-[110px]">{student.name}</span>
                                        <button
                                          type="button"
                                          onClick={() => setSelectedStudentIdForModal(student.id)}
                                          className="text-[8px] font-bold px-1.5 py-0.2 bg-emerald-500/10 text-[#1e7a34] dark:text-emerald-300 rounded border border-emerald-500/20"
                                        >
                                          Profile
                                        </button>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 font-mono text-[10px]">{student.studentId}</td>
                                    <td className="px-3 py-2">
                                      {isRep ? (
                                        <span className="text-[8px] font-bold px-1.5 py-0.2 bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded">
                                          ★ Rep
                                        </span>
                                      ) : (
                                        <span className="text-[9px] text-slate-400">Student</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      {isRep ? (
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            if (window.confirm(`Remove ${student.name} as Course Representative?`)) {
                                              try {
                                                await api.post(`/classworkspaces/${activeClass.id}/remove-rep`, { studentId: student.id });
                                                fetchClassMembers(activeClass.id);
                                                setSuccessMsg('Representative removed!');
                                                setTimeout(() => setSuccessMsg(''), 3000);
                                              } catch (err: any) {
                                                alert(err.response?.data?.message || 'Failed to remove representative.');
                                              }
                                            }
                                          }}
                                          className="px-2 py-0.5 bg-red-500/10 text-red-600 rounded text-[8px] font-bold"
                                        >
                                          Remove
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            if (repCount >= 2) {
                                              alert('Class workspace already has 2 Course Representatives (maximum allowed limit). Please remove an existing Rep first.');
                                              return;
                                            }
                                            const msg = `Appoint ${student.name} as Course Representative?`;
                                            if (window.confirm(msg)) {
                                              try {
                                                await api.post(`/classworkspaces/${activeClass.id}/assign-rep`, { studentId: student.id });
                                                fetchClassMembers(activeClass.id);
                                                setSuccessMsg('Representative appointed!');
                                                setTimeout(() => setSuccessMsg(''), 3000);
                                              } catch (err: any) {
                                                alert(err.response?.data?.message || 'Failed to assign representative.');
                                              }
                                            }
                                          }}
                                          className="px-2 py-0.5 bg-emerald-500/10 text-[#1e7a34] dark:text-emerald-300 rounded text-[8px] font-bold"
                                        >
                                          Appoint
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Sessions List */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/40 rounded-3xl p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
                          <Calendar size={14} className="text-[#1e7a34]" />
                          <span>Scheduled Meetings & Sync Sessions ({schedules.length})</span>
                        </h4>
                        <button onClick={() => navigate('/schedule')} className="text-[10px] font-bold text-[#1e7a34] dark:text-emerald-400 hover:underline">
                          Open Schedule →
                        </button>
                      </div>
                      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                        {schedules.length === 0 ? (
                          <p className="text-xs text-slate-400 italic font-semibold">No sync sessions scheduled for this class yet.</p>
                        ) : (
                          schedules.map(sch => (
                            <div key={sch.id} className="p-4 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 rounded-2xl flex items-start justify-between gap-4">
                              <div className="space-y-1 min-w-0">
                                <h5 className="text-xs font-black text-slate-850 dark:text-slate-100 truncate">{sch.title}</h5>
                                <p className="text-[10px] text-[#1e7a34] dark:text-emerald-400 font-bold">
                                  {new Date(sch.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  {sch.room && ` • Room: ${sch.room}`}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteSchedule(sch.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all cursor-pointer shrink-0"
                                title="Delete schedule"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>

                </div>

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
                  <span className="text-2xl font-black text-amber-500 block mt-1">{repProposalsList.filter(p => p.status === 'Pending').length}</span>
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
        <div className="fixed bottom-6 right-6 bg-[#1e7a34] text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-3 z-[9999] transition-all duration-300">
          <CheckCircle size={16} className="text-white shrink-0" />
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="ml-2 text-white/80 hover:text-white cursor-pointer p-0.5 rounded-lg hover:bg-white/10 transition-colors">
            <X size={14} />
          </button>
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
        classWorkspaceId={activeClass?.id || null}
        classWorkspaceName={activeClass?.name}
        isOpen={isRosterOpen}
        onClose={() => setIsRosterOpen(false)}
        onSelectStudent={(id) => {
          setSelectedStudentIdForModal(id);
          setIsRosterOpen(false);
        }}
      />
      {/* SELECTED PROPOSAL DETAIL & APPROVAL MODAL */}
      {selectedProposal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 text-[#1e7a34] dark:text-emerald-300 flex items-center justify-center font-black">
                  📝
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">Rep Proposal Details</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Submitted by Class Representative for Faculty Review.</p>
                </div>
              </div>
              <button onClick={() => setSelectedProposal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Proposal Title</span>
                <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mt-0.5">{selectedProposal.title}</h4>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Submitted By (Rep)</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">{selectedProposal.rep}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Status & Date</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-black ${
                      selectedProposal.status === 'Approved' ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200' :
                      selectedProposal.status === 'Rejected' ? 'bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-200' :
                      'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200'
                    }`}>
                      {selectedProposal.status}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{selectedProposal.date}</span>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Proposal Details & Justification</span>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 whitespace-pre-line">
                  {selectedProposal.details}
                </p>
              </div>

              {selectedProposal.lecturerFeedback && (
                <div>
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block mb-1">Lecturer Review Feedback</span>
                  <p className="text-xs text-emerald-900 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 font-semibold">
                    {selectedProposal.lecturerFeedback}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                {user?.role === UserRole.Lecturer && selectedProposal.status !== 'Approved' && (
                  <button
                    onClick={() => handleApproveProposal(selectedProposal.id)}
                    className="flex-1 py-2.5 bg-[#1e7a34] text-white text-xs font-bold rounded-xl hover:bg-[#258d3f] transition-all shadow cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle size={14} /> Approve Proposal
                  </button>
                )}
                {user?.role === UserRole.Lecturer && selectedProposal.status !== 'Rejected' && (
                  <button
                    onClick={() => handleRejectProposal(selectedProposal.id)}
                    className="flex-1 py-2.5 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-all shadow cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <X size={14} /> Reject Proposal
                  </button>
                )}
                <button
                  onClick={() => setSelectedProposal(null)}
                  className={`${user?.role === UserRole.Lecturer ? 'py-2.5 px-4' : 'flex-1 py-2.5'} bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW PROPOSAL SUBMISSION MODAL */}
      {isNewProposalModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 text-[#1e7a34] dark:text-emerald-300 flex items-center justify-center font-black">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">Submit New Rep Proposal</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Create a new academic proposal for faculty review.</p>
                </div>
              </div>
              <button onClick={() => setIsNewProposalModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProposal} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Proposal Title</label>
                <input
                  type="text"
                  required
                  value={newPropTitle}
                  onChange={(e) => setNewPropTitle(e.target.value)}
                  placeholder="e.g. Extra Lab Session for EL 300"
                  className="w-full p-2.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl font-semibold placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#1e7a34]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Target Class Workspace</label>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold">
                  {activeClass ? `${activeClass.code} - ${activeClass.name}` : (classes.length > 0 ? `${classes[0].code} - ${classes[0].name}` : 'General Academic Workspace')}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Details & Justification</label>
                <textarea
                  required
                  rows={4}
                  value={newPropDetails}
                  onChange={(e) => setNewPropDetails(e.target.value)}
                  placeholder="Explain the purpose of this proposal..."
                  className="w-full p-2.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl font-semibold placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#1e7a34] resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#1e7a34] text-white text-xs font-bold rounded-xl hover:bg-[#258d3f] transition-all shadow cursor-pointer"
                >
                  Submit Proposal
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewProposalModalOpen(false)}
                  className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default DashboardPage;
