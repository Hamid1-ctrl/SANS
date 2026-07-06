import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { 
  School, 
  Users, 
  UserPlus, 
  Shield, 
  BookOpen, 
  Award,
  ChevronRight,
  ClipboardList,
  CheckCircle
} from 'lucide-react';

interface ClassInfo {
  id: string;
  name: string;
  code: string;
  lecturerName: string;
  studentsCount: number;
  taName?: string;
  attendanceRate?: string;
}

const MyClassesPage: React.FC = () => {
  const { user } = useAuth();
  const [activeClassId, setActiveClassId] = useState<string>('c1');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteEmailError, setInviteEmailError] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [classCodeError, setClassCodeError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Mock list of classes
  const [classesList, setClassesList] = useState<ClassInfo[]>([
    { id: 'c1', name: 'Artificial Intelligence', code: 'CS-401', lecturerName: 'Dr. Sarah Jenkins', studentsCount: 54, taName: 'Tricia McMillan', attendanceRate: '96.2%' },
    { id: 'c2', name: 'Database Systems', code: 'CS-302', lecturerName: 'Dr. Sarah Jenkins', studentsCount: 48, taName: 'Arthur Dent', attendanceRate: '94.8%' },
    { id: 'c3', name: 'Software Engineering', code: 'CS-405', lecturerName: 'Prof. Mark Sanders', studentsCount: 42, attendanceRate: '97.1%' }
  ]);

  const activeClass = classesList.find(c => c.id === activeClassId) || classesList[0];

  const handleJoinClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setClassCodeError('Please enter a class code before you can proceed.');
      return;
    }
    
    // Simulate successful join
    if (joinCode.toUpperCase() === 'SE206' || joinCode.toUpperCase() === 'CS101') {
      const newClass: ClassInfo = {
        id: `c${classesList.length + 1}`,
        name: joinCode.toUpperCase() === 'SE206' ? 'Advanced Coding' : 'Intro to CS',
        code: joinCode.toUpperCase(),
        lecturerName: 'Dr. Sarah Jenkins',
        studentsCount: 30,
        attendanceRate: '100%'
      };
      setClassesList(prev => [...prev, newClass]);
      setSuccessMsg(`Success: Enrolled in ${newClass.name}!`);
      setJoinCode('');
      setClassCodeError('');
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      setClassCodeError('Invalid class code. Try "CS101" or "SE206"');
    }
  };

  const handleInviteStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setInviteEmailError('Please enter a student email before you can proceed.');
      return;
    }
    setInviteEmailError('');
    setSuccessMsg(`Invitation sent to ${inviteEmail}!`);
    setInviteEmail('');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleAssignTA = (ta: string) => {
    setClassesList(prev => prev.map(c => c.id === activeClass.id ? { ...c, taName: ta } : c));
    setSuccessMsg(`Assigned ${ta} as TA for ${activeClass.name}!`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // ==========================================
  // RENDER STUDENT CLASS PANEL
  // ==========================================
  const renderStudentView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left side list */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2rem] p-6 shadow-soft space-y-4">
          <h2 className="text-base font-black text-slate-805 dark:text-white mb-4 flex items-center gap-2">
            <School className="text-brand-primary" size={18} />
            <span>Enrolled Courses</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classesList.map(item => (
              <div 
                key={item.id} 
                className="border border-[#ece8f3] dark:border-slate-800/40 bg-slate-50/20 rounded-2xl p-4 flex flex-col justify-between hover:border-brand-primary/20 hover:scale-[1.01] transition-all"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-extrabold text-brand-primary bg-brand-primary-light px-2 py-0.5 rounded uppercase">
                      {item.code}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-sm mt-3">{item.name}</h3>
                  <p className="text-[11px] text-slate-455 font-medium mt-1">Lecturer: {item.lecturerName}</p>
                </div>

                <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between text-[10px] text-slate-400 font-bold">
                  <span>TA: {item.taName || 'None Assigned'}</span>
                  <span>{item.studentsCount} Classmates</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side Join Code Form */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2rem] p-6 shadow-soft space-y-4">
          <h2 className="text-base font-black text-slate-850 mb-3 flex items-center gap-1.5">
            <UserPlus size={18} className="text-brand-primary" />
            <span>Join Class via Code</span>
          </h2>
          <p className="text-[11px] text-slate-455 font-medium leading-relaxed">
            Enter the enrollment token provided by your lecturer or class representative to instantly unlock resource items.
          </p>

          <form onSubmit={handleJoinClass} className="space-y-3 pt-2">
            <input
              type="text"
              placeholder="e.g. CS101"
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value);
                if (classCodeError) setClassCodeError('');
              }}
              className="w-full px-4 py-3 bg-slate-50 border border-[#ece8f3] rounded-xl text-xs focus:outline-none focus:border-brand-primary font-semibold text-center uppercase shadow-sm"
            />
            {classCodeError && (
              <p className="text-[10px] text-red-500 font-bold pl-1 select-none animate-pulse">{classCodeError}</p>
            )}
            
            <button
              type="submit"
              className="w-full py-3 bg-brand-primary text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-premium cursor-pointer"
            >
              Enroll Course
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // RENDER LECTURER CLASS PANEL
  // ==========================================
  const renderLecturerView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left lists */}
      <div className="lg:col-span-2 bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2rem] p-6 shadow-soft space-y-4">
        <h2 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2">
          <Award className="text-brand-primary" size={18} />
          <span>My Classes Portfolio</span>
        </h2>

        <div className="space-y-3">
          {classesList.map(item => (
            <div 
              key={item.id}
              onClick={() => setActiveClassId(item.id)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                item.id === activeClassId 
                  ? 'border-brand-primary/20 bg-brand-primary-light/10 shadow-soft' 
                  : 'border-[#ece8f3] bg-transparent hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-primary-light flex items-center justify-center text-brand-primary shrink-0">
                    <BookOpen size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800">{item.name}</h3>
                    <p className="text-[10px] text-slate-455 font-bold uppercase mt-0.5">{item.code} • {item.studentsCount} Students</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Avg Attendance</p>
                  <p className="text-xs font-extrabold text-brand-primary mt-0.5">{item.attendanceRate || 'N/A'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right details / Roster / TA Assign */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2rem] p-6 shadow-soft space-y-4">
          <h3 className="text-sm font-black text-slate-850">Class Actions: {activeClass.name}</h3>
          
          <div className="space-y-3.5 pt-2">
            <button className="w-full flex items-center justify-between p-3 rounded-2xl border border-[#ece8f3] hover:border-brand-primary/20 transition-all text-left text-xs font-bold text-slate-700 cursor-pointer">
              <span className="flex items-center gap-2">
                <ClipboardList size={14} className="text-brand-primary" />
                <span>Generate Attendance Report</span>
              </span>
              <ChevronRight size={14} className="text-slate-400" />
            </button>

            <button className="w-full flex items-center justify-between p-3 rounded-2xl border border-[#ece8f3] hover:border-brand-primary/20 transition-all text-left text-xs font-bold text-slate-700 cursor-pointer">
              <span className="flex items-center gap-2">
                <Users size={14} className="text-brand-primary" />
                <span>Export Students Roster</span>
              </span>
              <ChevronRight size={14} className="text-slate-400" />
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Assign Assistant TA</h4>
            <div className="flex gap-2">
              <button 
                onClick={() => handleAssignTA('Arthur Dent')}
                className="px-3 py-1.5 border border-[#ece8f3] hover:border-brand-primary/30 rounded-xl text-[10px] font-extrabold uppercase text-slate-600 transition-all cursor-pointer"
              >
                Arthur Dent
              </button>
              <button 
                onClick={() => handleAssignTA('Tricia McMillan')}
                className="px-3 py-1.5 border border-[#ece8f3] hover:border-brand-primary/30 rounded-xl text-[10px] font-extrabold uppercase text-slate-600 transition-all cursor-pointer"
              >
                Tricia McMillan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // RENDER COURSE REPRESENTATIVE VIEW
  // ==========================================
  const renderRepView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left sides */}
      <div className="lg:col-span-2 bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2rem] p-6 shadow-soft space-y-4">
        <h2 className="text-base font-black text-slate-805 dark:text-white mb-4 flex items-center gap-2">
          <Users className="text-brand-primary" size={18} />
          <span>Liaison Class Directory</span>
        </h2>

        <div className="space-y-3">
          {classesList.map(item => (
            <div 
              key={item.id}
              onClick={() => setActiveClassId(item.id)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                item.id === activeClassId 
                  ? 'border-brand-primary/20 bg-brand-primary-light/10 shadow-soft' 
                  : 'border-[#ece8f3] bg-transparent hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-primary-light flex items-center justify-center text-brand-primary shrink-0">
                    <School size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800">{item.name}</h3>
                    <p className="text-[10px] text-slate-455 font-bold uppercase mt-0.5">{item.code} • TA: {item.taName || 'None'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Lecturer</p>
                  <p className="text-xs font-extrabold text-slate-800 mt-0.5">{item.lecturerName}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right side invite and action tools */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2rem] p-6 shadow-soft space-y-4">
          <h3 className="text-sm font-black text-slate-850 flex items-center gap-2">
            <UserPlus size={16} className="text-brand-primary" />
            <span>Invite Student to Class</span>
          </h3>

          <form onSubmit={handleInviteStudent} className="space-y-3.5 pt-2">
            <input
              type="email"
              placeholder="student.email@sans.edu"
              value={inviteEmail}
              onChange={(e) => {
                setInviteEmail(e.target.value);
                if (inviteEmailError) setInviteEmailError('');
              }}
              className="w-full px-4 py-2.5 bg-slate-50 border border-[#ece8f3] rounded-xl text-xs focus:outline-none focus:border-brand-primary font-semibold shadow-sm"
            />
            {inviteEmailError && (
              <p className="text-[10px] text-red-500 font-bold pl-1 select-none animate-pulse">{inviteEmailError}</p>
            )}
            <button
              type="submit"
              className="w-full py-2.5 bg-brand-primary text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-premium cursor-pointer"
            >
              Send Invitation Link
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2rem] p-6 shadow-soft relative overflow-hidden">
          <h3 className="font-extrabold text-xs uppercase tracking-widest text-slate-455 mb-2">Class Liaison Info</h3>
          <p className="text-2xl font-black text-slate-800 mb-4">{activeClass.studentsCount} Students</p>
          <div className="p-3 bg-amber-500/10 border border-amber-500/15 rounded-2xl flex items-start gap-2.5">
            <Shield size={16} className="text-amber-600 mt-0.5 shrink-0" />
            <span className="text-[10px] font-semibold text-amber-800 leading-relaxed">
              Course Rep permission grants allow scheduling study sessions and coordinating student rosters.
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // Dynamic selector based on UserRole
  const renderRoleClassView = () => {
    switch (user?.role) {
      case UserRole.Lecturer:
        return renderLecturerView();
      case UserRole.ClassRepresentative:
        return renderRepView();
      case UserRole.Student:
      default:
        return renderStudentView();
    }
  };

  return (
    <div className="p-8 space-y-6 h-[calc(100vh-64px)] overflow-y-auto relative">
      
      {/* Toast feedback simulation */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-large flex items-center gap-2 animate-bounce z-100">
          <CheckCircle size={14} className="text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
          My Classes
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          Review class schedules, manage course enrollment credentials, and coordinate directories.
        </p>
      </div>

      {renderRoleClassView()}
    </div>
  );
};

export default MyClassesPage;
