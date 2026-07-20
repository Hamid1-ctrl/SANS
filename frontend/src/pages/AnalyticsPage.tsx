import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { 
  ShieldAlert,
  BarChart3,
  CalendarDays
} from 'lucide-react';

const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();

  // Strict Permission Check: Lecturer Only
  const isLecturer = user?.role === UserRole.Lecturer;

  if (!isLecturer) {
    return (
      <div className="p-8 h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="w-full max-w-md bg-white dark:bg-[#191624] border border-red-200/25 rounded-[2.5rem] p-8 text-center shadow-large space-y-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-655 mx-auto">
            <ShieldAlert size={24} />
          </div>
          <h2 className="text-lg font-black text-slate-800">Access Denied</h2>
          <p className="text-xs text-slate-455 font-semibold leading-relaxed">
            You do not have administrative permission parameters to access course analytical logs. This section is strictly reserved for lecturing faculty.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 h-[calc(100vh-64px)] overflow-y-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
          Performance Analytics
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          Monitor average student performance indicators and submission rates.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Core KPIs row */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-2xl p-5 shadow-soft">
            <span className="text-[9px] font-bold text-slate-400 uppercase">Average Grade</span>
            <p className="text-2xl font-black text-brand-primary mt-1">A- (88%)</p>
          </div>
          <div className="bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-2xl p-5 shadow-soft">
            <span className="text-[9px] font-bold text-slate-400 uppercase">Submission Rate</span>
            <p className="text-2xl font-black text-brand-primary mt-1">94.2%</p>
          </div>
          <div className="bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-2xl p-5 shadow-soft">
            <span className="text-[9px] font-bold text-slate-400 uppercase">Total Students</span>
            <p className="text-2xl font-black text-brand-primary mt-1">102</p>
          </div>
        </div>

        {/* Panel 1: Grades Distribution chart mockup using pure HTML & SVGs */}
        <div className="lg:col-span-2 bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2.5rem] p-6 shadow-soft space-y-4">
          <h2 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 size={16} className="text-brand-primary" />
            <span>Grades Distribution (CS-401)</span>
          </h2>
          
          <div className="h-48 w-full flex items-end justify-between px-4 pt-4 relative select-none">
            {/* Visual Chart Bars */}
            {[
              { label: 'A', height: '80%', count: 42 },
              { label: 'B', height: '60%', count: 32 },
              { label: 'C', height: '35%', count: 18 },
              { label: 'D', height: '15%', count: 8 },
              { label: 'F', height: '5%', count: 2 },
            ].map((bar, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2 w-12 group">
                <span className="text-[9px] font-black text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  {bar.count}
                </span>
                <div 
                  className="w-8 bg-brand-primary rounded-t-lg transition-all duration-500 shadow-sm hover:scale-[1.03]"
                  style={{ height: bar.height }}
                />
                <span className="text-xs font-bold text-slate-600">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 2: Course Participation logs */}
        <div className="bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2.5rem] p-6 shadow-soft space-y-4">
          <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <CalendarDays size={16} className="text-brand-primary" />
            <span>Activity Registry</span>
          </h3>

          <div className="space-y-4 pt-2">
            {[
              { student: 'Tricia McMillan', action: 'Submitted Lab 4', time: '12m ago' },
              { student: 'Arthur Dent', action: 'Joined CS-401 Class', time: '1h ago' },
              { student: 'Zaphod Beeblebrox', action: 'Viewed Lecture Notes', time: '3h ago' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 text-xs font-semibold">
                <div className="w-2 h-2 rounded-full bg-brand-primary mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 truncate">{item.student} <span className="font-medium text-slate-500">{item.action}</span></p>
                  <p className="text-[9px] text-slate-400 mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AnalyticsPage;
