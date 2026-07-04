import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
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
  UserCheck
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

  // Shared state
  const [commentInput, setCommentInput] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showJoinToast, setShowJoinToast] = useState(false);

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
    if (!commentInput.trim()) return;

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
    if (!joinCode.trim()) return;
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
    if (!commentInput.trim()) return;

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
  // RENDER STUDENT
  // ==========================================
  const renderStudent = () => (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Panel 1: Bulletins List (Search & Bookmarks filter) */}
      <aside className="w-80 bg-transparent border-r border-[#ece8f3] dark:border-slate-800/40 p-6 flex flex-col shrink-0 h-full overflow-y-auto">
        <div className="mb-4 space-y-3">
          <h2 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg">
            Announcements
          </h2>
          
          {/* Search box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search news..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white dark:bg-[#1a1726] text-slate-800 dark:text-slate-200 border border-[#ece8f3] dark:border-slate-800 focus:outline-none focus:border-brand-primary/40 shadow-sm"
            />
            <Search className="absolute left-3 top-2.5 text-slate-400" size={13} />
          </div>

          {/* Bookmarks toggle switcher */}
          <button
            onClick={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all border ${
              showBookmarkedOnly 
                ? 'bg-brand-primary-light border-brand-primary/10 text-brand-primary' 
                : 'bg-white dark:bg-[#191624] border-[#ece8f3] dark:border-slate-800 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <BookmarkCheck size={13} />
            <span>{showBookmarkedOnly ? 'Showing Bookmarked' : 'Show Bookmarked'}</span>
          </button>
        </div>

        {/* List of bulletins */}
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {filteredStudentBulletins.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 font-semibold">
              No announcements match filter.
            </div>
          ) : (
            filteredStudentBulletins.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedStudentId(item.id)}
                className={`p-4 rounded-[1.5rem] cursor-pointer transition-all duration-300 border ${
                  item.id === selectedStudentId
                    ? 'bg-white dark:bg-[#1a1726] border-brand-primary/10 shadow-soft'
                    : 'border-transparent bg-transparent hover:bg-white/40 dark:hover:bg-slate-900/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#f1edf7] dark:bg-slate-800 shrink-0 flex items-center justify-center text-brand-primary font-bold text-xs">
                    {item.senderAvatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{item.sender}</h4>
                      <span className="text-[9px] text-slate-400 font-bold shrink-0">{item.date}</span>
                    </div>
                    <p className="text-xs font-black text-slate-750 dark:text-slate-105 truncate mt-1">{item.title}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="px-2 py-0.5 bg-brand-primary-light text-brand-primary text-[8px] font-extrabold rounded-md uppercase">
                        {item.category}
                      </span>
                      {item.isBookmarked && <Bookmark size={10} className="text-brand-primary fill-brand-primary" />}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Panel 2: Detail Q&A Thread (Comment input & bookmarks toggle) */}
      <section className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white/45 dark:bg-slate-900/10">
        <div className="flex flex-col h-full overflow-hidden">
          
          {/* Detail Header */}
          <div className="px-8 py-5 border-b border-[#ece8f3]/80 dark:border-slate-800/30 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-primary text-white font-extrabold flex items-center justify-center text-sm shadow-sm">
                {activeStudentBulletin.senderAvatar}
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-sm">{activeStudentBulletin.sender}</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                  {activeStudentBulletin.senderRole} • {activeStudentBulletin.course}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => toggleBookmark(activeStudentBulletin.id)}
                className={`p-2 border border-[#ece8f3] dark:border-slate-800 rounded-xl transition-all cursor-pointer ${
                  activeStudentBulletin.isBookmarked 
                    ? 'bg-brand-primary-light border-brand-primary/10 text-brand-primary' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Bookmark announcement"
              >
                <Bookmark size={14} className={activeStudentBulletin.isBookmarked ? 'fill-brand-primary' : ''} />
              </button>
            </div>
          </div>

          {/* Details Scroll Area */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            
            {/* Welcome & Motivational banner */}
            <div className="bg-gradient-to-br from-brand-primary to-brand-primary-medium text-white rounded-[2rem] p-6 shadow-premium relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
              <h1 className="text-xl font-black">Welcome back, Student!</h1>
              <p className="text-[10px] uppercase font-extrabold tracking-widest text-white/80 mt-1">Today's motivational focus</p>
              <p className="text-xs font-semibold mt-2.5 italic">
                "Preparation meets opportunity at the intersection of discipline and consistent execution. Keep pushing."
              </p>
            </div>

            <div className="bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-[1.5rem] p-6 shadow-soft space-y-3.5">
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">{activeStudentBulletin.title}</h2>
              <p className="text-xs leading-relaxed text-slate-605 dark:text-slate-350 font-semibold">{activeStudentBulletin.desc}</p>
            </div>

            {/* Comment discussion timeline */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Thread Discussion</span>
                <div className="h-px bg-slate-150 dark:bg-slate-800/60 flex-1" />
              </div>

              {activeStudentBulletin.comments.map((comment) => {
                const isMe = comment.sender === 'me';
                return (
                  <div key={comment.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[70%] space-y-1">
                      <div className={`px-4.5 py-3.5 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm ${
                        isMe 
                          ? 'bg-brand-primary text-white rounded-tr-none shadow-premium' 
                          : 'bg-white dark:bg-[#1a1726] text-slate-800 dark:text-slate-205 rounded-tl-none border border-[#ece8f3] dark:border-slate-800/40'
                      }`}>
                        <p className={`text-[9px] font-bold ${isMe ? 'text-white/80' : 'text-brand-primary'} mb-1`}>{comment.senderName}</p>
                        <p>{comment.text}</p>
                      </div>
                      <p className={`text-[9px] text-slate-455 font-bold px-1 ${isMe ? 'text-right' : 'text-left'}`}>{comment.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <form onSubmit={handlePostStudentComment} className="p-4 border-t border-[#ece8f3]/80 dark:border-slate-800/30 flex items-center gap-3.5 bg-white/50 dark:bg-slate-900/10 shrink-0">
            <button type="button" className="p-2 text-slate-400 hover:text-slate-655 rounded-xl"><Paperclip size={16} /></button>
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 px-4.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 text-slate-800 border border-transparent focus:outline-none focus:border-brand-primary/35 transition-all font-semibold shadow-sm"
            />
            <button type="submit" className="p-3 bg-brand-primary text-white rounded-xl shadow-premium cursor-pointer"><Send size={13} /></button>
          </form>
        </div>
      </section>

      {/* Panel 3: Right Academic Overview (Profile card, Deadlines, Join Code card) */}
      <aside className="w-80 bg-transparent border-l border-[#ece8f3] dark:border-slate-800/40 p-6 flex flex-col gap-6 shrink-0 h-full overflow-y-auto">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-primary to-brand-primary-medium flex items-center justify-center text-white text-2xl font-black border-4 border-white dark:border-slate-850 shadow-md">
              JD
            </div>
            <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-4 border-white dark:border-slate-850"></span>
          </div>
          <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-base mt-3">John Doe</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student • ID 102435</p>
        </div>

        {/* Attendance summary */}
        <div className="w-full shrink-0">
          <div className="border border-[#ece8f3] dark:border-slate-800/40 rounded-2xl p-4 text-center bg-white dark:bg-[#191624] shadow-soft">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Attendance</p>
            <p className="text-base font-black text-slate-750 dark:text-slate-200 mt-1">94.2%</p>
          </div>
        </div>

        {/* Join Class Quick Card */}
        <div className="bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-[1.5rem] p-5 shadow-soft shrink-0">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Zap size={12} className="text-brand-primary" />
            <span>Quick Join Class</span>
          </h4>
          <form onSubmit={handleJoinClass} className="space-y-3.5">
            <input
              type="text"
              placeholder="Enter Class Code (e.g. CS101)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-800 text-xs rounded-xl focus:outline-none focus:border-brand-primary font-semibold text-center uppercase shadow-sm"
            />
            <button
              type="submit"
              className="w-full py-2.5 bg-brand-primary text-white hover:bg-brand-primary/95 rounded-xl text-xs font-bold transition-all shadow-premium cursor-pointer"
            >
              Join Course
            </button>
          </form>
        </div>

        {/* Deadlines timetable widget */}
        <div className="space-y-4 shrink-0">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Upcoming Deadlines</h4>
          <div className="space-y-3">
            {assignmentsList.map(item => (
              <div 
                key={item.id} 
                onClick={() => navigate('/assignments')}
                className="flex items-center gap-3 p-3 bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-2xl shadow-soft cursor-pointer hover:border-brand-primary/20 transition-all hover:scale-[1.01]"
              >
                <div className="w-8 h-8 rounded-lg bg-brand-primary-light flex items-center justify-center text-brand-primary text-xs shrink-0"><Clock size={14} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{item.title}</p>
                  <p className="text-[9px] text-slate-400 font-semibold">{item.dueDate} • {item.course}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Toast Notification simulation */}
        {showJoinToast && (
          <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-large flex items-center gap-2 animate-bounce z-100">
            <CheckCircle size={14} className="text-emerald-500" />
            <span>Success: Joined class catalog!</span>
          </div>
        )}
      </aside>
    </div>
  );

  // ==========================================
  // LECTURER DASHBOARD
  // ==========================================
  const renderLecturer = () => (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Panel 1: Lecturer Tab switcher (My Courses / Rep Approvals) */}
      <aside className="w-80 bg-transparent border-r border-[#ece8f3] dark:border-slate-800/40 p-6 flex flex-col shrink-0 h-full overflow-y-auto">
        <div className="bg-[#ece8f3] dark:bg-[#1f1a2e] rounded-xl p-1 flex mb-6">
          <button
            onClick={() => {
              setLecturerTab('courses');
              setSelectedLecturerId(201);
            }}
            className={`flex-1 text-center py-2.5 rounded-lg text-xs font-bold transition-all ${
              lecturerTab === 'courses'
                ? 'bg-white dark:bg-[#2c263f] text-brand-primary shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            My Courses
          </button>
          <button
            onClick={() => {
              setLecturerTab('approvals');
              setSelectedLecturerId(301);
            }}
            className={`flex-1 text-center py-2.5 rounded-lg text-xs font-bold transition-all ${
              lecturerTab === 'approvals'
                ? 'bg-white dark:bg-[#2c263f] text-brand-primary shadow-sm'
                : 'text-slate-550 hover:text-slate-700'
            }`}
          >
            Rep Requests
          </button>
        </div>

        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Instructor Panels</span>
          <button 
            onClick={() => navigate('/announcements')}
            className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-premium hover:scale-[1.03] transition-transform"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {lecturerTab === 'courses' ? (
            lecturerCourses.map(item => (
              <div
                key={item.id}
                onClick={() => setSelectedLecturerId(item.id)}
                className={`p-4 rounded-[1.5rem] cursor-pointer transition-all duration-300 border ${
                  item.id === selectedLecturerId
                    ? 'bg-white dark:bg-[#1a1726] border-brand-primary/10 shadow-soft'
                    : 'border-transparent bg-transparent hover:bg-white/40 dark:hover:bg-slate-900/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-primary-light shrink-0 flex items-center justify-center text-brand-primary">
                    <BookOpen size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{item.title}</h4>
                      <span className="text-[9px] text-slate-400 font-bold shrink-0">{item.code}</span>
                    </div>
                    <p className="text-[11px] text-slate-455 mt-1">{item.students} Enrolled Students</p>
                    <p className="text-[10px] text-slate-405 mt-0.5 truncate">Next Slot: {item.nextLecture}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            repApprovals.map(item => (
              <div
                key={item.id}
                onClick={() => setSelectedLecturerId(item.id)}
                className={`p-4 rounded-[1.5rem] cursor-pointer transition-all duration-300 border ${
                  item.id === selectedLecturerId
                    ? 'bg-white dark:bg-[#1a1726] border-brand-primary/10 shadow-soft'
                    : 'border-transparent bg-transparent hover:bg-white/40 dark:hover:bg-slate-900/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#f1edf7] shrink-0 flex items-center justify-center text-brand-primary font-bold text-xs">
                    <UserCheck size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{item.rep}</h4>
                      <span className="text-[9px] text-slate-400 font-bold shrink-0">{item.time}</span>
                    </div>
                    <p className="text-xs font-black text-slate-750 dark:text-slate-105 truncate mt-1">{item.title}</p>
                    <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full mt-1.5 inline-block ${
                      item.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>{item.status}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Panel 2: Course Metrics / Approvals actions */}
      <section className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white/45 dark:bg-slate-900/10">
        {lecturerTab === 'courses' ? (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="px-8 py-5 border-b border-[#ece8f3]/80 dark:border-slate-800/30 flex items-center justify-between shrink-0 bg-white/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center"><BookOpen size={18} /></div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-sm">{activeLecturerCourse.title}</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">{activeLecturerCourse.code} • Management Console</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">

              {/* Performance Metrics & Syllabus Progress */}
              <div className="bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-[1.5rem] p-6 shadow-soft space-y-4">
                <h2 className="text-xs font-extrabold text-slate-405 uppercase tracking-widest">Enrollment & Syllabus Metrics</h2>
                
                <div className="grid grid-cols-3 gap-4 border-b border-slate-100 dark:border-slate-850 pb-4">
                  <div className="p-3 bg-slate-50/50 rounded-xl text-center shadow-sm">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">Class Attendance</span>
                    <span className="text-sm font-black text-brand-primary block mt-1">96.8%</span>
                  </div>
                  <div className="p-3 bg-slate-50/50 rounded-xl text-center shadow-sm">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">Avg Performance</span>
                    <span className="text-sm font-black text-brand-primary block mt-1">{activeLecturerCourse.avgPerformance}%</span>
                  </div>
                  <div className="p-3 bg-slate-50/50 rounded-xl text-center shadow-sm">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">Lectures Finished</span>
                    <span className="text-sm font-black text-brand-primary block mt-1">{activeLecturerCourse.lecturesHeld} / {activeLecturerCourse.totalLectures}</span>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-700">Syllabus Completion</span>
                    <span className="text-brand-primary">{activeLecturerCourse.syllabusProgress}%</span>
                  </div>
                  <div className="w-full bg-[#f1edf7] rounded-full h-1.5">
                    <div className="bg-brand-primary h-1.5 rounded-full transition-all duration-500" style={{ width: `${activeLecturerCourse.syllabusProgress}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden animate-fade-in">
            <div className="px-8 py-5 border-b border-[#ece8f3]/80 dark:border-slate-800/30 flex items-center justify-between shrink-0 bg-white/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center"><UserCheck size={16} /></div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-sm">Class Rep Request</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">From: {activeLecturerApproval.rep} • Pending Notice Approval</p>
                </div>
              </div>

              {activeLecturerApproval.status === 'Pending' && (
                <button
                  onClick={() => handleApproveNotice(activeLecturerApproval.id)}
                  className="px-4 py-2 bg-brand-primary text-white hover:bg-brand-primary/95 text-xs font-extrabold rounded-xl shadow-premium cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={13} strokeWidth={3} />
                  <span>Approve Publication</span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-[1.5rem] p-6 shadow-soft space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase">Proposed Notice Title:</h4>
                <h2 className="text-base font-black text-slate-855 leading-snug">{activeLecturerApproval.title}</h2>
                
                <p className="text-xs text-slate-655 font-semibold pt-4 border-t border-slate-100 dark:border-slate-800/40">
                  {activeLecturerApproval.desc}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Panel 3: Right Profile Panel */}
      <aside className="w-80 bg-transparent border-l border-[#ece8f3] dark:border-slate-800/40 p-6 flex flex-col gap-6 shrink-0 h-full overflow-y-auto">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-primary to-brand-primary-medium flex items-center justify-center text-white text-2xl font-black border-4 border-white dark:border-slate-850 shadow-md">
            SJ
          </div>
          <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-base mt-3">Dr. Sarah Jenkins</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Faculty Lecturer • ID LECT402</p>
        </div>

        <div className="grid grid-cols-2 gap-4 shrink-0">
          <div className="border border-[#ece8f3] dark:border-slate-800/40 rounded-2xl p-4 text-center bg-white dark:bg-[#191624] shadow-soft">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Courses</p>
            <p className="text-base font-black text-slate-755 mt-1">2</p>
          </div>
          <div className="border border-[#ece8f3] dark:border-slate-800/40 rounded-2xl p-4 text-center bg-white dark:bg-[#191624] shadow-soft">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Total Students</p>
            <p className="text-base font-black text-slate-755 mt-1">102</p>
          </div>
        </div>

        <div className="space-y-4 shrink-0">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Upcoming Lectures</h4>
          <div className="space-y-3">
            <div 
              onClick={() => navigate('/schedule')}
              className="flex items-center gap-3 p-3 bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-2xl shadow-soft cursor-pointer hover:border-brand-primary/20 transition-all hover:scale-[1.01]"
            >
              <div className="w-8 h-8 rounded-lg bg-brand-primary-light flex items-center justify-center text-brand-primary text-xs shrink-0"><Clock size={14} /></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">CS-401 Lecture Slot</p>
                <p className="text-[9px] text-slate-400 font-semibold">09:00 AM • Hall B</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );

  // ==========================================
  // RENDER COURSE REPRESENTATIVE
  // ==========================================
  const renderRep = () => (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Panel 1: Switcher (Logged Issues / Notices) */}
      <aside className="w-80 bg-transparent border-r border-[#ece8f3] dark:border-slate-800/40 p-6 flex flex-col shrink-0 h-full overflow-y-auto">
        <div className="bg-[#ece8f3] dark:bg-[#1f1a2e] rounded-xl p-1 flex mb-6">
          <button
            onClick={() => {
              setRepTab('issues');
              setSelectedRepId(401);
            }}
            className={`flex-1 text-center py-2.5 rounded-lg text-xs font-bold transition-all ${
              repTab === 'issues'
                ? 'bg-white dark:bg-[#2c263f] text-brand-primary shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Student Issues
          </button>
          <button
            onClick={() => {
              setRepTab('notices');
              setSelectedRepId(501);
            }}
            className={`flex-1 text-center py-2.5 rounded-lg text-xs font-bold transition-all ${
              repTab === 'notices'
                ? 'bg-white dark:bg-[#2c263f] text-brand-primary shadow-sm'
                : 'text-slate-550 hover:text-slate-700'
            }`}
          >
            Notices Log
          </button>
        </div>

        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Class Liaison</span>
          <button 
            onClick={handleRepPlusClick}
            className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-premium hover:scale-[1.03] transition-transform cursor-pointer"
            title="Create New Entry"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {repTab === 'issues' ? (
            repIssues.map(item => (
              <div
                key={item.id}
                onClick={() => setSelectedRepId(item.id)}
                className={`p-4 rounded-[1.5rem] cursor-pointer transition-all duration-300 border ${
                  item.id === selectedRepId
                    ? 'bg-white dark:bg-[#1a1726] border-brand-primary/10 shadow-soft'
                    : 'border-transparent bg-transparent hover:bg-white/40 dark:hover:bg-slate-900/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-primary-light shrink-0 flex items-center justify-center text-brand-primary">
                    <AlertCircle size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-850 dark:text-slate-205 truncate">{item.title}</h4>
                      <span className="text-[9px] text-slate-400 font-bold shrink-0">{item.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-455 mt-0.5 truncate">From: {item.reporter}</p>
                    <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full mt-1.5 inline-block ${
                      item.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
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
                className={`p-4 rounded-[1.5rem] cursor-pointer transition-all duration-300 border ${
                  item.id === selectedRepId
                    ? 'bg-white dark:bg-[#1a1726] border-brand-primary/10 shadow-soft'
                    : 'border-transparent bg-transparent hover:bg-white/40 dark:hover:bg-slate-900/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#f1edf7] shrink-0 flex items-center justify-center text-brand-primary">
                    <FileText size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{item.title}</h4>
                      <span className="text-[9px] text-slate-400 font-bold shrink-0">{item.date}</span>
                    </div>
                    <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full mt-1.5 inline-block ${
                      item.isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>{item.isApproved ? 'Faculty Approved' : 'Awaiting Faculty Approval'}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Panel 2: Detail issue tracking logs */}
      <section className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white/45 dark:bg-slate-900/10">
        {repTab === 'issues' ? (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="px-8 py-5 border-b border-[#ece8f3]/80 dark:border-slate-800/30 flex items-center justify-between shrink-0 bg-white/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center"><AlertCircle size={18} /></div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-sm">{activeRepIssue.title}</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Reporter: {activeRepIssue.reporter} • ID {activeRepIssue.reporterId}</p>
                </div>
              </div>

              {activeRepIssue.status !== 'Resolved' && (
                <button
                  onClick={handleCloseIssue}
                  className="px-4 py-2 bg-brand-primary text-white hover:bg-brand-primary/95 text-xs font-extrabold rounded-xl shadow-premium cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle size={13} />
                  <span>Mark Issue Resolved</span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">

              <div className="bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-[1.5rem] p-6 shadow-soft space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase">Logged Issue Details:</h4>
                <p className="text-xs leading-relaxed text-slate-800 font-semibold">{activeRepIssue.desc}</p>
              </div>

              {/* Thread logs */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Class Discussion Log</span>
                  <div className="h-px bg-slate-150 dark:bg-slate-800/60 flex-1" />
                </div>

                {activeRepIssue.comments.map(comment => {
                  const isMe = comment.sender === 'Class Rep';
                  return (
                    <div key={comment.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[70%] space-y-1">
                        <div className={`px-4.5 py-3.5 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm ${
                          isMe 
                            ? 'bg-brand-primary text-white rounded-tr-none shadow-premium' 
                            : 'bg-white dark:bg-[#1a1726] text-slate-800 dark:text-slate-205 rounded-tl-none border border-[#ece8f3] dark:border-slate-800/40'
                        }`}>
                          <p className={`text-[9px] font-bold ${isMe ? 'text-white/80' : 'text-brand-primary'} mb-1`}>{comment.sender}</p>
                          <p>{comment.text}</p>
                        </div>
                        <p className={`text-[9px] text-slate-455 font-bold px-1 ${isMe ? 'text-right' : 'text-left'}`}>{comment.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handlePostRepComment} className="p-4 border-t border-[#ece8f3]/80 dark:border-slate-800/30 flex items-center gap-3.5 bg-white/50 dark:bg-slate-900/10 shrink-0">
              <button type="button" className="p-2 text-slate-400 hover:text-slate-650 rounded-xl"><Paperclip size={16} /></button>
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Log discussion update..."
                className="flex-1 px-4.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 text-slate-800 border border-transparent focus:outline-none focus:border-brand-primary/35 transition-all font-semibold shadow-sm"
              />
              <button type="submit" className="p-3 bg-brand-primary text-white rounded-xl shadow-premium cursor-pointer"><Send size={13} /></button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden animate-fade-in">
            <div className="px-8 py-5 border-b border-[#ece8f3]/80 dark:border-slate-800/30 flex items-center justify-between shrink-0 bg-white/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-primary-light text-brand-primary flex items-center justify-center"><FileText size={18} /></div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-sm">{activeRepNotice.title}</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Liaison Notice • {activeRepNotice.date}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-[1.5rem] p-6 shadow-soft space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-850">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Publication Status:</span>
                  <span className={`text-[8px] font-extrabold px-2.5 py-1 rounded-full uppercase ${
                    activeRepNotice.isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700 font-bold'
                  }`}>{activeRepNotice.isApproved ? 'Faculty Verified' : 'Awaiting Faculty Approval'}</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-655 font-semibold">{activeRepNotice.desc}</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Panel 3: Right liaison details */}
      <aside className="w-80 bg-transparent border-l border-[#ece8f3] dark:border-slate-800/40 p-6 flex flex-col gap-6 shrink-0 h-full overflow-y-auto">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-primary to-brand-primary-medium flex items-center justify-center text-white text-2xl font-black border-4 border-white dark:border-slate-850 shadow-md">
            CR
          </div>
          <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-base mt-3">Arthur Dent</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Class Representative • ID REP102435</p>
        </div>

        <div className="grid grid-cols-2 gap-4 shrink-0">
          <div className="border border-[#ece8f3] dark:border-slate-800/40 rounded-2xl p-4 text-center bg-white dark:bg-[#191624] shadow-soft">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Class Size</p>
            <p className="text-base font-black text-slate-755 mt-1">48</p>
          </div>
          <div className="border border-[#ece8f3] dark:border-slate-800/40 rounded-2xl p-4 text-center bg-white dark:bg-[#191624] shadow-soft">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Open Issues</p>
            <p className="text-base font-black text-slate-755 mt-1">
              {repIssues.filter(i => i.status !== 'Resolved').length}
            </p>
          </div>
        </div>

        <div className="space-y-4 shrink-0">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Liaison Schedule</h4>
          <div className="space-y-3">
            <div 
              onClick={() => navigate('/meetings')}
              className="flex items-center gap-3 p-3 bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-2xl shadow-soft cursor-pointer hover:border-brand-primary/20 transition-all hover:scale-[1.01]"
            >
              <div className="w-8 h-8 rounded-lg bg-brand-primary-light flex items-center justify-center text-brand-primary text-xs shrink-0"><Clock size={14} /></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Dean Meeting Liaison</p>
                <p className="text-[9px] text-slate-400 font-semibold">10:00 AM • Room A</p>
              </div>
            </div>
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
