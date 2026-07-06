import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar, MapPin, Clock } from 'lucide-react';
import { useSchedules } from '../hooks/useSchedules';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';

interface EventDetail {
  id: number;
  title: string;
  time: string;
  type: string;
  color: string;
}

const SchedulePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: apiSchedules } = useSchedules();
  const [currentMonth] = useState('July 2026');
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  const isLecturer = user?.role === UserRole.Lecturer;

  // Build events from API schedules if available
  const buildEventsFromApi = (): Record<number, EventDetail[]> => {
    if (!apiSchedules || apiSchedules.length === 0) return {};
    
    const eventsMap: Record<number, EventDetail[]> = {};
    apiSchedules.forEach((schedule, idx) => {
      const day = new Date(schedule.startTime).getDate();
      if (!eventsMap[day]) eventsMap[day] = [];
      
      const timeStr = new Date(schedule.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      eventsMap[day].push({
        id: idx + 1,
        title: schedule.title,
        time: timeStr,
        type: 'class',
        color: ['border-brand-green bg-brand-green-light text-brand-green', 'border-amber-500 bg-amber-500/10 text-amber-700', 'border-purple-500 bg-purple-550/10 text-purple-700', 'border-emerald-500 bg-emerald-500/10 text-emerald-700', 'border-slate-500 bg-slate-500/10 text-slate-700'][idx % 5]
      });
    });
    return eventsMap;
  };

  // Schedule mock events mapping (fallback)
  const events: Record<number, EventDetail[]> = Object.keys(buildEventsFromApi()).length > 0 
    ? buildEventsFromApi()
    : {
        2: [
          { id: 1, title: 'Database Systems', time: '09:00 AM', type: 'class', color: 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300' }
        ],
        5: [
          { id: 2, title: 'Exam: Soft. Design', time: '10:00 AM', type: 'exam', color: 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-300' }
        ],
        9: [
          { id: 3, title: 'Software Engineering', time: '01:00 PM', type: 'class', color: 'border-brand-green bg-brand-green-light text-brand-green dark:text-brand-green-medium' },
          { id: 4, title: 'Lab Practice CS', time: '03:30 PM', type: 'lab', color: 'border-purple-500 bg-purple-550/10 text-purple-700 dark:text-purple-305' }
        ],
        15: [
          { id: 5, title: 'Guest: AI Future', time: '03:00 PM', type: 'event', color: 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' }
        ],
        22: [
          { id: 6, title: 'Cybersecurity Sem.', time: '11:00 AM', type: 'class', color: 'border-slate-500 bg-slate-500/10 text-slate-700 dark:text-slate-350' }
        ]
      };

  const daysInMonth = 31;
  const startOffset = 2; // Wednesday start
  const totalCells = 35;
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="p-8 space-y-6 h-[calc(100vh-64px)] overflow-y-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            Timetable
          </h1>
          <p className="text-slate-505 dark:text-slate-400 font-medium">
            Monitor course lecture slots, final examinations, and laboratory sessions.
          </p>
        </div>

        {isLecturer && (
          <button 
            onClick={() => navigate('/schedule')}
            className="flex items-center gap-2 bg-brand-green text-white px-5 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-brand-green/25 hover:bg-brand-green/95 transition-all"
          >
            <Plus size={16} />
            <span>New Timetable Entry</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* PANEL 1: Calendar Grid Card */}
        <div className="lg:col-span-3 bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2rem] shadow-soft p-8">
          
          {/* Calendar navigation controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-100 dark:border-slate-800/40">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
                {currentMonth}
              </h2>
              <div className="flex items-center gap-1 bg-[#f1edf7] dark:bg-[#12101a] rounded-xl p-1 shadow-sm">
                <button className="p-1 text-slate-655 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all">
                  <ChevronLeft size={16} />
                </button>
                <button className="p-1 text-slate-655 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* View switcher */}
            <div className="bg-[#f1edf7] dark:bg-[#12101a] rounded-xl p-1 flex text-xs font-bold text-slate-550">
              <button 
                onClick={() => setViewMode('month')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  viewMode === 'month' 
                    ? 'bg-white dark:bg-[#1a1726] text-slate-850 dark:text-slate-150 shadow-sm' 
                    : 'hover:text-slate-700'
                }`}
              >
                Month
              </button>
              <button 
                onClick={() => setViewMode('week')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  viewMode === 'week' 
                    ? 'bg-white dark:bg-[#1a1726] text-slate-850 dark:text-slate-150 shadow-sm' 
                    : 'hover:text-slate-700'
                }`}
              >
                Week
              </button>
            </div>
          </div>

          {/* Weekdays names header */}
          <div className="grid grid-cols-7 gap-3 mb-3 text-center select-none">
            {weekdays.map((day) => (
              <div key={day} className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-3">
            {Array.from({ length: totalCells }).map((_, i) => {
              const dayNumber = i - startOffset + 1;
              const isCurrentMonthDay = dayNumber > 0 && dayNumber <= daysInMonth;
              const displayDay = isCurrentMonthDay ? dayNumber : (dayNumber <= 0 ? daysInMonth + dayNumber : dayNumber - daysInMonth);
              const dayEvents = isCurrentMonthDay ? events[dayNumber] || [] : [];
              const isToday = isCurrentMonthDay && dayNumber === 2; // July 2nd today mock

              return (
                <div
                  key={i}
                  className={`min-h-[105px] border border-slate-100 dark:border-slate-800/40 rounded-2xl p-3 flex flex-col justify-between hover:border-slate-200 dark:hover:border-slate-700 transition-all ${
                    !isCurrentMonthDay ? 'opacity-30 bg-slate-50/50 dark:bg-slate-900/10' : 'bg-slate-50/20 dark:bg-slate-900/5'
                  } ${isToday ? 'ring-2 ring-brand-green bg-brand-green-light/20 dark:bg-slate-800/20 border-transparent' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isToday ? 'text-brand-green' : 'text-slate-600 dark:text-slate-400'}`}>
                      {displayDay}
                    </span>
                    {isToday && (
                      <span className="w-1.5 h-1.5 bg-brand-green rounded-full animate-pulse"></span>
                    )}
                  </div>

                  <div className="flex-1 mt-1 space-y-1 overflow-hidden max-h-[70px]">
                    {dayEvents.map((evt) => (
                      <div
                        key={evt.id}
                        title={`${evt.time} - ${evt.title}`}
                        className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border-l-2 ${evt.color} truncate cursor-pointer transition-transform hover:scale-[1.02]`}
                      >
                        <span className="hidden sm:inline opacity-75 font-normal mr-0.5">{evt.time}</span>
                        {evt.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PANEL 2: Right Sidebar Schedule info widget Column */}
        <aside className="space-y-6">
          <div className="bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2rem] shadow-soft p-6">
            <h3 className="font-extrabold text-slate-850 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Calendar size={16} className="text-brand-green" />
              <span>Today's timetable</span>
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-[#fcfbfe] dark:bg-[#12101a] border-l-4 border-amber-500 rounded-2xl border border-slate-100 dark:border-slate-800/40 shadow-sm">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
                  09:00 AM - 11:00 AM
                </p>
                <h4 className="font-bold text-slate-800 dark:text-slate-150 text-xs mt-1">
                  Database Systems Lecture
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-slate-450 dark:text-slate-400 mt-2 font-medium">
                  <MapPin size={10} />
                  <span>Lecture Hall C</span>
                  <span>•</span>
                  <span>Prof. Sanders</span>
                </div>
              </div>

              <div className="p-4 bg-[#fcfbfe] dark:bg-[#12101a] border-l-4 border-brand-green rounded-2xl border border-slate-100 dark:border-slate-800/40 shadow-sm">
                <p className="text-[10px] font-bold text-brand-green uppercase tracking-widest">
                  02:00 PM - 03:30 PM
                </p>
                <h4 className="font-bold text-slate-800 dark:text-slate-150 text-xs mt-1">
                  Software Architecture Q&A
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-slate-450 dark:text-slate-400 mt-2 font-medium">
                  <MapPin size={10} />
                  <span>Virtual Session</span>
                  <span>•</span>
                  <span>Dr. Jenkins</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2rem] p-6 shadow-soft relative overflow-hidden">
            <h3 className="font-extrabold text-xs uppercase tracking-widest text-slate-455 mb-2">
              Semester Timeline
            </h3>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-4">Week 12 of 16</p>
            <div className="w-full bg-[#f1edf7] dark:bg-slate-900 rounded-full h-1.5">
              <div className="bg-brand-green h-1.5 rounded-full" style={{ width: '75%' }}></div>
            </div>
            <p className="text-[10px] text-slate-455 mt-2 font-bold uppercase tracking-wider flex items-center gap-1">
              <Clock size={11} />
              <span>Final sub starts in 9 days.</span>
            </p>
          </div>
        </aside>

      </div>
    </div>
  );
};

export default SchedulePage;
