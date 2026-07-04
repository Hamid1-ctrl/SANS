import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { 
  Calendar, 
  Clock, 
  Scroll, 
  Users, 
  CheckCircle2, 
  ShieldAlert, 
  ArrowRight,
  FileText
} from 'lucide-react';

interface Meeting {
  id: number;
  title: string;
  date: string;
  time: string;
  location: string;
  agenda: string;
}

interface MinuteDoc {
  id: number;
  title: string;
  date: string;
  desc: string;
}

const MeetingsPage: React.FC = () => {
  const { user } = useAuth();
  const [successMsg, setSuccessMsg] = useState('');

  // Strict Permission Check: Course Representative Only
  const isRep = user?.role === UserRole.ClassRepresentative;

  const [meetings, setMeetings] = useState<Meeting[]>([
    { id: 1, title: 'Dean Committee Session', date: 'July 11, 2026', time: '10:00 AM', location: 'Boardroom A', agenda: 'Discussing database server crash and Lab 3 terminal connectivity.' },
    { id: 2, title: 'Algorithms Study Group', date: 'July 13, 2026', time: '2:00 PM', location: 'Library Annex 2', agenda: 'Exam preparation revision and formula sheet compilation reviews.' }
  ]);

  const [minutes, setMinutes] = useState<MinuteDoc[]>([
    { id: 101, title: 'Minutes: Lab Maintenance Sync', date: 'Yesterday', desc: 'Resolved that all connectivity logs are sent to the network center coordinator. Dr. Sarah Jenkins approved study group allocations.' }
  ]);

  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newAgenda, setNewAgenda] = useState('');

  const [minuteTitle, setMinuteTitle] = useState('');
  const [minuteDesc, setMinuteDesc] = useState('');

  const handleScheduleMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate || !newTime) return;

    const newMeeting: Meeting = {
      id: meetings.length + 1,
      title: newTitle,
      date: newDate,
      time: newTime,
      location: newLocation || 'Virtual Channel',
      agenda: newAgenda
    };

    setMeetings([...meetings, newMeeting]);
    setNewTitle('');
    setNewDate('');
    setNewTime('');
    setNewLocation('');
    setNewAgenda('');
    setSuccessMsg('Success: Liaison Meeting Scheduled!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handlePostMinutes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!minuteTitle.trim() || !minuteDesc.trim()) return;

    const newDoc: MinuteDoc = {
      id: minutes.length + 1,
      title: minuteTitle,
      date: 'Today',
      desc: minuteDesc
    };

    setMinutes([...minutes, newDoc]);
    setMinuteTitle('');
    setMinuteDesc('');
    setSuccessMsg('Success: Meeting Minutes Uploaded!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  if (!isRep) {
    return (
      <div className="p-8 h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="w-full max-w-md bg-white dark:bg-[#191624] border border-red-200/25 rounded-[2.5rem] p-8 text-center shadow-large space-y-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-655 mx-auto">
            <ShieldAlert size={24} />
          </div>
          <h2 className="text-lg font-black text-slate-800">Access Denied</h2>
          <p className="text-xs text-slate-455 font-semibold leading-relaxed">
            You do not have administrative permission parameters to schedule class meetings or post minutes. This section is strictly reserved for Class Representatives.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 h-[calc(100vh-64px)] overflow-y-auto relative">
      
      {/* Toast Feedback */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-large flex items-center gap-2 animate-bounce z-100">
          <CheckCircle2 size={14} className="text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
          Meetings & Minutes
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          Schedule representative session boards, document class meeting outcomes, and compile minutes indexes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PANEL 1: Schedule Meetings Form */}
        <div className="bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2.5rem] p-6 shadow-soft space-y-4">
          <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <Calendar className="text-brand-primary" size={16} />
            <span>Schedule Liaison Session</span>
          </h2>

          <form onSubmit={handleScheduleMeeting} className="space-y-3.5">
            <div className="space-y-0.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Meeting Title</label>
              <input 
                type="text" 
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Syllabus Revision Sync"
                className="w-full px-3.5 py-2 border border-slate-205 text-xs font-semibold rounded-xl focus:outline-none focus:border-brand-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Date</label>
                <input 
                  type="date" 
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-205 text-[11px] font-semibold rounded-xl focus:outline-none focus:border-brand-primary cursor-pointer"
                />
              </div>
              <div className="space-y-0.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Time</label>
                <input 
                  type="text" 
                  placeholder="e.g. 2:00 PM"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-205 text-[11px] font-semibold rounded-xl focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>

            <div className="space-y-0.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Location</label>
              <input 
                type="text" 
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="e.g. Library Annex / Zoom"
                className="w-full px-3.5 py-2 border border-slate-205 text-xs font-semibold rounded-xl focus:outline-none focus:border-brand-primary"
              />
            </div>

            <div className="space-y-0.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Agenda Outline</label>
              <textarea 
                rows={2}
                value={newAgenda}
                onChange={(e) => setNewAgenda(e.target.value)}
                placeholder="Discussing..."
                className="w-full px-3.5 py-2 border border-slate-205 text-xs font-semibold rounded-xl focus:outline-none focus:border-brand-primary"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-brand-primary text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-premium flex items-center justify-center gap-2 cursor-pointer transition-transform"
            >
              <span>Schedule Session</span>
              <ArrowRight size={13} />
            </button>
          </form>
        </div>

        {/* PANEL 2: Meeting Minutes Logger */}
        <div className="bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2.5rem] p-6 shadow-soft space-y-4">
          <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <Scroll className="text-brand-primary" size={16} />
            <span>Document Minutes</span>
          </h2>

          <form onSubmit={handlePostMinutes} className="space-y-3.5">
            <div className="space-y-0.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Document Name</label>
              <input 
                type="text" 
                value={minuteTitle}
                onChange={(e) => setMinuteTitle(e.target.value)}
                placeholder="e.g. General Revision Assembly Minutes"
                className="w-full px-3.5 py-2 border border-slate-205 text-xs font-semibold rounded-xl focus:outline-none focus:border-brand-primary"
              />
            </div>

            <div className="space-y-0.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Outcome Outcomes / Resolutions</label>
              <textarea 
                rows={5}
                value={minuteDesc}
                onChange={(e) => setMinuteDesc(e.target.value)}
                placeholder="List resolutions..."
                className="w-full px-3.5 py-2 border border-slate-205 text-xs font-semibold rounded-xl focus:outline-none focus:border-brand-primary"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-brand-primary text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-premium flex items-center justify-center gap-2 cursor-pointer transition-transform"
            >
              <span>Upload Minutes</span>
              <ArrowRight size={13} />
            </button>
          </form>
        </div>

        {/* PANEL 3: Dynamic Sessions List & Minutes Files log */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2.5rem] p-6 shadow-soft space-y-4">
            <h3 className="text-sm font-black text-slate-850 flex items-center gap-2">
              <Users size={16} className="text-brand-primary" />
              <span>Upcoming Class Meetings</span>
            </h3>

            <div className="space-y-3 pt-2">
              {meetings.map(item => (
                <div key={item.id} className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-xs">{item.title}</h4>
                    <p className="text-[10px] text-slate-455 font-medium mt-1 italic">Agenda: {item.agenda}</p>
                  </div>
                  <div className="border-t border-slate-100 pt-3 mt-3 flex items-center justify-between text-[9px] text-slate-400 font-bold">
                    <span>{item.location}</span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      <span>{item.date} at {item.time}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2.5rem] p-6 shadow-soft space-y-4">
            <h3 className="text-sm font-black text-slate-850 flex items-center gap-2">
              <FileText size={16} className="text-brand-primary" />
              <span>Minutes Directory</span>
            </h3>

            <div className="space-y-3 pt-2">
              {minutes.map(item => (
                <div key={item.id} className="p-3 bg-slate-50/50 border border-slate-100 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <Scroll size={13} className="text-brand-primary shrink-0" />
                    <span className="text-xs font-bold text-slate-800 truncate">{item.title}</span>
                  </div>
                  <p className="text-[10px] text-slate-455 font-medium mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MeetingsPage;
