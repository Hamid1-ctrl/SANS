import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Send, 
  Paperclip, 
  MoreVertical, 
  Phone, 
  Video, 
  MessageSquare, 
  Play, 
  ChevronDown, 
  ChevronRight,
  FileText
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMessages } from '../hooks/useMessages';

interface ChatUser {
  id: number;
  name: string;
  role: string;
  avatarText: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  gradient: string;
  phone: string;
  email: string;
  stat1Label: string;
  stat1Value: string;
  stat2Label: string;
  stat2Value: string;
}

const MessagesPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { data: apiMessages } = useMessages();

  const [selectedUser, setSelectedUser] = useState<number | null>(1);
  const [messageInput, setMessageInput] = useState('');
  const [activeSegment, setActiveSegment] = useState<'chats' | 'groups'>('chats');

  // If API messages are available, use them
  useEffect(() => {
    if (apiMessages && apiMessages.length > 0) {
      const apiFormatted = apiMessages.map((msg, idx) => ({
        id: idx + 1,
        sender: msg.senderId === currentUser?.id ? 'me' as const : 'them' as const,
        text: msg.content,
        time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'text' as const
      }));
      if (apiFormatted.length > 0) {
        setChatMessages(apiFormatted);
      }
    }
  }, [apiMessages, currentUser]);

  const users: ChatUser[] = [
    {
      id: 1,
      name: 'Dr. Sarah Jenkins',
      role: 'Instructor',
      avatarText: 'SJ',
      lastMessage: 'Let me inspect your database normal forms first.',
      time: '10:32 AM',
      unread: 2,
      online: true,
      gradient: 'from-[#85cd2a] to-[#a2e048]',
      phone: '+1 (555) 234-5678',
      email: 's.jenkins@sans.edu',
      stat1Label: 'Office',
      stat1Value: 'Room 402',
      stat2Label: 'Designation',
      stat2Value: 'PhD, AI'
    },
    {
      id: 2,
      name: 'Class Rep: Arthur Dent',
      role: 'Student Rep',
      avatarText: 'AD',
      lastMessage: 'Did you submit the lab report for security audit?',
      time: 'Yesterday',
      unread: 0,
      online: true,
      gradient: 'from-emerald-500 to-teal-650',
      phone: '+1 (555) 987-6543',
      email: 'a.dent@sans.edu',
      stat1Label: 'Attendance',
      stat1Value: '98%',
      stat2Label: 'Credits',
      stat2Value: '18'
    },
    {
      id: 3,
      name: 'Heimaux (Professor)',
      role: 'Dean',
      avatarText: 'HP',
      lastMessage: 'The curriculum revision is scheduled for next Monday.',
      time: 'June 29',
      unread: 0,
      online: false,
      gradient: 'from-purple-500 to-rose-500',
      phone: '+1 (555) 432-1098',
      email: 'h.dean@sans.edu',
      stat1Label: 'Department',
      stat1Value: 'CS/SE',
      stat2Label: 'Tenure',
      stat2Value: '8 Years'
    },
    {
      id: 4,
      name: 'Zaphod Beeblebrox',
      role: 'Peer',
      avatarText: 'ZB',
      lastMessage: 'Can I copy your React Tailwind config setup file?',
      time: 'June 24',
      unread: 0,
      online: false,
      gradient: 'from-orange-550 to-red-655',
      phone: '+1 (555) 876-5432',
      email: 'z.beeble@sans.edu',
      stat1Label: 'Registered Credits',
      stat1Value: '16',
      stat2Label: 'Attendance',
      stat2Value: '81%'
    }
  ];

  const activeUser = users.find(u => u.id === selectedUser);

  const mockMessages = [
    { id: 1, sender: 'them', text: 'Hello! I checked your proposed schema for the school database.', time: '10:28 AM', type: 'text' },
    { id: 2, sender: 'them', text: 'It looks good, but you need to make sure the StudentID is set as a foreign key in enrollment schemas.', time: '10:29 AM', type: 'text' },
    { id: 3, sender: 'me', text: 'Thanks Dr. Jenkins! I have updated that structure. Should I upload the revised documentation to the Files tab?', time: '10:31 AM', type: 'text' },
    { id: 4, sender: 'them', text: 'Let me inspect your database normal forms first.', time: '10:32 AM', type: 'text' },
    { id: 5, sender: 'them', text: 'audio_message_placeholder', time: '10:33 AM', type: 'audio' }
  ];

  const [chatMessages, setChatMessages] = useState(mockMessages);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    setChatMessages([
      ...chatMessages,
      {
        id: chatMessages.length + 1,
        sender: 'me' as const,
        text: messageInput,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'text' as const
      }
    ]);
    setMessageInput('');
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      
      {/* PANEL 1: Left Chat Users List Column */}
      <aside className="w-80 bg-transparent border-r border-[#ece8f3] dark:border-slate-800/40 p-6 flex flex-col shrink-0 h-full overflow-y-auto">
        {/* Switcher segmented tabs */}
        <div className="bg-[#ece8f3] dark:bg-[#1f1a2e] rounded-xl p-1 flex mb-6">
          <button
            onClick={() => setActiveSegment('chats')}
            className={`flex-1 text-center py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeSegment === 'chats'
                ? 'bg-white dark:bg-[#2c263f] text-brand-green dark:text-brand-green-medium shadow-sm'
                : 'text-slate-505 hover:text-slate-700'
            }`}
          >
            Chats
          </button>
          <button
            onClick={() => setActiveSegment('groups')}
            className={`flex-1 text-center py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeSegment === 'groups'
                ? 'bg-white dark:bg-[#2c263f] text-brand-green dark:text-brand-green-medium shadow-sm'
                : 'text-slate-550 hover:text-slate-700'
            }`}
          >
            Channels
          </button>
        </div>

        {/* Dropdown sort & Release button */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-1 text-xs font-extrabold text-slate-700 dark:text-slate-350 cursor-pointer">
            <span>Latest First</span>
            <ChevronDown size={14} />
          </div>
          <button className="w-8 h-8 rounded-full bg-brand-green text-white flex items-center justify-center shadow-md shadow-brand-green/20 hover:scale-[1.03] transition-transform active:scale-[0.97]">
            <Plus size={16} />
          </button>
        </div>

        {/* Users list */}
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {users.map((item) => {
            const isSelected = item.id === selectedUser;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedUser(item.id)}
                className={`p-4 rounded-[1.5rem] cursor-pointer transition-all duration-300 border ${
                  isSelected
                    ? 'bg-white dark:bg-[#1a1726] border-[#ece8f3]/80 dark:border-slate-800/40 shadow-soft'
                    : 'border-transparent bg-transparent hover:bg-white/40 dark:hover:bg-slate-900/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
                      {item.avatarText}
                    </div>
                    {item.online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {item.name}
                      </h4>
                      <span className="text-[9px] text-slate-455 font-bold shrink-0">{item.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-455 dark:text-slate-400 truncate mt-1">
                      {item.lastMessage}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* PANEL 2: Middle Chat Message Timeline Pane */}
      <section className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white/45 dark:bg-slate-900/10">
        {activeUser ? (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header info */}
            <div className="px-8 py-5 border-b border-[#ece8f3]/80 dark:border-slate-800/30 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${activeUser.gradient} flex items-center justify-center text-white text-sm font-bold shadow-sm`}>
                  {activeUser.avatarText}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-sm">
                    {activeUser.name}
                  </h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                    {activeUser.role} • {activeUser.online ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-slate-455">
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                  <Phone size={15} />
                </button>
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                  <Video size={15} />
                </button>
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                  <MoreVertical size={15} />
                </button>
              </div>
            </div>

            {/* Chat list timeline */}
            <div className="flex-1 overflow-y-auto p-8 space-y-5">
              {chatMessages.map((msg) => {
                const isMe = msg.sender === 'me';
                
                if (msg.type === 'audio') {
                  return (
                    <div key={msg.id} className="flex justify-start">
                      <div className="max-w-[70%] space-y-1">
                        {/* Audio Player Capsule */}
                        <div className="bg-white dark:bg-[#1a1726] border border-[#ece8f3] dark:border-slate-800/40 rounded-2xl p-3 flex items-center gap-4 shadow-sm">
                          <button className="w-8 h-8 rounded-full bg-brand-green text-white flex items-center justify-center shrink-0">
                            <Play size={12} fill="white" className="translate-x-0.5" />
                          </button>
                          
                          {/* Audio waveform rendering */}
                          <div className="flex items-center gap-0.5 shrink-0 select-none">
                            {[2, 4, 3, 5, 2, 7, 4, 3, 5, 2, 6, 8, 4, 2, 5, 3, 4, 2, 6, 4].map((h, i) => (
                              <div 
                                key={i} 
                                className="w-0.75 bg-brand-green rounded-full" 
                                style={{ height: `${h * 3}px` }} 
                              />
                            ))}
                          </div>
                          
                          <span className="text-[10px] text-slate-455 font-bold shrink-0">01:24</span>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold px-1">{msg.time}</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[70%] space-y-1">
                      <div className={`px-4.5 py-3.5 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm ${
                        isMe 
                          ? 'bg-brand-green text-white rounded-tr-none shadow-brand-green/10' 
                          : 'bg-white dark:bg-[#1a1726] text-slate-800 dark:text-slate-205 rounded-tl-none border border-[#ece8f3] dark:border-slate-800/40'
                      }`}>
                        <p>{msg.text}</p>
                      </div>
                      <p className={`text-[9px] text-slate-400 font-bold px-1 ${isMe ? 'text-right' : 'text-left'}`}>
                        {msg.time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Message input area */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-[#ece8f3]/80 dark:border-slate-800/30 flex items-center gap-3.5 bg-white/50 dark:bg-slate-900/10 shrink-0">
              <button type="button" className="p-2 text-slate-400 hover:text-slate-650 rounded-xl">
                <Paperclip size={16} />
              </button>
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Write a message..."
                className="flex-1 px-4.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-105 border border-transparent focus:outline-none focus:border-brand-green/30 transition-all font-semibold"
              />
              <button
                type="submit"
                className="p-3 bg-brand-green text-white rounded-xl shadow-md shadow-brand-green/20 hover:bg-brand-green/90 transition-all active:scale-[0.96]"
              >
                <Send size={13} />
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#f1edf7] flex items-center justify-center text-brand-green">
              <MessageSquare size={28} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-850">Select a Conversation</h3>
              <p className="text-xs text-slate-455 font-medium max-w-sm mt-1">
                Choose an instructor or teammate to check course work and review tasks.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* PANEL 3: Right User Profile Detail widget Column */}
      <aside className="w-80 bg-transparent border-l border-[#ece8f3] dark:border-slate-800/40 p-6 flex flex-col gap-6 shrink-0 h-full overflow-y-auto">
        {activeUser ? (
          <div className="space-y-6">
            
            {/* Header info */}
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${activeUser.gradient} flex items-center justify-center text-white text-2xl font-black border-4 border-white dark:border-slate-850 shadow-md shadow-brand-green/10 select-none`}>
                  {activeUser.avatarText}
                </div>
                {activeUser.online && (
                  <span className="absolute bottom-0 right-0 w-4.5 h-4.5 bg-emerald-500 rounded-full border-4 border-white dark:border-slate-850"></span>
                )}
              </div>

              <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-base mt-3">
                {activeUser.name}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {activeUser.role} • ID {activeUser.id * 1234}
              </p>
            </div>

            {/* Stat grids inside outlined boxes */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-[#ece8f3] dark:border-slate-800/40 rounded-2xl p-4 text-center bg-white dark:bg-[#191624]">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{activeUser.stat1Label}</p>
                <p className="text-xs font-black text-slate-755 dark:text-slate-200 mt-1">{activeUser.stat1Value}</p>
              </div>
              <div className="border border-[#ece8f3] dark:border-slate-800/40 rounded-2xl p-4 text-center bg-white dark:bg-[#191624]">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{activeUser.stat2Label}</p>
                <p className="text-xs font-black text-slate-755 dark:text-slate-200 mt-1">{activeUser.stat2Value}</p>
              </div>
            </div>

            {/* Profile fields details */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/40 text-xs font-semibold text-slate-655 dark:text-slate-350">
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Phone:</span>
                <span>{activeUser.phone}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Email:</span>
                <span>{activeUser.email}</span>
              </div>
            </div>

            {/* Icon lists with green bullets */}
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/40">
              <h4 className="text-[10px] font-bold text-slate-455 uppercase tracking-widest px-1">
                Contact Card Features
              </h4>
              
              <div className="space-y-2">
                <button className="w-full flex items-center justify-between p-3 rounded-2xl border border-[#ece8f3] dark:border-slate-800/40 bg-white dark:bg-[#191624] hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all text-left">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 bg-brand-green rounded-full shadow-sm" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Office Timetable</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-400" />
                </button>
                
                <button className="w-full flex items-center justify-between p-3 rounded-2xl border border-[#ece8f3] dark:border-slate-800/40 bg-white dark:bg-[#191624] hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all text-left">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 bg-brand-green rounded-full shadow-sm" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Assigned Courses</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-400" />
                </button>
              </div>
            </div>

            {/* Grid attachments list */}
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/40">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-bold text-slate-455 uppercase tracking-widest">Shared Files</span>
                <button className="text-[9px] font-bold text-brand-green hover:underline">See all</button>
              </div>

              <div className="grid grid-cols-3 gap-2 select-none">
                {[1, 2, 3].map((idx) => (
                  <div key={idx} className="aspect-square bg-[#f1edf7] dark:bg-slate-900/60 rounded-xl flex flex-col items-center justify-center p-2 text-brand-green border border-dashed border-brand-green/20 cursor-pointer hover:bg-[#ece8f3] transition-all">
                    <FileText size={16} />
                    <span className="text-[8px] font-bold uppercase mt-1">DOC #{idx}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : null}
      </aside>

    </div>
  );
};

export default MessagesPage;
