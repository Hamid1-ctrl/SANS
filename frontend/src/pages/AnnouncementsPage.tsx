import React, { useState } from 'react';
import { Search, Plus, Calendar, Edit, Trash2, Paperclip, Send, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAnnouncements, useCreateAnnouncement, useUpdateAnnouncement, useDeleteAnnouncement } from '../hooks/useAnnouncements';
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
  const { data: apiAnnouncements, isLoading, error } = useAnnouncements();
  const createAnnouncement = useCreateAnnouncement();
  const updateAnnouncement = useUpdateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedItemId, setSelectedItemId] = useState<number>(1);
  const [commentInput, setCommentInput] = useState('');
  const [commentError, setCommentError] = useState('');

  // Map API announcements to UI format
  const apiMapped: Announcement[] = apiAnnouncements?.map((ann, index) => ({
    id: index + 1,
    title: ann.title,
    desc: ann.content,
    category: 'Academic',
    course: 'General Info',
    sender: user ? `${user.firstName} ${user.lastName}` : 'System Admin',
    senderRole: user?.role === UserRole.Lecturer ? 'Lecturer' : 'Class Rep',
    senderAvatar: user?.firstName?.[0] || 'A',
    date: ann.publishedAt 
      ? new Date(ann.publishedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
      : new Date(ann.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    unread: false,
    comments: []
  })) || [];

  const fallbackAnnouncements: Announcement[] = [
    {
      id: 1,
      title: 'Exam Schedule Fall Semester Released',
      desc: 'The complete final examination schedule has been published. All students are required to check their exam locations and verify any schedule conflicts with class representatives by Friday. Room capacities are confirmed and seating charts will be posted in the files section.',
      category: 'Exam',
      course: 'Computer Science 101',
      sender: 'Dr. Sarah Jenkins',
      senderRole: 'Chief Invigilator',
      senderAvatar: 'SJ',
      date: '2h ago',
      unread: true,
      comments: [
        { id: 1, sender: 'them', senderName: 'Dr. Sarah Jenkins', text: 'Hello students. The final seating chart PDF has been uploaded in the files section.', time: '10:28 AM' },
        { id: 2, sender: 'me', senderName: 'Me', text: 'Thank you Dr. Jenkins! Will room 405 have extra seating for overflow students?', time: '10:34 AM' }
      ]
    },
    {
      id: 2,
      title: 'Guest Lecture: AI Trends in 2026',
      desc: 'Dr. Jenkins will present on autonomous multi-agent frameworks, tool integration patterns, and real-world AI deployment models. All senior year students are strongly encouraged to attend for their elective credit requirement.',
      category: 'Lecture',
      course: 'Artificial Intelligence',
      sender: 'Department Admin',
      senderRole: 'Administration',
      senderAvatar: 'DA',
      date: 'Yesterday',
      unread: false,
      comments: []
    },
    {
      id: 3,
      title: 'Library Resources Update — New Database Access',
      desc: 'The university library has expanded its online database subscription to include IEEE Xplore, ACM Digital Library, and Springer Computing. Students can access these resources using their university credentials through the portal.',
      category: 'Resources',
      course: 'General Info',
      sender: 'Library Services',
      senderRole: 'Administration',
      senderAvatar: 'LS',
      date: '3 days ago',
      unread: false,
      comments: []
    }
  ];

  const announcements: Announcement[] = apiMapped.length > 0 ? apiMapped : fallbackAnnouncements;

  const activeAnnouncement = announcements.find(a => a.id === selectedItemId) || announcements[0];


  const handleCreateAnnouncement = () => {
    const title = window.prompt("Enter Announcement Title:");
    if (!title) return;
    const desc = window.prompt("Enter Announcement Description:");
    if (!desc) return;
    
    createAnnouncement.mutate({
      title,
      content: desc,
      isGlobal: true,
      isPinned: false
    });
  };

  const handleEditAnnouncement = (id: number) => {
    const target = announcements.find(a => a.id === id);
    if (!target) return;
    const newTitle = window.prompt("Edit Title:", target.title);
    const newDesc = window.prompt("Edit Description:", target.desc);
    if (newTitle !== null && newDesc !== null) {
      // Find the corresponding API announcement by index
      const apiAnn = apiAnnouncements?.[id - 1];
      if (apiAnn) {
        updateAnnouncement.mutate({
          id: apiAnn.id,
          data: { title: newTitle, content: newDesc }
        });
      }
    }
  };

  const handleDeleteAnnouncement = (id: number) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    const apiAnn = apiAnnouncements?.[id - 1];
    if (apiAnn) {
      deleteAnnouncement.mutate(apiAnn.id);
    }
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) {
      setCommentError('Please enter a comment before you can proceed.');
      return;
    }
    setCommentError('');
    // Comments are not currently supported by the API
    // This is a placeholder for future implementation
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

  if (!activeAnnouncement) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl">📢</div>
          <div className="text-slate-500 dark:text-[#94A3B8] font-semibold text-sm">No announcements yet</div>
          <p className="text-slate-400 dark:text-[#94A3B8] text-xs">Check back later for updates.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      
      {/* PANEL 1: Bulletins List Column */}
      <aside className="w-80 bg-transparent border-r border-[#ece8f3] dark:border-[rgba(255,255,255,0.18)] p-6 flex flex-col shrink-0 h-full overflow-y-auto">
        <div className="mb-4">
          <h2 className="font-extrabold text-slate-800 dark:text-[#F8FAFC] text-lg mb-3">
            Bulletins
          </h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Search bulletins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-[#1F2937] text-slate-800 dark:text-[#CBD5E1] border border-slate-100 dark:border-[rgba(255,255,255,0.18)] focus:outline-none focus:border-brand-green/40"
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
                    ? 'bg-white dark:bg-[#1F2937] border-[#ece8f3]/80 dark:border-[rgba(255,255,255,0.18)] shadow-soft'
                    : 'border-transparent bg-transparent hover:bg-white/40 dark:hover:bg-slate-900/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#f1edf7] dark:bg-slate-800 shrink-0 flex items-center justify-center text-brand-green font-bold text-xs">
                    {item.senderAvatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-[#CBD5E1] truncate">
                        {item.sender}
                      </h4>
                      <span className="text-[9px] text-slate-455 font-bold shrink-0">{item.date.split(',')[1] || item.date}</span>
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
          })}
        </div>
      </aside>

      {/* PANEL 2: Middle Bulletins details view */}
      <section className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white/45 dark:bg-[#1F2937]/10">
        <div className="flex flex-col h-full overflow-hidden">
          
          {/* Header */}
          <div className="px-8 py-5 border-b border-[#ece8f3]/80 dark:border-[rgba(255,255,255,0.18)] flex items-center justify-between shrink-0">
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
            <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-[rgba(255,255,255,0.18)] rounded-[1.5rem] p-6 shadow-soft space-y-4">
              <div className="flex justify-between items-start">
                <h2 className="text-lg font-black text-slate-800 dark:text-[#F8FAFC] leading-snug">
                  {activeAnnouncement.title}
                </h2>
                
                {/* Actions */}
                {user?.role !== UserRole.Student && (
                  <div className="flex items-center gap-1.5 shrink-0 ml-4">
                    <button 
                      onClick={() => handleEditAnnouncement(activeAnnouncement.id)}
                      className="p-2 border border-[#ece8f3] dark:border-[rgba(255,255,255,0.18)] text-slate-500 hover:text-brand-green hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                      title="Edit Announcement"
                    >
                      <Edit size={14} />
                    </button>
                    <button 
                      onClick={() => handleDeleteAnnouncement(activeAnnouncement.id)}
                      className="p-2 border border-[#ece8f3] dark:border-[rgba(255,255,255,0.18)] text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                      title="Delete Announcement"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-455 dark:text-[#94A3B8] font-semibold">
                <Calendar size={13} />
                <span>Posted on {activeAnnouncement.date}</span>
              </div>

              <p className="text-xs leading-relaxed text-slate-650 dark:text-slate-355 font-medium pt-2 border-t border-slate-100 dark:border-[rgba(255,255,255,0.18)]">
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
                            : 'bg-white dark:bg-[#1F2937] text-slate-800 dark:text-slate-205 rounded-tl-none border border-[#ece8f3] dark:border-[rgba(255,255,255,0.18)]'
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
          <form onSubmit={handlePostComment} className="p-4 border-t border-[#ece8f3]/80 dark:border-[rgba(255,255,255,0.18)] flex flex-col gap-2 bg-white/50 dark:bg-[#1F2937]/10 shrink-0">
            {commentError && (
              <p className="text-[10px] font-bold text-red-500 px-1 select-none animate-pulse">
                {commentError}
              </p>
            )}
            <div className="flex items-center gap-3.5 w-full">
              <button type="button" className="p-2 text-slate-400 hover:text-slate-650 rounded-xl">
                <Paperclip size={16} />
              </button>
              <input
                type="text"
                value={commentInput}
                onChange={(e) => {
                  setCommentInput(e.target.value);
                  if (commentError) setCommentError('');
                }}
                placeholder="Ask a question..."
                className="flex-1 px-4.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-[#1F2937] text-slate-850 dark:text-slate-105 border border-transparent focus:outline-none focus:border-brand-green/30 transition-all font-semibold"
              />
              <button
                type="submit"
                className="p-3 bg-brand-green text-white rounded-xl shadow-md shadow-brand-green/20 hover:bg-brand-green/90 transition-all active:scale-[0.96] cursor-pointer"
              >
                <Send size={13} />
              </button>
            </div>
          </form>

        </div>
      </section>

    </div>
  );
};

export default AnnouncementsPage;
