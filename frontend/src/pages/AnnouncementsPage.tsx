import React, { useState } from 'react';
import { Search, Plus, Calendar, Edit, Trash2, Paperclip, Send, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

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
  comments: Array<{
    id: number;
    sender: 'me' | 'them';
    senderName: string;
    text: string;
    time: string;
  }>;
}
const AnnouncementsPage: React.FC = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedItemId, setSelectedItemId] = useState<number>(1);
  const [commentInput, setCommentInput] = useState('');

  const [announcements, setBulletins] = useState<Announcement[]>([
    {
      id: 1,
      title: 'Exam Schedule Fall Semester Released',
      desc: 'The complete final exam schedule has been updated. Please inspect your exam locations and verify conflicts with your class representatives before Friday. Be sure to check the room numbers.',
      category: 'Exam',
      course: 'Computer Science 101',
      sender: 'Dr. Sarah Jenkins',
      senderRole: 'Chief Invigilator',
      senderAvatar: 'SJ',
      date: 'July 02, 2026',
      unread: true,
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
      date: 'July 01, 2026',
      unread: false,
      comments: []
    },
    {
      id: 3,
      title: 'Assignment #4 Deadline Extended',
      desc: 'Due to scheduled network portal maintenance this weekend, the deadline for submitting database design schemas has been extended by 48 hours.',
      category: 'Academic',
      course: 'Software Engineering',
      sender: 'Prof. Mark Sanders',
      senderRole: 'Course Convener',
      senderAvatar: 'MS',
      date: 'June 30, 2026',
      unread: false,
      comments: []
    },
    {
      id: 4,
      title: 'Laboratory Maintenance Notice',
      desc: 'Computer Lab 3 will be closed for system updates and cabling this Thursday from 8:00 AM to 1:00 PM.',
      category: 'Facility',
      course: 'General Info',
      sender: 'System Admin',
      senderRole: 'Support Coordinator',
      senderAvatar: 'SA',
      date: 'June 28, 2026',
      unread: false,
      comments: []
    }
  ]);

  const activeAnnouncement = announcements.find(a => a.id === selectedItemId) || announcements[0];

  const handleCreateAnnouncement = () => {
    const title = window.prompt("Enter Announcement Title:");
    if (!title) return;
    const desc = window.prompt("Enter Announcement Description:");
    if (!desc) return;
    
    const newAnn: Announcement = {
      id: announcements.length + 1,
      title: title,
      desc: desc,
      category: 'Academic',
      course: 'General Info',
      sender: user ? `${user.firstName} ${user.lastName}` : 'System Admin',
      senderRole: user?.role === UserRole.Lecturer ? 'Lecturer' : 'Class Rep',
      senderAvatar: user?.firstName?.[0] || 'A',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      unread: true,
      comments: []
    };
    setBulletins([newAnn, ...announcements]);
    setSelectedItemId(newAnn.id);
  };

  const handleEditAnnouncement = (id: number) => {
    const target = announcements.find(a => a.id === id);
    if (!target) return;
    const newTitle = window.prompt("Edit Title:", target.title);
    const newDesc = window.prompt("Edit Description:", target.desc);
    if (newTitle !== null && newDesc !== null) {
      setBulletins(announcements.map(a => a.id === id ? { ...a, title: newTitle, desc: newDesc } : a));
    }
  };

  const handleDeleteAnnouncement = (id: number) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    const filtered = announcements.filter(a => a.id !== id);
    setBulletins(filtered);
    if (filtered.length > 0) {
      setSelectedItemId(filtered[0].id);
    }
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    const updated = announcements.map(a => {
      if (a.id === activeAnnouncement.id) {
        return {
          ...a,
          comments: [
            ...a.comments,
            {
              id: a.comments.length + 1,
              sender: 'me' as const,
              senderName: 'Me',
              text: commentInput,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]
        };
      }
      return a;
    });

    setBulletins(updated);
    setCommentInput('');
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      
      {/* PANEL 1: Bulletins List Column */}
      <aside className="w-80 bg-transparent border-r border-[#ece8f3] dark:border-slate-800/40 p-6 flex flex-col shrink-0 h-full overflow-y-auto">
        <div className="mb-4">
          <h2 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg mb-3">
            Bulletins
          </h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Search bulletins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 focus:outline-none focus:border-brand-green/40"
            />
            <Search className="absolute left-3.5 top-3 text-slate-400" size={14} />
          </div>
        </div>

        {/* Filters and Release */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-1">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-extrabold text-slate-700 dark:text-slate-350 focus:outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="exam">Exams</option>
              <option value="lecture">Lectures</option>
              <option value="academic">Academic</option>
              <option value="facility">Facilities</option>
            </select>
            <ChevronDown size={12} className="text-slate-500" />
          </div>
          
          {user?.role !== UserRole.Student && (
            <button 
              onClick={handleCreateAnnouncement}
              className="w-8 h-8 rounded-full bg-brand-green text-white flex items-center justify-center shadow-md shadow-brand-green/20 hover:scale-[1.03] transition-transform active:scale-[0.97] cursor-pointer"
              title="Post Announcement"
            >
              <Plus size={16} />
            </button>
          )}
        </div>

        {/* List of cards */}
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {announcements.map((item) => {
            const isSelected = item.id === selectedItemId;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedItemId(item.id)}
                className={`p-4 rounded-[1.5rem] cursor-pointer transition-all duration-300 border ${
                  isSelected
                    ? 'bg-white dark:bg-[#1a1726] border-[#ece8f3]/80 dark:border-slate-800/40 shadow-soft'
                    : 'border-transparent bg-transparent hover:bg-white/40 dark:hover:bg-slate-900/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#f1edf7] dark:bg-slate-800 shrink-0 flex items-center justify-center text-brand-green font-bold text-xs">
                    {item.senderAvatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {item.sender}
                      </h4>
                      <span className="text-[9px] text-slate-455 font-bold shrink-0">{item.date.split(',')[1] || item.date}</span>
                    </div>
                    <p className="text-xs font-black text-slate-750 dark:text-slate-105 truncate mt-1">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-455 dark:text-slate-400 truncate mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* PANEL 2: Middle Bulletins details view */}
      <section className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white/45 dark:bg-slate-900/10">
        <div className="flex flex-col h-full overflow-hidden">
          
          {/* Header */}
          <div className="px-8 py-5 border-b border-[#ece8f3]/80 dark:border-slate-800/30 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-green text-white font-extrabold flex items-center justify-center text-sm shadow-sm">
                {activeAnnouncement.senderAvatar}
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-sm">
                  {activeAnnouncement.sender}
                </h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                  {activeAnnouncement.senderRole} • {activeAnnouncement.course}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-brand-green-light dark:bg-slate-800/40 text-brand-green dark:text-brand-green-medium text-[10px] font-extrabold rounded-full uppercase tracking-wider">
                {activeAnnouncement.category}
              </span>
            </div>
          </div>

          {/* Full content */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            <div className="bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-[1.5rem] p-6 shadow-soft space-y-4">
              <div className="flex justify-between items-start">
                <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 leading-snug">
                  {activeAnnouncement.title}
                </h2>
                
                {/* Actions */}
                {user?.role !== UserRole.Student && (
                  <div className="flex items-center gap-1.5 shrink-0 ml-4">
                    <button 
                      onClick={() => handleEditAnnouncement(activeAnnouncement.id)}
                      className="p-2 border border-[#ece8f3] dark:border-slate-800/40 text-slate-500 hover:text-brand-green hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                      title="Edit Announcement"
                    >
                      <Edit size={14} />
                    </button>
                    <button 
                      onClick={() => handleDeleteAnnouncement(activeAnnouncement.id)}
                      className="p-2 border border-[#ece8f3] dark:border-slate-800/40 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                      title="Delete Announcement"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-455 dark:text-slate-400 font-semibold">
                <Calendar size={13} />
                <span>Posted on {activeAnnouncement.date}</span>
              </div>

              <p className="text-xs leading-relaxed text-slate-650 dark:text-slate-355 font-medium pt-2 border-t border-slate-100 dark:border-slate-800/40">
                {activeAnnouncement.desc}
              </p>
            </div>

            {/* QA Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-455">
                  Discussion comments
                </span>
                <div className="h-px bg-slate-150 dark:bg-slate-800 flex-1" />
              </div>

              {activeAnnouncement.comments.length === 0 ? (
                <p className="text-[11px] text-slate-400 font-medium text-center py-4">
                  No replies posted. Be the first to start the discussion!
                </p>
              ) : (
                activeAnnouncement.comments.map((comment) => {
                  const isMe = comment.sender === 'me';
                  return (
                    <div key={comment.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[70%] space-y-1">
                        <div className={`px-4.5 py-3.5 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm ${
                          isMe 
                            ? 'bg-brand-green text-white rounded-tr-none shadow-brand-green/10' 
                            : 'bg-white dark:bg-[#1a1726] text-slate-800 dark:text-slate-205 rounded-tl-none border border-[#ece8f3] dark:border-slate-800/40'
                        }`}>
                          <p className={`text-[9px] font-bold ${isMe ? 'text-white/80' : 'text-brand-green dark:text-brand-green-medium'} mb-1`}>
                            {comment.senderName}
                          </p>
                          <p>{comment.text}</p>
                        </div>
                        <p className={`text-[9px] text-slate-400 font-bold px-1 ${isMe ? 'text-right' : 'text-left'}`}>
                          {comment.time}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* QA Thread Input */}
          <form onSubmit={handlePostComment} className="p-4 border-t border-[#ece8f3]/80 dark:border-slate-800/30 flex items-center gap-3.5 bg-white/50 dark:bg-slate-900/10 shrink-0">
            <button type="button" className="p-2 text-slate-400 hover:text-slate-650 rounded-xl">
              <Paperclip size={16} />
            </button>
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 px-4.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 text-slate-850 dark:text-slate-105 border border-transparent focus:outline-none focus:border-brand-green/30 transition-all font-semibold"
            />
            <button
              type="submit"
              className="p-3 bg-brand-green text-white rounded-xl shadow-md shadow-brand-green/20 hover:bg-brand-green/90 transition-all active:scale-[0.96]"
            >
              <Send size={13} />
            </button>
          </form>

        </div>
      </section>

    </div>
  );
};

export default AnnouncementsPage;
