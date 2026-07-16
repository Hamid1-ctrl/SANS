import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../components/layout/ThemeProvider';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAnnouncements, useCreateAnnouncement } from '../hooks/useAnnouncements';
import { useAssignments, useCreateAssignment } from '../hooks/useAssignments';
import { useSchedules, useCreateSchedule } from '../hooks/useSchedules';
import { useQuizzes, useCreateQuiz } from '../hooks/useQuizzes';
import { useResources } from '../hooks/useResources';
import { UserRole } from '../types';
import api from '../lib/axios';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Clock, 
  Paperclip, 
  Send,
  BookOpen,
  AlertCircle,
  CheckCircle,
  FileText,
  Search,
  Bookmark,
  Zap,
  Check,
  BookmarkCheck,
  UserCheck,
  TrendingUp,
  BarChart2,
  Activity,
  Layers,
  Shield,
  Megaphone,
  Building,
  UserPlus,
  Users,
  Calendar,
  MessageSquare,
  Beaker
} from 'lucide-react';

interface LoggedIssue {
  id: number;
  title: string;
  reporter: string;
  reporterId: string;
  time: string;
  status: 'Open' | 'Investigating' | 'Resolved';
  desc: string;
  comments: Array<{
    id: number;
    sender: string;
    text: string;
    time: string;
  }>;
}

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
  const [commentInput, setCommentInput] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showJoinToast, setShowJoinToast] = useState(false);
  const [joinClassError, setJoinClassError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Scoped Data Queries
  const { data: announcements = [] } = useAnnouncements(activeClass?.id);
  const { data: assignments = [] } = useAssignments(activeClass?.id);
  const { data: quizzes = [] } = useQuizzes(activeClass?.id);
  const { data: schedules = [] } = useSchedules(activeClass?.id);
  const { data: resources = [] } = useResources(activeClass?.id);

  // Student specific panel state
  const [studentSearch, setStudentSearch] = useState('');
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  const activeAnnouncement = announcements.find(a => a.id === selectedStudentId) || announcements[0];

  // Lecturer specific state
  const [lecturerTab, setLecturerTab] = useState<'courses' | 'approvals'>('courses');
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'announcements' | 'assignments' | 'quizzes' | 'resources' | 'students' | 'messages' | 'meetings' | 'attendance' | 'files'>('announcements');
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // Creation forms within Lecturer Class Workspace
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newAsgTitle, setNewAsgTitle] = useState('');
  const [newAsgDue, setNewAsgDue] = useState('');
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizDate, setNewQuizDate] = useState('');
  const [newQuizPoints, setNewQuizPoints] = useState(10);
  const [newSchedTitle, setNewSchedTitle] = useState('');
  const [newSchedTime, setNewSchedTime] = useState('');

  const createAnnMutation = useCreateAnnouncement();
  const createAsgMutation = useCreateAssignment();
  const createQuizMutation = useCreateQuiz();
  const createSchedMutation = useCreateSchedule();

  // Class Representative State
  const [repTab, setRepTab] = useState<'notices' | 'issues'>('issues');
  const [selectedRepId, setSelectedRepId] = useState(401);
  const [repNotices, setRepNotices] = useState([
    { id: 501, title: 'Liaison Committee Meeting with Dean', date: 'Yesterday', desc: 'The representative committee meeting with the Department Dean is scheduled for next Monday at 10:00 AM. We will bring up server outages.', isApproved: true },
    { id: 502, title: 'Proposed Study Group: Algorithms', date: '3 days ago', desc: 'Request sent to Dr. Sarah Jenkins for approval to set up a study group directory on the files tab.', isApproved: false }
  ]);
  const [repIssues, setRepIssues] = useState<LoggedIssue[]>([
    {
      id: 401,
      title: 'Lab 3 Terminal Connectivity Crash',
      reporter: 'Tricia McMillan',
      reporterId: 'STU102438',
      time: '15m ago',
      status: 'Investigating',
      desc: 'The database client cannot connect to the backend server on port 5432. All terminals showing Connection Refused.',
      comments: [
        { id: 1, sender: 'Tricia McMillan', text: 'This started after the system maintenance yesterday morning.', time: '11:02 AM' },
        { id: 2, sender: 'Class Rep', text: 'I reported the crash to the network center. Investigating now.', time: '11:15 AM' }
      ]
    }
  ]);

  const activeRepNotice = repNotices.find(n => n.id === selectedRepId) || repNotices[0];
  const activeRepIssue = repIssues.find(i => i.id === selectedRepId) || repIssues[0];

  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
      if (!activeClass) {
        setActiveClass(classes[0]);
      }
    }
  }, [classes, selectedClassId, activeClass, setActiveClass]);

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

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    // Comments local simulation
    setCommentInput('');
  };

  // Lecturer Form Handlers
  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnContent.trim() || !activeClass) return;
    try {
      await createAnnMutation.mutateAsync({
        title: newAnnTitle,
        content: newAnnContent,
        classWorkspaceId: activeClass.id,
        isGlobal: false
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
    try {
      await createAsgMutation.mutateAsync({
        title: newAsgTitle,
        dueDate: newAsgDue,
        classWorkspaceId: activeClass.id,
        maxPoints: 100,
        allowLateSubmission: true
      });
      setNewAsgTitle('');
      setNewAsgDue('');
      setSuccessMsg('Success: Assignment posted successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuizTitle.trim() || !newQuizDate || !activeClass) return;
    try {
      await createQuizMutation.mutateAsync({
        title: newQuizTitle,
        date: newQuizDate,
        points: Number(newQuizPoints),
        questionsCount: 5,
        classWorkspaceId: activeClass.id
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

  const handleSelectClass = (cls: any) => {
    setSelectedClassId(cls.id);
    setActiveClass(cls);
  };

  // ==========================================
  // RENDER STUDENT — Forest Green Theme
  // ==========================================
  const renderStudent = () => (
    <div className={`flex h-[calc(100vh-64px)] overflow-hidden bg-[#f7f6fb] dark:bg-[#0F172A] ${theme === 'dark' ? 'dark' : ''}`}>
      
      {/* Panel 1: Announcements Bulletins List */}
      <aside className="w-72 bg-white dark:bg-[#1E293B] border-r border-[#ece8f3] dark:border-slate-800/40 p-5 flex flex-col shrink-0 h-full overflow-y-auto">
        <div className="mb-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg bg-[#1e7a34]/10 flex items-center justify-center text-[#1e7a34]">
              <Megaphone size={12} />
            </div>
            <h2 className="font-extrabold text-slate-800 dark:text-[#F8FAFC] text-sm">Announcements</h2>
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

        <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
          {announcements
            .filter(a => a.title.toLowerCase().includes(studentSearch.toLowerCase()) || a.content.toLowerCase().includes(studentSearch.toLowerCase()))
            .map(item => (
              <div 
                key={item.id}
                onClick={() => setSelectedStudentId(item.id)}
                className={`p-3.5 rounded-2xl cursor-pointer transition-all duration-200 border ${
                  item.id === selectedStudentId
                    ? 'bg-[#1e7a34] border-[#1e7a34] shadow-lg shadow-[#1e7a34]/20'
                    : 'border-slate-100 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/40 hover:border-[#1e7a34]/40'
                }`}
              >
                <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-md uppercase ${item.id === selectedStudentId ? 'bg-white/20 text-white' : 'bg-[#1e7a34]/10 text-[#1e7a34]'}`}>
                  {item.status || 'Notice'}
                </span>
                <h4 className={`text-xs font-bold truncate mt-2 ${item.id === selectedStudentId ? 'text-white' : 'text-slate-800 dark:text-[#CBD5E1]'}`}>{item.title}</h4>
                <p className={`text-[10px] line-clamp-2 mt-1 leading-snug ${item.id === selectedStudentId ? 'text-white/80' : 'text-slate-500 dark:text-[#94A3B8]'}`}>{item.content}</p>
                <div className={`text-[8px] font-bold mt-2.5 flex items-center justify-between ${item.id === selectedStudentId ? 'text-white/70' : 'text-slate-405'}`}>
                  <span>{item.createdBy}</span>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
          ))}
        </div>
      </aside>

      {/* Panel 2: Active Bulletin Discussion */}
      <section className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#1E293B]">
        {activeAnnouncement ? (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800/40 flex items-center justify-between shrink-0 bg-white dark:bg-[#1E293B]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1e7a34] to-[#3ea556] text-white flex items-center justify-center font-bold text-sm">
                  {activeAnnouncement.createdBy?.[0] || 'F'}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-xs">{activeAnnouncement.title}</h3>
                  <p className="text-[9px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase">{activeAnnouncement.status} Notice • Posted by {activeAnnouncement.createdBy}</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/40 rounded-3xl p-6 space-y-4">
                <p className="text-xs text-slate-700 dark:text-[#CBD5E1] font-medium leading-relaxed whitespace-pre-line">{activeAnnouncement.content}</p>
                {activeAnnouncement.tags && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {activeAnnouncement.tags.split(',').map((tag, i) => (
                      <span key={i} className="text-[9px] font-bold text-brand-primary bg-brand-primary-light/40 dark:bg-brand-primary/10 px-2.5 py-0.5 rounded-full">
                        #{tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Discussion thread list */}
              <div className="space-y-4 pt-4 border-t border-slate-150 dark:border-slate-800/40">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Discussion Thread</h4>
                <div className="text-center py-6 text-slate-400 text-[10px] font-semibold">
                  Comments section holds class discussions.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 font-bold text-xs select-none">
            No announcements selected.
          </div>
        )}
      </section>

      {/* Panel 3: Student Class Workspace Widgets */}
      <aside className="w-72 bg-white dark:bg-[#1E293B] border-l border-[#ece8f3] dark:border-slate-800/40 p-5 flex flex-col gap-6 shrink-0 h-full overflow-y-auto">
        <div className="flex flex-col items-center text-center bg-gradient-to-b from-[#f0f7f2] to-white dark:from-slate-900/40 dark:to-slate-950/40 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/40">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1e7a34] to-[#3ea556] flex items-center justify-center text-white text-xl font-black border-4 border-white dark:border-slate-900 shadow-md">
            {user?.firstName?.[0] || 'S'}{user?.lastName?.[0] || 'D'}
          </div>
          <h3 className="text-xs font-black text-slate-800 dark:text-[#F8FAFC] mt-3">{user?.firstName} {user?.lastName}</h3>
          <p className="text-[9px] text-[#1e7a34] dark:text-[#3ea556] font-bold uppercase tracking-wider mt-0.5">Enrolled Student</p>
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

        {/* Deadlines list */}
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
                    <p className="text-xs font-bold text-slate-800 dark:text-[#CBD5E1] truncate">{item.title}</p>
                    <p className="text-[9px] text-[#1e7a34]/60 font-semibold">{new Date(item.dueDate).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quizzes list */}
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
                    <p className="text-xs font-bold text-slate-800 dark:text-[#CBD5E1] truncate">{item.title}</p>
                    <p className="text-[9px] text-[#1e7a34]/60 font-semibold">{new Date(item.date).toLocaleDateString()} • {item.points} pts</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {showJoinToast && (
          <div className="fixed bottom-6 right-6 bg-[#1e7a34] text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-large flex items-center gap-2 z-100">
            <CheckCircle size={14} className="text-white" />
            <span>Success: Joined class catalog!</span>
          </div>
        )}
      </aside>
    </div>
  );

  // ==========================================
  // RENDER COURSE REPRESENTATIVE — Teal/Cyan Theme
  // ==========================================
  const renderRep = () => (
    <div className={`flex h-[calc(100vh-64px)] overflow-hidden bg-[#f7f6fb] dark:bg-[#0F172A] ${theme === 'dark' ? 'dark' : ''}`}>
      <aside className="w-72 bg-white dark:bg-[#1E293B] border-r border-[#ece8f3] dark:border-slate-800/40 p-5 flex flex-col shrink-0 h-full overflow-y-auto">
        <div className="bg-[#f0f7f2] dark:bg-[#1E293B] rounded-xl p-1 flex mb-5 border border-slate-100 dark:border-slate-800/40">
          <button
            onClick={() => setRepTab('issues')}
            className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all ${
              repTab === 'issues' ? 'bg-[#1e7a34] text-white shadow-sm' : 'text-slate-500 hover:text-[#1e7a34]'
            }`}
          >
            Logged Issues
          </button>
          <button
            onClick={() => setRepTab('notices')}
            className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all ${
              repTab === 'notices' ? 'bg-[#1e7a34] text-white shadow-sm' : 'text-slate-500 hover:text-[#1e7a34]'
            }`}
          >
            My Proposals
          </button>
        </div>

        <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
          {repTab === 'issues' ? (
            repIssues.map(item => (
              <div 
                key={item.id}
                onClick={() => setSelectedRepId(item.id)}
                className={`p-3.5 rounded-2xl cursor-pointer transition-all duration-200 border ${
                  item.id === selectedRepId ? 'bg-[#1e7a34] border-[#1e7a34] text-white' : 'border-slate-100 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/40 hover:border-[#1e7a34]/40'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-md uppercase ${item.id === selectedRepId ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                    {item.status}
                  </span>
                  <span className={`text-[8px] ${item.id === selectedRepId ? 'text-white/80' : 'text-slate-400'}`}>{item.time}</span>
                </div>
                <h4 className={`text-xs font-bold truncate mt-2 ${item.id === selectedRepId ? 'text-white' : 'text-slate-800 dark:text-[#CBD5E1]'}`}>{item.title}</h4>
                <p className={`text-[10px] truncate mt-0.5 ${item.id === selectedRepId ? 'text-white/80' : 'text-slate-455'}`}>From: {item.reporter}</p>
              </div>
            ))
          ) : (
            repNotices.map(item => (
              <div 
                key={item.id}
                onClick={() => setSelectedRepId(item.id)}
                className={`p-3.5 rounded-2xl cursor-pointer transition-all duration-200 border ${
                  item.id === selectedRepId ? 'bg-[#1e7a34] border-[#1e7a34] text-white' : 'border-slate-100 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/40'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-md ${
                    item.isApproved 
                      ? (item.id === selectedRepId ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800')
                      : (item.id === selectedRepId ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800')
                  }`}>{item.isApproved ? 'Approved' : 'Pending Approval'}</span>
                  <span className={`text-[8px] ${item.id === selectedRepId ? 'text-white/80' : 'text-slate-405'}`}>{item.date}</span>
                </div>
                <h4 className={`text-xs font-bold truncate mt-2 ${item.id === selectedRepId ? 'text-white' : 'text-slate-800 dark:text-[#CBD5E1]'}`}>{item.title}</h4>
              </div>
            ))
          )}
        </div>
      </aside>

      <section className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#1E293B]">
        {repTab === 'issues' && activeRepIssue ? (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800/40 flex items-center justify-between shrink-0 bg-white dark:bg-[#1E293B]">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-[#F8FAFC] text-sm">{activeRepIssue.title}</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase">Reporter: {activeRepIssue.reporter} ({activeRepIssue.reporterId}) • {activeRepIssue.time}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/10 dark:bg-slate-900/10">
              <div className="bg-slate-50/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/40 rounded-3xl p-6">
                <p className="text-xs text-slate-700 dark:text-[#CBD5E1] font-medium leading-relaxed">{activeRepIssue.desc}</p>
              </div>
            </div>
          </div>
        ) : activeRepNotice ? (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800/40 flex items-center justify-between shrink-0 bg-white dark:bg-[#1E293B]">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-[#F8FAFC] text-sm">{activeRepNotice.title}</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase">Proposal Status: {activeRepNotice.isApproved ? 'Approved' : 'Pending Review'}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="bg-slate-50/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/40 rounded-3xl p-6">
                <p className="text-xs text-slate-700 dark:text-[#CBD5E1] font-medium leading-relaxed">{activeRepNotice.desc}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 font-bold text-xs select-none">
            No proposals or issues selected.
          </div>
        )}
      </section>
    </div>
  );

  // ==========================================
  // RENDER LECTURER — Dedicated Class workspaces console
  // ==========================================
  const renderLecturer = () => (
    <div className={`flex h-[calc(100vh-64px)] overflow-hidden bg-[#f6f5fb] dark:bg-[#0F172A] ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Panel 1: Dedicated Classes Card Selector */}
      <aside className="w-72 bg-white dark:bg-[#1E293B] border-r border-[#ece8f3] dark:border-slate-800/40 p-5 flex flex-col shrink-0 h-full overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-lg bg-[#1e7a34]/10 flex items-center justify-center text-[#1e7a34]">
            <Layers size={12} />
          </div>
          <h2 className="font-extrabold text-slate-800 dark:text-[#F8FAFC] text-sm">Faculty Console</h2>
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
            repApprovals.map(item => (
              <div 
                key={item.id}
                className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/40"
              >
                <h4 className="text-xs font-bold text-slate-800 dark:text-[#CBD5E1] truncate">{item.title}</h4>
                <p className="text-[10px] text-slate-455">Rep: {item.rep}</p>
                <span className="text-[8px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full mt-1.5 inline-block uppercase font-bold">{item.status}</span>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Panel 2: Class Workspace Tabs dashboard */}
      <section className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white dark:bg-[#1E293B]">
        {activeClass ? (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header detail */}
            <div className="px-8 py-4 border-b border-slate-100 dark:border-slate-800/40 flex items-center justify-between bg-slate-50/40 dark:bg-slate-900/20 shrink-0">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-[#F8FAFC] text-sm">{activeClass.name} Workspace</h3>
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
                { id: 'resources', label: 'Resources', icon: BookOpen },
                { id: 'students', label: 'Students', icon: Users },
                { id: 'meetings', label: 'Meetings', icon: Calendar },
                { id: 'files', label: 'Files', icon: Paperclip }
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
                    <h4 className="text-xs font-black text-slate-805 dark:text-white flex items-center gap-2">
                      <Megaphone size={14} className="text-[#1e7a34]" />
                      <span>Publish Class Announcement</span>
                    </h4>
                    <div className="space-y-3">
                      <input 
                        type="text" 
                        placeholder="Notice Headline..." 
                        value={newAnnTitle}
                        onChange={(e) => setNewAnnTitle(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800/40 font-semibold"
                      />
                      <textarea 
                        placeholder="Provide details..." 
                        value={newAnnContent}
                        onChange={(e) => setNewAnnContent(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800/40 font-semibold h-24 resize-none"
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="px-4 py-2.5 bg-[#1e7a34] text-white text-xs font-bold rounded-xl hover:bg-[#258d3f] transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={13} />
                      <span>Post Announcement</span>
                    </button>
                  </form>

                  {/* List */}
                  <div className="space-y-3">
                    {announcements.map(ann => (
                      <div key={ann.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 rounded-2xl shadow-sm">
                        <div className="flex justify-between items-start">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-white">{ann.title}</h4>
                          <span className="text-[8px] text-slate-400 font-bold">{new Date(ann.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] leading-relaxed mt-1.5">{ann.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeWorkspaceTab === 'assignments' && (
                <div className="space-y-6">
                  {/* Post Form */}
                  <form onSubmit={handleAddAssignment} className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/40 rounded-3xl p-6 shadow-sm space-y-4">
                    <h4 className="text-xs font-black text-slate-850 dark:text-white flex items-center gap-2">
                      <FileText size={14} className="text-[#1e7a34]" />
                      <span>Upload Class Assignment</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <input 
                        type="text" 
                        placeholder="Assignment Title..." 
                        value={newAsgTitle}
                        onChange={(e) => setNewAsgTitle(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800/40 font-semibold"
                      />
                      <input 
                        type="date" 
                        value={newAsgDue}
                        onChange={(e) => setNewAsgDue(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800/40 font-semibold"
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="px-4 py-2.5 bg-[#1e7a34] text-white text-xs font-bold rounded-xl hover:bg-[#258d3f] transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={13} />
                      <span>Upload Assignment</span>
                    </button>
                  </form>

                  {/* List */}
                  <div className="space-y-3">
                    {assignments.map(asg => (
                      <div key={asg.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 rounded-2xl shadow-sm flex justify-between items-center">
                        <div>
                          <h4 className="text-xs font-bold text-slate-850 dark:text-white">{asg.title}</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">Due Date: {new Date(asg.dueDate).toLocaleDateString()}</p>
                        </div>
                        <span className="text-[10px] font-extrabold text-[#1e7a34] bg-[#1e7a34]/10 px-2 py-0.5 rounded">{asg.maxPoints} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeWorkspaceTab === 'quizzes' && (
                <div className="space-y-6">
                  {/* Post Form */}
                  <form onSubmit={handleAddQuiz} className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/40 rounded-3xl p-6 shadow-sm space-y-4">
                    <h4 className="text-xs font-black text-slate-805 dark:text-white flex items-center gap-2">
                      <Beaker size={14} className="text-[#1e7a34]" />
                      <span>Schedule Class Quiz</span>
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <input 
                        type="text" 
                        placeholder="Quiz Topic..." 
                        value={newQuizTitle}
                        onChange={(e) => setNewQuizTitle(e.target.value)}
                        className="col-span-2 w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800/40 font-semibold"
                      />
                      <input 
                        type="date" 
                        value={newQuizDate}
                        onChange={(e) => setNewQuizDate(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800/40 font-semibold"
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="px-4 py-2.5 bg-[#1e7a34] text-white text-xs font-bold rounded-xl hover:bg-[#258d3f] transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={13} />
                      <span>Schedule Quiz</span>
                    </button>
                  </form>

                  {/* List */}
                  <div className="space-y-3">
                    {quizzes.map(qz => (
                      <div key={qz.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 rounded-2xl shadow-sm flex justify-between items-center">
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-white">{qz.title}</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">Assigned Date: {new Date(qz.date).toLocaleDateString()}</p>
                        </div>
                        <span className="text-[10px] font-extrabold text-[#1e7a34] bg-[#1e7a34]/10 px-2 py-0.5 rounded">{qz.points} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeWorkspaceTab === 'resources' && (
                <div className="space-y-6">
                  {/* Resources Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {resources.map(res => (
                      <div key={res.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 rounded-2xl shadow-sm flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#1e7a34]/10 flex items-center justify-center text-[#1e7a34] shrink-0">
                          <BookOpen size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-slate-805 dark:text-white truncate">{res.title}</h4>
                          <p className="text-[9px] text-slate-400 mt-0.5">{res.fileType} • {Math.round(res.fileSize / 1024)} KB</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeWorkspaceTab === 'students' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 rounded-3xl p-6 shadow-sm space-y-4">
                  <h4 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <Users size={14} className="text-[#1e7a34]" />
                    <span>Enrolled Students</span>
                  </h4>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    <p className="text-[11px] font-semibold text-slate-400 py-4 text-center">Refer to course rosters for student roster data.</p>
                  </div>
                </div>
              )}

              {activeWorkspaceTab === 'meetings' && (
                <div className="space-y-6">
                  <form onSubmit={handleAddSchedule} className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/40 rounded-3xl p-6 shadow-sm space-y-4">
                    <h4 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
                      <Calendar size={14} className="text-[#1e7a34]" />
                      <span>Book Class Meeting</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <input 
                        type="text" 
                        placeholder="Session Name..." 
                        value={newSchedTitle}
                        onChange={(e) => setNewSchedTitle(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800/40 font-semibold"
                      />
                      <input 
                        type="datetime-local" 
                        value={newSchedTime}
                        onChange={(e) => setNewSchedTime(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 text-xs rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800/40 font-semibold cursor-pointer"
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="px-4 py-2.5 bg-[#1e7a34] text-white text-xs font-bold rounded-xl hover:bg-[#258d3f] transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={13} />
                      <span>Schedule Meeting</span>
                    </button>
                  </form>

                  <div className="space-y-3">
                    {schedules.map(sched => (
                      <div key={sched.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 rounded-2xl shadow-sm flex items-center gap-3">
                        <Calendar size={18} className="text-[#1e7a34]" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-white">{sched.title}</h4>
                          <p className="text-[9px] text-slate-400 mt-0.5">{new Date(sched.startTime).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeWorkspaceTab === 'files' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {resources.filter(r => r.fileType?.toLowerCase().includes('pdf')).map(res => (
                    <div key={res.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 rounded-2xl shadow-sm flex items-center gap-3">
                      <FileText size={18} className="text-red-500" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate">{res.title}</h4>
                        <p className="text-[9px] text-slate-455 mt-0.5">{Math.round(res.fileSize / 1024)} KB</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 font-bold text-xs select-none">
            Please choose a class workspace from the left portfolio view.
          </div>
        )}
      </section>
    </div>
  );

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
