import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../components/layout/ThemeProvider';
import { UserRole } from '../types';
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
  Megaphone
} from 'lucide-react';

interface Announcement {
  id: number;
  title: string;
  desc: string;
  category: string;
  course: string;
  sender: string;
  senderRole: string;
  senderAvatar: string;
  date: string;
  unread: boolean;
  isBookmarked?: boolean;
  comments: Array<{
    id: number;
    sender: 'me' | 'them';
    senderName: string;
    text: string;
    time: string;
  }>;
}

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

  // Shared state
  const [commentInput, setCommentInput] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showJoinToast, setShowJoinToast] = useState(false);
  
  // Validation Errors
  const [joinClassError, setJoinClassError] = useState('');
  const [studentCommentError, setStudentCommentError] = useState('');
  const [repCommentError, setRepCommentError] = useState('');

  const [assignmentsList] = useState([
    { id: 1, title: 'Database Normalization Lab 4', dueDate: 'Tomorrow at 11:59 PM', course: 'Database Systems' },
    { id: 2, title: 'AI Logic Planning Problem Set', dueDate: 'July 12, 2026', course: 'Artificial Intelligence' }
  ]);

  // ==========================================
  // STUDENT DATA & HANDLERS
  // ==========================================
  const [studentSearch, setStudentSearch] = useState('');
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const [studentBulletins, setStudentBulletins] = useState<Announcement[]>([
    {
      id: 1,
      title: 'Exam Schedule Fall Semester Released',
      desc: 'The complete final exam schedule has been updated. Please inspect your exam locations and verify conflicts with your class representatives before Friday. Be sure to check the room numbers.',
      category: 'Exam',
      course: 'Computer Science 101',
      sender: 'Dr. Sarah Jenkins',
      senderRole: 'Chief Invigilator',
      senderAvatar: 'SJ',
      date: '10:30 AM',
      unread: true,
      isBookmarked: false,
      comments: [
        { id: 1, sender: 'them', senderName: 'Dr. Sarah Jenkins', text: 'Hello! I uploaded the final seating chart pdf in the files tab.', time: '10:28 AM' },
        { id: 2, sender: 'me', senderName: 'Me', text: 'Thanks Dr. Jenkins, what about room 405 seating capacity?', time: '10:31 AM' }
      ]
    },
    {
      id: 2,
      title: 'Guest Lecture: AI Trends in 2026',
      desc: 'Dr. Jenkins will present on autonomous agents, multi-agent frameworks, and real-world implementation patterns. Attendance is highly encouraged for senior year candidates.',
      category: 'Lecture',
      course: 'Artificial Intelligence',
      sender: 'Dr. Sarah Jenkins',
      senderRole: 'Professor',
      senderAvatar: 'SJ',
      date: '3h ago',
      unread: false,
      isBookmarked: true,
      comments: []
    }
  ]);
  const [selectedStudentId, setSelectedStudentId] = useState(1);

  const activeStudentBulletin = studentBulletins.find(b => b.id === selectedStudentId) || studentBulletins[0];

  const handlePostStudentComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) {
      setStudentCommentError('Please enter a comment before you can proceed.');
      return;
    }
    setStudentCommentError('');

    setStudentBulletins(prev => prev.map(b => {
      if (b.id === activeStudentBulletin.id) {
        return {
          ...b,
          comments: [
            ...b.comments,
            {
              id: b.comments.length + 1,
              sender: 'me',
              senderName: 'Me',
              text: commentInput,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]
        };
      }
      return b;
    }));
    setCommentInput('');
  };

  const toggleBookmark = (id: number) => {
    setStudentBulletins(prev => prev.map(b => b.id === id ? { ...b, isBookmarked: !b.isBookmarked } : b));
  };

  const handleJoinClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setJoinClassError('Please enter a class code before you can proceed.');
      return;
    }
    setJoinClassError('');
    setShowJoinToast(true);
    setTimeout(() => {
      setShowJoinToast(false);
      setJoinCode('');
      navigate('/classes');
    }, 1500);
  };

  // Filtered Bulletins list
  const filteredStudentBulletins = studentBulletins.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(studentSearch.toLowerCase()) || 
                          b.desc.toLowerCase().includes(studentSearch.toLowerCase());
    const matchesBookmark = showBookmarkedOnly ? b.isBookmarked : true;
    return matchesSearch && matchesBookmark;
  });


  // ==========================================
  // LECTURER DATA & HANDLERS
  // ==========================================
  const [lecturerTab, setLecturerTab] = useState<'courses' | 'approvals'>('courses');
  const [selectedLecturerId, setSelectedLecturerId] = useState(201);
  const [lecturerCourses] = useState([
    { id: 201, title: 'Artificial Intelligence', code: 'CS-401', students: 54, avgPerformance: 88, syllabusProgress: 75, lecturesHeld: 24, totalLectures: 32, description: 'Autonomous agents, search algorithms, logic planning, and neural network foundations.', nextLecture: 'Monday at 9:00 AM' },
    { id: 202, title: 'Database Systems', code: 'CS-302', students: 48, avgPerformance: 92, syllabusProgress: 90, lecturesHeld: 28, totalLectures: 32, description: 'Relational model, normalizations, indexing algorithms, transaction logging, and concurrency control.', nextLecture: 'Wednesday at 11:00 AM' }
  ]);

  const [repApprovals, setRepApprovals] = useState([
    { id: 301, title: 'Reschedule Study Session: Lab 3', rep: 'Arthur Dent', desc: 'Requesting permission to run an exam revision session in Computer Lab 3 on Thursday at 3:00 PM.', time: '15m ago', status: 'Pending' },
    { id: 302, title: 'Exam Formula Sheet Shared Link', rep: 'Arthur Dent', desc: 'Class Rep compiled a formula sheet and requests permission to share it on SANS Learning Resources.', time: '2h ago', status: 'Pending' }
  ]);

  const activeLecturerCourse = lecturerCourses.find(c => c.id === selectedLecturerId) || lecturerCourses[0];
  const activeLecturerApproval = repApprovals.find(a => a.id === selectedLecturerId) || repApprovals[0];

  const handleApproveNotice = (id: number) => {
    setRepApprovals(prev => prev.map(a => a.id === id ? { ...a, status: 'Approved' } : a));
  };


  // ==========================================
  // COURSE REPRESENTATIVE DATA & HANDLERS
  // ==========================================
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
    },
    {
      id: 402,
      title: 'Monday 9:00 AM Slot Rescheduling',
      reporter: 'Arthur Dent',
      reporterId: 'STU102435',
      time: '2h ago',
      status: 'Open',
      desc: 'Requesting to move the Monday 9:00 AM lecture slot to 11:00 AM due to public transport schedules.',
      comments: []
    }
  ]);

  const activeRepNotice = repNotices.find(n => n.id === selectedRepId) || repNotices[0];
  const activeRepIssue = repIssues.find(i => i.id === selectedRepId) || repIssues[0];

  const handlePostRepComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) {
      setRepCommentError('Please enter some text before you can proceed.');
      return;
    }
    setRepCommentError('');

    setRepIssues(prev => prev.map(i => {
      if (i.id === activeRepIssue.id) {
        return {
          ...i,
          comments: [
            ...i.comments,
            {
              id: i.comments.length + 1,
              sender: 'Class Rep',
              text: commentInput,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]
        };
      }
      return i;
    }));
    setCommentInput('');
  };

  const handleCloseIssue = () => {
    setRepIssues(prev => prev.map(i => i.id === activeRepIssue.id ? { ...i, status: 'Resolved' } : i));
  };

  const handleCreateIssue = () => {
    const title = window.prompt("Enter Student Issue Title:");
    if (!title) return;
    const desc = window.prompt("Enter Issue Description:");
    if (!desc) return;
    const reporter = window.prompt("Enter Reporter Name:");
    if (!reporter) return;

    const newIssue = {
      id: repIssues.length + 401,
      title: title,
      reporter: reporter,
      reporterId: `STU${Math.floor(100000 + Math.random() * 900000)}`,
      time: 'Just now',
      status: 'Open' as const,
      desc: desc,
      comments: []
    };
    setRepIssues([newIssue, ...repIssues]);
    setSelectedRepId(newIssue.id);
  };

  const handleCreateRepNotice = () => {
    const title = window.prompt("Enter Notice Title:");
    if (!title) return;
    const desc = window.prompt("Enter Notice Description:");
    if (!desc) return;

    const newNotice = {
      id: repNotices.length + 501,
      title: title,
      desc: desc,
      date: 'Today',
      isApproved: false
    };
    setRepNotices(prev => [newNotice, ...prev]);
    setSelectedRepId(newNotice.id);
  };

  const handleRepPlusClick = () => {
    if (repTab === 'issues') {
      handleCreateIssue();
    } else {
      handleCreateRepNotice();
    }
  };


  // ==========================================
  // RENDER STUDENT — Forest Green Theme
  // Unique: Announcement bulletin board with
  // discussion threads, progress-focused right panel
  // ==========================================
  const renderStudent = () => (
    <div className={`flex h-[calc(100vh-64px)] overflow-hidden bg-[#f7f6fb] dark:bg-[#0F172A] ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Panel 1: Bulletins List */}
      <aside className="w-72 bg-white dark:bg-[#1E293B] border-r border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] p-5 flex flex-col shrink-0 h-full overflow-y-auto">
        <div className="mb-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg bg-[#1e7a34]/10 flex items-center justify-center text-[#1e7a34]">
              <Megaphone size={12} />
            </div>
            <h2 className="font-extrabold text-slate-800 dark:text-[#F8FAFC] text-sm">
              Announcements
            </h2>
          </div>
          
          {/* Search box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search news..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[#f0f7f2] dark:bg-[#1F2937] text-slate-800 dark:text-[#CBD5E1] border border-[#c8e6d0] dark:border-[rgba(255,255,255,0.18)] focus:outline-none focus:border-[#1e7a34]/50 shadow-sm"
            />
            <Search className="absolute left-3 top-2.5 text-[#1e7a34]/50" size={13} />
          </div>

          {/* Bookmarks toggle */}
          <button
            onClick={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all border ${
              showBookmarkedOnly 
                ? 'bg-[#1e7a34] border-[#1e7a34] text-white' 
                : 'bg-[#f0f7f2] dark:bg-[#1F2937] border-[#c8e6d0] dark:border-[rgba(255,255,255,0.18)] text-[#1e7a34] hover:bg-[#e2f0e6]'
            }`}
          >
            <BookmarkCheck size={13} />
            <span>{showBookmarkedOnly ? 'Showing Bookmarked' : 'Show Bookmarked'}</span>
          </button>
        </div>

        {/* List of bulletins */}
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {filteredStudentBulletins.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 font-semibold">
              No announcements match filter.
            </div>
          ) : (
            filteredStudentBulletins.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedStudentId(item.id)}
                className={`p-3.5 rounded-2xl cursor-pointer transition-all duration-200 border ${
                  item.id === selectedStudentId
                    ? 'bg-[#1e7a34] border-[#1e7a34] shadow-lg shadow-[#1e7a34]/20'
                    : 'border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] bg-[#f0f7f2] dark:bg-[#1F2937] hover:border-[#1e7a34]/40'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold text-xs ${item.id === selectedStudentId ? 'bg-white/20 text-white' : 'bg-[#1e7a34]/10 text-[#1e7a34]'}`}>
                    {item.senderAvatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-xs font-bold truncate ${item.id === selectedStudentId ? 'text-white' : 'text-slate-800 dark:text-[#CBD5E1]'}`}>{item.sender}</h4>
                      <span className={`text-[9px] font-bold shrink-0 ${item.id === selectedStudentId ? 'text-white/70' : 'text-slate-400'}`}>{item.date}</span>
                    </div>
                    <p className={`text-xs font-black truncate mt-0.5 ${item.id === selectedStudentId ? 'text-white/90' : 'text-slate-700 dark:text-[#CBD5E1]'}`}>{item.title}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className={`px-1.5 py-0.5 text-[8px] font-extrabold rounded-md uppercase ${item.id === selectedStudentId ? 'bg-white/20 text-white' : 'bg-[#1e7a34]/10 text-[#1e7a34]'}`}>
                        {item.category}
                      </span>
                      {item.isBookmarked && <Bookmark size={10} className={item.id === selectedStudentId ? 'text-white fill-white' : 'text-[#1e7a34] fill-[#1e7a34]'} />}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Panel 2: Detail Discussion Thread */}
      <section className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <div className="flex flex-col h-full overflow-hidden">
          
          {/* Header */}
          <div className="px-8 py-4 border-b border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] flex items-center justify-between shrink-0 bg-white dark:bg-[#1E293B]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1e7a34] to-[#3ea556] text-white font-extrabold flex items-center justify-center text-sm shadow-sm shadow-[#1e7a34]/30">
                {activeStudentBulletin.senderAvatar}
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-sm">{activeStudentBulletin.sender}</h3>
                <p className="text-[9px] font-bold text-[#1e7a34] uppercase mt-0.5">
                  {activeStudentBulletin.senderRole} • {activeStudentBulletin.course}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-[9px] font-extrabold rounded-full bg-[#1e7a34]/10 text-[#1e7a34] uppercase">
                {activeStudentBulletin.category}
              </span>
              <button 
                onClick={() => toggleBookmark(activeStudentBulletin.id)}
                className={`p-2 border rounded-xl transition-all cursor-pointer ${
                  activeStudentBulletin.isBookmarked 
                    ? 'bg-[#1e7a34] border-[#1e7a34] text-white' 
                    : 'border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] text-slate-400 hover:text-[#1e7a34] hover:border-[#1e7a34]/30'
                }`}
                title="Bookmark announcement"
              >
                <Bookmark size={14} className={activeStudentBulletin.isBookmarked ? 'fill-white' : ''} />
              </button>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#f4fcf6] dark:bg-[#0d150f]">
            
            {/* Welcome banner */}
            <div className="bg-gradient-to-br from-[#1e7a34] via-[#258d3f] to-[#3ea556] text-white rounded-3xl p-6 shadow-lg shadow-[#1e7a34]/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-black/5 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/70 mb-1">Student Portal</p>
                <h1 className="text-xl font-black">Welcome back, {user?.firstName || 'Student'}!</h1>
                <p className="text-xs font-semibold mt-2.5 text-white/80 italic">
                  "Preparation meets opportunity at the intersection of discipline and consistent execution."
                </p>
                <div className="flex items-center gap-4 mt-4">
                  <div className="bg-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-white/90">
                    Attendance: <span className="text-white font-black">94.2%</span>
                  </div>
                  <div className="bg-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-white/90">
                    Credits: <span className="text-white font-black">18 / 20</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1E293B] border border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] rounded-3xl p-6 shadow-sm space-y-3">
              <h2 className="text-lg font-black text-slate-800 dark:text-[#F8FAFC]">{activeStudentBulletin.title}</h2>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-350 font-semibold">{activeStudentBulletin.desc}</p>
            </div>

            {/* Thread discussion */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#1e7a34]">Thread Discussion</span>
                <div className="h-px bg-[#d6eedd] dark:bg-[#1e3827] flex-1" />
              </div>

              {activeStudentBulletin.comments.map((comment) => {
                const isMe = comment.sender === 'me';
                return (
                  <div key={comment.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[70%] space-y-1">
                      <div className={`px-4 py-3 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm ${
                        isMe 
                          ? 'bg-[#1e7a34] text-white rounded-tr-none shadow-[#1e7a34]/20' 
                          : 'bg-white dark:bg-[#1F2937] text-slate-800 dark:text-[#CBD5E1] rounded-tl-none border border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)]'
                      }`}>
                        <p className={`text-[9px] font-bold ${isMe ? 'text-white/70' : 'text-[#1e7a34]'} mb-1`}>{comment.senderName}</p>
                        <p>{comment.text}</p>
                      </div>
                      <p className={`text-[9px] text-slate-400 font-bold px-1 ${isMe ? 'text-right' : 'text-left'}`}>{comment.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <form onSubmit={handlePostStudentComment} className="p-4 border-t border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] flex flex-col gap-2 bg-white dark:bg-[#1E293B] shrink-0">
            {studentCommentError && (
              <p className="text-[10px] font-bold text-red-500 px-1 select-none animate-pulse">
                {studentCommentError}
              </p>
            )}
            <div className="flex items-center gap-3.5 w-full">
              <button type="button" className="p-2 text-[#1e7a34]/50 hover:text-[#1e7a34] rounded-xl"><Paperclip size={16} /></button>
              <input
                type="text"
                value={commentInput}
                onChange={(e) => {
                  setCommentInput(e.target.value);
                  if (studentCommentError) setStudentCommentError('');
                }}
                placeholder="Ask a question..."
                className="flex-1 px-4 py-2.5 rounded-xl text-xs bg-[#f0f7f2] dark:bg-[#1F2937] text-slate-800 dark:text-[#CBD5E1] border border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] focus:outline-none focus:border-[#1e7a34]/50 transition-all font-semibold"
              />
              <button type="submit" className="p-3 bg-[#1e7a34] text-white rounded-xl shadow-lg shadow-[#1e7a34]/20 cursor-pointer hover:bg-[#258d3f] transition-colors"><Send size={13} /></button>
            </div>
          </form>
        </div>
      </section>

      {/* Panel 3: Right Academic Overview */}
      <aside className="w-72 bg-white dark:bg-[#1E293B] border-l border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] p-5 flex flex-col gap-5 shrink-0 h-full overflow-y-auto">
        <div 
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center text-center bg-gradient-to-b from-[#f0f7f2] to-white dark:from-[#1a2d1f] dark:to-[#111a13] rounded-2xl p-5 border border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] cursor-pointer hover:opacity-90 transition-all"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1e7a34] to-[#3ea556] flex items-center justify-center text-white text-xl font-black border-4 border-white dark:border-[#111a13] shadow-md shadow-[#1e7a34]/20 select-none">
              {(user?.firstName?.[0] || 'J')}{(user?.lastName?.[0] || 'D')}
            </div>
            <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-3 border-white dark:border-[#111a13]"></span>
          </div>
          <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-sm mt-3">
            {user?.firstName || 'John'} {user?.lastName || 'Doe'}
          </h3>
          <p className="text-[10px] font-bold text-[#1e7a34] uppercase tracking-widest">
            Student
          </p>
          {user?.studentId && (
            <p className="text-[9px] text-slate-400 font-bold mt-0.5">ID: {user.studentId}</p>
          )}
        </div>

        {/* Academic stats */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          <div className="bg-[#f0f7f2] dark:bg-[#1F2937] border border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] rounded-2xl p-3 text-center">
            <p className="text-[9px] font-bold text-[#1e7a34]/60 uppercase">Attendance</p>
            <p className="text-base font-black text-[#1e7a34] mt-0.5">94.2%</p>
          </div>
          <div className="bg-[#f0f7f2] dark:bg-[#1F2937] border border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] rounded-2xl p-3 text-center">
            <p className="text-[9px] font-bold text-[#1e7a34]/60 uppercase">Credits</p>
            <p className="text-base font-black text-[#1e7a34] mt-0.5">18/20</p>
          </div>
        </div>

        {/* Syllabus progress */}
        <div className="bg-[#f0f7f2] dark:bg-[#1F2937] border border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] rounded-2xl p-4 shrink-0 space-y-3">
          <h4 className="text-[10px] font-bold text-[#1e7a34]/60 uppercase tracking-widest flex items-center gap-1.5">
            <BookOpen size={12} className="text-[#1e7a34]" />
            <span>Term Progress</span>
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-500 dark:text-[#94A3B8]">Degree Credits</span>
              <span className="text-[#1e7a34]">90%</span>
            </div>
            <div className="w-full bg-[#d6eedd] dark:bg-[#1e3827] rounded-full h-2">
              <div className="bg-[#1e7a34] h-2 rounded-full" style={{ width: '90%' }}></div>
            </div>
          </div>
        </div>

        {/* Quick Join Class */}
        <div className="bg-[#f0f7f2] dark:bg-[#1F2937] border border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] rounded-2xl p-4 shrink-0">
          <h4 className="text-[10px] font-bold text-[#1e7a34]/60 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Zap size={12} className="text-[#1e7a34]" />
            <span>Quick Join Class</span>
          </h4>
          <form onSubmit={handleJoinClass} className="space-y-3">
            <input
              type="text"
              placeholder="Enter Class Code (e.g. CS101)"
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value);
                if (joinClassError) setJoinClassError('');
              }}
              className="w-full px-3 py-2.5 bg-white dark:bg-[#1E293B] border border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] text-xs rounded-xl focus:outline-none focus:border-[#1e7a34] font-semibold text-center uppercase"
            />
            {joinClassError && (
              <p className="text-[10px] font-bold text-red-500 text-center select-none animate-pulse">
                {joinClassError}
              </p>
            )}
            <button
              type="submit"
              className="w-full py-2.5 bg-[#1e7a34] text-white hover:bg-[#258d3f] rounded-xl text-xs font-bold transition-all shadow-sm shadow-[#1e7a34]/20 cursor-pointer"
            >
              Join Course
            </button>
          </form>
        </div>

        {/* Upcoming deadlines */}
        <div className="space-y-3 shrink-0">
          <h4 className="text-[10px] font-bold text-[#1e7a34]/60 uppercase tracking-widest px-1">Upcoming Deadlines</h4>
          <div className="space-y-2">
            {assignmentsList.map(item => (
              <div 
                key={item.id} 
                onClick={() => navigate('/assignments')}
                className="flex items-center gap-3 p-3 bg-[#f0f7f2] dark:bg-[#1F2937] border border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] rounded-2xl cursor-pointer hover:border-[#1e7a34]/50 transition-all hover:scale-[1.01]"
              >
                <div className="w-8 h-8 rounded-lg bg-[#1e7a34]/10 flex items-center justify-center text-[#1e7a34] shrink-0"><Clock size={14} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-[#CBD5E1] truncate">{item.title}</p>
                  <p className="text-[9px] text-[#1e7a34]/60 font-semibold">{item.dueDate}</p>
                </div>
              </div>
            ))}
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
  // RENDER LECTURER — Royal Purple/Indigo Theme
  // Unique: Metrics-focused, course management
  // console-style layout, deep purple aesthetics
  // ==========================================
  const renderLecturer = () => (
    <div className={`flex h-[calc(100vh-64px)] overflow-hidden bg-[#f6f5fb] dark:bg-[#0F172A] ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Panel 1: Lecturer Tab switcher */}
      <aside className="w-72 bg-white dark:bg-[#1E293B] border-r border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] p-5 flex flex-col shrink-0 h-full overflow-y-auto">
        
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-lg bg-[#1e7a34]/10 flex items-center justify-center text-[#1e7a34]">
            <Layers size={12} />
          </div>
          <h2 className="font-extrabold text-slate-800 dark:text-[#F8FAFC] text-sm">Faculty Console</h2>
        </div>
        
        <div className="bg-[#f0f7f2] dark:bg-[#1f1a35] rounded-xl p-1 flex mb-5">
          <button
            onClick={() => { setLecturerTab('courses'); setSelectedLecturerId(201); }}
            className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all ${
              lecturerTab === 'courses'
                ? 'bg-[#1e7a34] text-white shadow-sm shadow-[#1e7a34]/30'
                : 'text-slate-500 hover:text-[#1e7a34]'
            }`}
          >
            My Courses
          </button>
          <button
            onClick={() => { setLecturerTab('approvals'); setSelectedLecturerId(301); }}
            className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all ${
              lecturerTab === 'approvals'
                ? 'bg-[#1e7a34] text-white shadow-sm shadow-[#1e7a34]/30'
                : 'text-slate-500 hover:text-[#1e7a34]'
            }`}
          >
            Rep Requests
          </button>
        </div>

        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Instructor Panels</span>
          <button 
            onClick={() => navigate('/announcements')}
            className="w-7 h-7 rounded-full bg-[#1e7a34] text-white flex items-center justify-center shadow-sm shadow-[#1e7a34]/30 hover:scale-[1.05] transition-transform"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {lecturerTab === 'courses' ? (
            lecturerCourses.map(item => (
              <div
                key={item.id}
                onClick={() => setSelectedLecturerId(item.id)}
                className={`p-3.5 rounded-2xl cursor-pointer transition-all duration-200 border ${
                  item.id === selectedLecturerId
                    ? 'bg-[#1e7a34] border-[#1e7a34] shadow-lg shadow-[#1e7a34]/20'
                    : 'border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] bg-[#f0f7f2] dark:bg-[#1F2937] hover:border-[#1e7a34]/40'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${item.id === selectedLecturerId ? 'bg-white/20 text-white' : 'bg-[#1e7a34]/10 text-[#1e7a34]'}`}>
                    <BookOpen size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-xs font-bold truncate ${item.id === selectedLecturerId ? 'text-white' : 'text-slate-800 dark:text-[#CBD5E1]'}`}>{item.title}</h4>
                      <span className={`text-[9px] font-bold shrink-0 ${item.id === selectedLecturerId ? 'text-white/70' : 'text-slate-400'}`}>{item.code}</span>
                    </div>
                    <p className={`text-[11px] mt-0.5 ${item.id === selectedLecturerId ? 'text-white/70' : 'text-slate-500 dark:text-[#94A3B8]'}`}>{item.students} Students</p>
                    <p className={`text-[10px] mt-0.5 truncate ${item.id === selectedLecturerId ? 'text-white/60' : 'text-slate-400'}`}>Next: {item.nextLecture}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            repApprovals.map(item => (
              <div
                key={item.id}
                onClick={() => setSelectedLecturerId(item.id)}
                className={`p-3.5 rounded-2xl cursor-pointer transition-all duration-200 border ${
                  item.id === selectedLecturerId
                    ? 'bg-[#1e7a34] border-[#1e7a34] shadow-lg shadow-[#1e7a34]/20'
                    : 'border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] bg-[#f0f7f2] dark:bg-[#1F2937] hover:border-[#1e7a34]/40'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${item.id === selectedLecturerId ? 'bg-white/20 text-white' : 'bg-[#1e7a34]/10 text-[#1e7a34]'}`}>
                    <UserCheck size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-xs font-bold truncate ${item.id === selectedLecturerId ? 'text-white' : 'text-slate-800 dark:text-[#CBD5E1]'}`}>{item.rep}</h4>
                      <span className={`text-[9px] font-bold shrink-0 ${item.id === selectedLecturerId ? 'text-white/70' : 'text-slate-400'}`}>{item.time}</span>
                    </div>
                    <p className={`text-xs font-black truncate mt-0.5 ${item.id === selectedLecturerId ? 'text-white/90' : 'text-slate-700 dark:text-[#CBD5E1]'}`}>{item.title}</p>
                    <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full mt-1 inline-block ${
                      item.status === 'Approved' 
                        ? (item.id === selectedLecturerId ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700')
                        : (item.id === selectedLecturerId ? 'bg-white/20 text-white' : 'bg-[#1e7a34]/10 text-[#1e7a34]')
                    }`}>{item.status}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Panel 2: Course Metrics */}
      <section className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {lecturerTab === 'courses' ? (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="px-8 py-4 border-b border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] flex items-center justify-between shrink-0 bg-white dark:bg-[#1E293B]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1e7a34] to-[#3ea556] text-white flex items-center justify-center shadow-sm shadow-[#1e7a34]/30"><BookOpen size={18} /></div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-sm">{activeLecturerCourse.title}</h3>
                  <p className="text-[9px] font-bold text-[#1e7a34] uppercase">{activeLecturerCourse.code} • Management Console</p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/classes')}
                className="px-4 py-2 bg-[#1e7a34]/10 text-[#1e7a34] hover:bg-[#1e7a34] hover:text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer"
              >
                View Classes
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#f6f5fb] dark:bg-[#0F172A]">
              
              {/* Hero metrics banner */}
              <div className="bg-gradient-to-br from-[#1e7a34] via-[#258d3f] to-[#3ea556] text-white rounded-3xl p-6 shadow-lg shadow-[#1e7a34]/25 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/70 mb-1">Faculty Overview</p>
                  <h2 className="text-xl font-black">Welcome, {user?.firstName || 'Dr. Jenkins'}</h2>
                  <p className="text-xs text-white/80 mt-1">Managing {activeLecturerCourse.students} enrolled students across {activeLecturerCourse.code}</p>
                  <div className="grid grid-cols-3 gap-3 mt-5">
                    {[
                      { label: 'Class Attendance', val: '96.8%' },
                      { label: 'Avg Performance', val: `${activeLecturerCourse.avgPerformance}%` },
                      { label: 'Lectures Done', val: `${activeLecturerCourse.lecturesHeld}/${activeLecturerCourse.totalLectures}` }
                    ].map((s, i) => (
                      <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                        <p className="text-[9px] text-white/60 font-bold uppercase">{s.label}</p>
                        <p className="text-sm font-black text-white mt-0.5">{s.val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Syllabus Progress */}
              <div className="bg-white dark:bg-[#1E293B] border border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <BarChart2 size={16} className="text-[#1e7a34]" />
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Syllabus & Enrollment</h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-[#94A3B8] font-semibold">{activeLecturerCourse.description}</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-600 dark:text-[#94A3B8]">Syllabus Completion</span>
                    <span className="text-[#1e7a34]">{activeLecturerCourse.syllabusProgress}%</span>
                  </div>
                  <div className="w-full bg-[#f0f7f2] dark:bg-[#1f1a35] rounded-full h-2.5">
                    <div className="bg-gradient-to-r from-[#1e7a34] to-[#3ea556] h-2.5 rounded-full transition-all duration-500" style={{ width: `${activeLecturerCourse.syllabusProgress}%` }}></div>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <TrendingUp size={12} className="text-[#1e7a34]" />
                  <span className="text-[10px] text-[#1e7a34] font-bold">Next Lecture: {activeLecturerCourse.nextLecture}</span>
                </div>
              </div>

              {/* Quiz submissions widget */}
              <div className="bg-white dark:bg-[#1E293B] border border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-[#1e7a34]" />
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Active Quiz Submissions</h4>
                </div>
                {[
                  { title: 'Algorithms Quiz #1', submitted: 42, total: 48, pct: 87 },
                  { title: 'Database Quiz #2', submitted: 54, total: 54, pct: 100 }
                ].map((quiz, idx) => (
                  <div key={idx} className="space-y-2 py-3 border-b border-[#f0f7f2] dark:border-[rgba(255,255,255,0.18)] last:border-none last:pb-0 last:mb-0">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-800 dark:text-[#CBD5E1]">{quiz.title}</span>
                      <span className="text-[9px] text-[#1e7a34] font-extrabold">{quiz.pct}%</span>
                    </div>
                    <div className="w-full bg-[#f0f7f2] dark:bg-[#1f1a35] rounded-full h-1.5">
                      <div className="bg-gradient-to-r from-[#1e7a34] to-[#3ea556] h-1.5 rounded-full" style={{ width: `${quiz.pct}%` }}></div>
                    </div>
                    <div className="text-[9px] text-slate-400 font-bold">{quiz.submitted} / {quiz.total} Students Submitted</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="px-8 py-4 border-b border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] flex items-center justify-between shrink-0 bg-white dark:bg-[#1E293B]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1e7a34] text-white flex items-center justify-center"><UserCheck size={16} /></div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-sm">Class Rep Request</h3>
                  <p className="text-[9px] font-bold text-[#1e7a34] uppercase">From: {activeLecturerApproval.rep} • Pending Approval</p>
                </div>
              </div>
              {activeLecturerApproval.status === 'Pending' && (
                <button
                  onClick={() => handleApproveNotice(activeLecturerApproval.id)}
                  className="px-4 py-2 bg-[#1e7a34] text-white hover:bg-[#258d3f] text-xs font-extrabold rounded-xl shadow-sm shadow-[#1e7a34]/30 cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={13} strokeWidth={3} />
                  <span>Approve Publication</span>
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#f6f5fb] dark:bg-[#0F172A]">
              <div className="bg-white dark:bg-[#1E293B] border border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] rounded-3xl p-6 shadow-sm space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase">Proposed Notice Title:</h4>
                <h2 className="text-base font-black text-slate-800 dark:text-[#F8FAFC]">{activeLecturerApproval.title}</h2>
                <p className="text-xs text-slate-600 dark:text-[#94A3B8] font-semibold pt-4 border-t border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)]">
                  {activeLecturerApproval.desc}
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <span className={`text-[9px] font-extrabold px-3 py-1 rounded-full uppercase ${
                    activeLecturerApproval.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-[#1e7a34]/10 text-[#1e7a34]'
                  }`}>{activeLecturerApproval.status}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Panel 3: Right Profile panel — Lecturer specific */}
      <aside className="w-72 bg-white dark:bg-[#1E293B] border-l border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] p-5 flex flex-col gap-5 shrink-0 h-full overflow-y-auto">
        <div 
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center text-center bg-gradient-to-b from-[#f0f7f2] to-white dark:from-[#1a1730] dark:to-[#110f1e] rounded-2xl p-5 border border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] cursor-pointer hover:opacity-90 transition-all"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1e7a34] to-[#3ea556] flex items-center justify-center text-white text-xl font-black border-4 border-white dark:border-[#110f1e] shadow-md shadow-[#1e7a34]/25 select-none">
              {(user?.firstName?.[0] || 'D')}{(user?.lastName?.[0] || 'J')}
            </div>
            <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-[#110f1e]"></span>
          </div>
          <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-sm mt-3">
            {user?.firstName || 'Dr. Sarah'} {user?.lastName || 'Jenkins'}
          </h3>
          <p className="text-[10px] font-bold text-[#1e7a34] uppercase tracking-widest">
            Faculty Lecturer
          </p>
        </div>

        {/* Course stats */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          <div className="bg-[#f0f7f2] dark:bg-[#1F2937] border border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] rounded-2xl p-3 text-center">
            <p className="text-[9px] font-bold text-[#1e7a34]/60 uppercase">Courses</p>
            <p className="text-base font-black text-[#1e7a34] mt-0.5">2</p>
          </div>
          <div className="bg-[#f0f7f2] dark:bg-[#1F2937] border border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] rounded-2xl p-3 text-center">
            <p className="text-[9px] font-bold text-[#1e7a34]/60 uppercase">Students</p>
            <p className="text-base font-black text-[#1e7a34] mt-0.5">102</p>
          </div>
        </div>

        {/* Upcoming lectures */}
        <div className="space-y-3 shrink-0">
          <h4 className="text-[10px] font-bold text-[#1e7a34]/60 uppercase tracking-widest px-1">Upcoming Lectures</h4>
          <div className="space-y-2">
            {[
              { course: 'CS-401 Artificial Intelligence', time: 'Monday 09:00 AM • Hall B' },
              { course: 'CS-302 Database Systems', time: 'Wednesday 11:00 AM • Hall A' }
            ].map((lec, idx) => (
              <div 
                key={idx}
                onClick={() => navigate('/schedule')}
                className="flex items-center gap-3 p-3 bg-[#f0f7f2] dark:bg-[#1F2937] border border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] rounded-2xl cursor-pointer hover:border-[#1e7a34]/40 transition-all hover:scale-[1.01]"
              >
                <div className="w-8 h-8 rounded-lg bg-[#1e7a34]/10 flex items-center justify-center text-[#1e7a34] shrink-0"><Clock size={14} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-[#CBD5E1] truncate">{lec.course}</p>
                  <p className="text-[9px] text-[#1e7a34]/60 font-semibold">{lec.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="space-y-2 shrink-0">
          <h4 className="text-[10px] font-bold text-[#1e7a34]/60 uppercase tracking-widest px-1">Quick Actions</h4>
          {[
            { label: 'Post Announcement', icon: Megaphone, path: '/announcements' },
            { label: 'Upload Resources', icon: FileText, path: '/resources' },
          ].map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={idx}
                onClick={() => navigate(action.path)}
                className="w-full flex items-center gap-3 p-3 bg-[#f0f7f2] dark:bg-[#1F2937] border border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] rounded-2xl hover:border-[#1e7a34]/40 hover:bg-[#1e7a34] hover:text-white transition-all group cursor-pointer text-left"
              >
                <Icon size={14} className="text-[#1e7a34] group-hover:text-white" />
                <span className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1] group-hover:text-white">{action.label}</span>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );

  // ==========================================
  // RENDER COURSE REPRESENTATIVE — SANS Green Theme
  // Unique: Ticket management board, issue tracking,
  // SANS green aesthetics, liaison-focused workflow
  // ==========================================
  const renderRep = () => (
    <div className={`flex h-[calc(100vh-64px)] overflow-hidden bg-[#f7f6fb] dark:bg-[#0F172A] ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Panel 1: Issue/Notice tab switcher */}
      <aside className="w-72 bg-white dark:bg-[#1E293B] border-r border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] p-5 flex flex-col shrink-0 h-full overflow-y-auto">
        
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-lg bg-[#1e7a34]/10 flex items-center justify-center text-[#1e7a34]">
            <Shield size={12} />
          </div>
          <h2 className="font-extrabold text-slate-800 dark:text-[#F8FAFC] text-sm">Liaison Deck</h2>
        </div>
        
        <div className="bg-[#f0f7f2] dark:bg-[#1e3827] rounded-xl p-1 flex mb-5">
          <button
            onClick={() => { setRepTab('issues'); setSelectedRepId(401); }}
            className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all ${
              repTab === 'issues'
                ? 'bg-[#1e7a34] text-white shadow-sm shadow-[#1e7a34]/30'
                : 'text-slate-500 hover:text-[#1e7a34]'
            }`}
          >
            Student Issues
          </button>
          <button
            onClick={() => { setRepTab('notices'); setSelectedRepId(501); }}
            className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all ${
              repTab === 'notices'
                ? 'bg-[#1e7a34] text-white shadow-sm shadow-[#1e7a34]/30'
                : 'text-slate-500 hover:text-[#1e7a34]'
            }`}
          >
            Notices Log
          </button>
        </div>

        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Class Liaison</span>
          <button 
            onClick={handleRepPlusClick}
            className="w-7 h-7 rounded-full bg-[#1e7a34] text-white flex items-center justify-center shadow-sm shadow-[#1e7a34]/30 hover:scale-[1.05] transition-transform cursor-pointer"
            title="Create New Entry"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {repTab === 'issues' ? (
            repIssues.map(item => (
              <div
                key={item.id}
                onClick={() => setSelectedRepId(item.id)}
                className={`p-3.5 rounded-2xl cursor-pointer transition-all duration-200 border ${
                  item.id === selectedRepId
                    ? 'bg-[#1e7a34] border-[#1e7a34] shadow-lg shadow-[#1e7a34]/20'
                    : 'border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] bg-[#f0f7f2] dark:bg-[#1F2937] hover:border-[#1e7a34]/40'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${item.id === selectedRepId ? 'bg-white/20 text-white' : 'bg-[#1e7a34]/10 text-[#1e7a34]'}`}>
                    <AlertCircle size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-xs font-bold truncate ${item.id === selectedRepId ? 'text-white' : 'text-slate-800 dark:text-[#CBD5E1]'}`}>{item.title}</h4>
                      <span className={`text-[9px] font-bold shrink-0 ${item.id === selectedRepId ? 'text-white/70' : 'text-slate-400'}`}>{item.time}</span>
                    </div>
                    <p className={`text-[11px] mt-0.5 ${item.id === selectedRepId ? 'text-white/70' : 'text-slate-500 dark:text-[#94A3B8]'}`}>From: {item.reporter}</p>
                    <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full mt-1 inline-block ${
                      item.status === 'Resolved' 
                        ? (item.id === selectedRepId ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700')
                        : item.status === 'Investigating'
                        ? (item.id === selectedRepId ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700')
                        : (item.id === selectedRepId ? 'bg-white/20 text-white' : 'bg-[#1e7a34]/10 text-[#1e7a34]')
                    }`}>{item.status}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            repNotices.map(item => (
              <div
                key={item.id}
                onClick={() => setSelectedRepId(item.id)}
                className={`p-3.5 rounded-2xl cursor-pointer transition-all duration-200 border ${
                  item.id === selectedRepId
                    ? 'bg-[#1e7a34] border-[#1e7a34] shadow-lg shadow-[#1e7a34]/20'
                    : 'border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] bg-[#f0f7f2] dark:bg-[#1F2937] hover:border-[#1e7a34]/40'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${item.id === selectedRepId ? 'bg-white/20 text-white' : 'bg-[#1e7a34]/10 text-[#1e7a34]'}`}>
                    <FileText size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-xs font-bold truncate ${item.id === selectedRepId ? 'text-white' : 'text-slate-800 dark:text-[#CBD5E1]'}`}>{item.title}</h4>
                      <span className={`text-[9px] font-bold shrink-0 ${item.id === selectedRepId ? 'text-white/70' : 'text-slate-400'}`}>{item.date}</span>
                    </div>
                    <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full mt-1 inline-block ${
                      item.isApproved 
                        ? (item.id === selectedRepId ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700') 
                        : (item.id === selectedRepId ? 'bg-white/20 text-white' : 'bg-[#1e7a34]/10 text-[#1e7a34]')
                    }`}>{item.isApproved ? 'Faculty Approved' : 'Awaiting Approval'}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Panel 2: Issue detail */}
      <section className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {repTab === 'issues' ? (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="px-8 py-4 border-b border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] flex items-center justify-between shrink-0 bg-white dark:bg-[#1E293B]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1e7a34] text-white flex items-center justify-center shadow-sm shadow-[#1e7a34]/30"><AlertCircle size={18} /></div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-sm">{activeRepIssue.title}</h3>
                  <p className="text-[9px] font-bold text-[#1e7a34] uppercase">Reporter: {activeRepIssue.reporter} • {activeRepIssue.reporterId}</p>
                </div>
              </div>
              {activeRepIssue.status !== 'Resolved' && (
                <button
                  onClick={handleCloseIssue}
                  className="px-4 py-2 bg-[#1e7a34] text-white hover:bg-[#258d3f] text-xs font-extrabold rounded-xl shadow-sm shadow-[#1e7a34]/30 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle size={13} />
                  <span>Mark Resolved</span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#f7f6fb] dark:bg-[#0F172A]">
              
              {/* Welcome banner */}
              <div className="bg-gradient-to-br from-[#1e7a34] via-[#258d3f] to-[#3ea556] text-white rounded-3xl p-6 shadow-lg shadow-[#1e7a34]/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/70 mb-1">Liaison Command</p>
                  <h2 className="text-xl font-black">Liaison Desk, {user?.firstName || 'Arthur'}</h2>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="bg-white/10 rounded-xl px-3 py-1.5 text-xs font-bold">
                      Open: <span className="text-white font-black">{repIssues.filter(i => i.status !== 'Resolved').length}</span>
                    </div>
                    <div className="bg-white/10 rounded-xl px-3 py-1.5 text-xs font-bold">
                      Resolved: <span className="text-white font-black">{repIssues.filter(i => i.status === 'Resolved').length}</span>
                    </div>
                    <div className="bg-white/10 rounded-xl px-3 py-1.5 text-xs font-bold">
                      Target: <span className="text-white font-black">92%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#1E293B] border border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] rounded-3xl p-6 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase">Logged Issue Details:</h4>
                  <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase ${
                    activeRepIssue.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' : 
                    activeRepIssue.status === 'Investigating' ? 'bg-blue-100 text-blue-700' : 
                    'bg-[#1e7a34]/10 text-[#1e7a34]'
                  }`}>{activeRepIssue.status}</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-700 dark:text-[#CBD5E1] font-semibold">{activeRepIssue.desc}</p>
              </div>

              {/* Thread logs */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#1e7a34]">Discussion Log</span>
                  <div className="h-px bg-[#d6eedd] dark:bg-[#1e3827] flex-1" />
                </div>

                {activeRepIssue.comments.map(comment => {
                  const isMe = comment.sender === 'Class Rep';
                  return (
                    <div key={comment.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[70%] space-y-1">
                        <div className={`px-4 py-3 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm ${
                          isMe 
                            ? 'bg-[#1e7a34] text-white rounded-tr-none shadow-[#1e7a34]/20' 
                            : 'bg-white dark:bg-[#1E293B] text-slate-800 dark:text-[#CBD5E1] rounded-tl-none border border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)]'
                        }`}>
                          <p className={`text-[9px] font-bold ${isMe ? 'text-white/70' : 'text-[#1e7a34]'} mb-1`}>{comment.sender}</p>
                          <p>{comment.text}</p>
                        </div>
                        <p className={`text-[9px] text-slate-400 font-bold px-1 ${isMe ? 'text-right' : 'text-left'}`}>{comment.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handlePostRepComment} className="p-4 border-t border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] flex flex-col gap-2 bg-white dark:bg-[#1E293B] shrink-0 animate-none">
              {repCommentError && (
                <p className="text-[10px] font-bold text-red-500 px-1 select-none animate-pulse">
                  {repCommentError}
                </p>
              )}
              <div className="flex items-center gap-3.5 w-full">
                <button type="button" className="p-2 text-[#1e7a34]/50 hover:text-[#1e7a34] rounded-xl"><Paperclip size={16} /></button>
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => {
                    setCommentInput(e.target.value);
                    if (repCommentError) setRepCommentError('');
                  }}
                  placeholder="Log discussion update..."
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs bg-[#f0f7f2] dark:bg-[#1F2937] text-slate-800 dark:text-[#CBD5E1] border border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] focus:outline-none focus:border-[#1e7a34]/50 transition-all font-semibold"
                />
                <button type="submit" className="p-3 bg-[#1e7a34] text-white rounded-xl shadow-sm shadow-[#1e7a34]/20 cursor-pointer hover:bg-[#258d3f] transition-colors"><Send size={13} /></button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="px-8 py-4 border-b border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] flex items-center justify-between shrink-0 bg-white dark:bg-[#1E293B]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1e7a34]/10 text-[#1e7a34] flex items-center justify-center"><FileText size={18} /></div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-sm">{activeRepNotice.title}</h3>
                  <p className="text-[9px] font-bold text-[#1e7a34] uppercase">Liaison Notice • {activeRepNotice.date}</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#f7f6fb] dark:bg-[#0F172A]">
              <div className="bg-white dark:bg-[#1E293B] border border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Publication Status:</span>
                  <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase ${
                    activeRepNotice.isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-[#1e7a34]/10 text-[#1e7a34]'
                  }`}>{activeRepNotice.isApproved ? 'Faculty Verified' : 'Awaiting Faculty Approval'}</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-[#94A3B8] font-semibold">{activeRepNotice.desc}</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Panel 3: Rep Profile & resolution stats */}
      <aside className="w-72 bg-white dark:bg-[#1E293B] border-l border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] p-5 flex flex-col gap-5 shrink-0 h-full overflow-y-auto">
        <div 
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center text-center bg-gradient-to-b from-[#f0f7f2] to-white dark:from-[#1a2d1f] dark:to-[#111a13] rounded-2xl p-5 border border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] cursor-pointer hover:opacity-90 transition-all"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1e7a34] to-[#3ea556] flex items-center justify-center text-white text-xl font-black border-4 border-white dark:border-[#111a13] shadow-md shadow-[#1e7a34]/20 select-none">
              {(user?.firstName?.[0] || 'A')}{(user?.lastName?.[0] || 'D')}
            </div>
            <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-[#111a13]"></span>
          </div>
          <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-sm mt-3">
            {user?.firstName || 'Arthur'} {user?.lastName || 'Dent'}
          </h3>
          <p className="text-[10px] font-bold text-[#1e7a34] uppercase tracking-widest">Course Representative</p>
          {user?.studentId && (
            <p className="text-[9px] text-slate-400 font-bold mt-0.5">ID: {user.studentId}</p>
          )}
        </div>

        {/* Issue stats */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          <div className="bg-[#f0f7f2] dark:bg-[#1F2937] border border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] rounded-2xl p-3 text-center">
            <p className="text-[9px] font-bold text-[#1e7a34]/60 uppercase">Class Size</p>
            <p className="text-base font-black text-[#1e7a34] mt-0.5">48</p>
          </div>
          <div className="bg-[#f0f7f2] dark:bg-[#1F2937] border border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] rounded-2xl p-3 text-center">
            <p className="text-[9px] font-bold text-[#1e7a34]/60 uppercase">Open Issues</p>
            <p className="text-base font-black text-[#1e7a34] mt-0.5">{repIssues.filter(i => i.status !== 'Resolved').length}</p>
          </div>
        </div>

        {/* Resolution rate */}
        <div className="bg-[#f0f7f2] dark:bg-[#1F2937] border border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] rounded-2xl p-4 shrink-0 space-y-3">
          <h4 className="text-[10px] font-bold text-[#1e7a34]/60 uppercase tracking-widest flex items-center gap-1.5">
            <CheckCircle size={12} className="text-[#1e7a34]" />
            <span>Ticket Resolution Rate</span>
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-500 dark:text-[#94A3B8]">Weekly Target</span>
              <span className="text-[#1e7a34]">92% Resolved</span>
            </div>
            <div className="w-full bg-[#d6eedd] dark:bg-[#1e3827] rounded-full h-2">
              <div className="bg-[#1e7a34] h-2 rounded-full" style={{ width: '92%' }}></div>
            </div>
          </div>
        </div>

        {/* Liaison Schedule */}
        <div className="space-y-3 shrink-0">
          <h4 className="text-[10px] font-bold text-[#1e7a34]/60 uppercase tracking-widest px-1">Liaison Schedule</h4>
          <div className="space-y-2">
            {[
              { title: 'Dean Meeting Liaison', time: '10:00 AM • Room A' },
              { title: 'Notice Review with Dr. Jenkins', time: '2:00 PM • Block C' }
            ].map((evt, idx) => (
              <div 
                key={idx}
                onClick={() => navigate('/schedule')}
                className="flex items-center gap-3 p-3 bg-[#f0f7f2] dark:bg-[#1F2937] border border-[#d6eedd] dark:border-[rgba(255,255,255,0.18)] rounded-2xl cursor-pointer hover:border-[#1e7a34]/40 transition-all hover:scale-[1.01]"
              >
                <div className="w-8 h-8 rounded-lg bg-[#1e7a34]/10 flex items-center justify-center text-[#1e7a34] shrink-0"><Clock size={14} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-[#CBD5E1] truncate">{evt.title}</p>
                  <p className="text-[9px] text-[#1e7a34]/60 font-semibold">{evt.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );

  // Dynamic dashboard routing based on UserRole
  if (user?.role === UserRole.Lecturer) return renderLecturer();
  if (user?.role === UserRole.ClassRepresentative) return renderRep();
  return renderStudent();
};

export default DashboardPage;
