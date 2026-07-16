import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { UserRole } from '../types';
import api from '../lib/axios';
import { 
  School, 
  UserPlus, 
  BookOpen, 
  Award,
  CheckCircle,
  PlusCircle,
  Mail
} from 'lucide-react';

const MyClassesPage: React.FC = () => {
  const { user } = useAuth();
  const { classes, activeClass, setActiveClass, refreshClasses } = useWorkspace();
  const [activeClassId, setActiveClassId] = useState<string>('');
  
  // Creation Form
  const [className, setClassName] = useState('');
  const [classCode, setClassCode] = useState('');
  const [classDesc, setClassDesc] = useState('');
  const [createError, setCreateError] = useState('');
  
  // Join Form
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  // Invite Form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');

  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (classes.length > 0) {
      if (!activeClassId) {
        setActiveClassId(classes[0].id);
      }
    }
  }, [classes, activeClassId]);

  const selectedClass = classes.find(c => c.id === activeClassId) || classes[0];

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim() || !classCode.trim()) {
      setCreateError('Name and Code are required.');
      return;
    }
    setCreateError('');
    try {
      await api.post('/classworkspaces', {
        name: className,
        code: classCode,
        description: classDesc
      });
      setSuccessMsg(`Success: Class ${className} created!`);
      setClassName('');
      setClassCode('');
      setClassDesc('');
      await refreshClasses();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Failed to create class.');
    }
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setJoinError('Please enter a class code.');
      return;
    }
    setJoinError('');
    try {
      const response = await api.post('/classworkspaces/join', {
        code: joinCode
      });
      setSuccessMsg(`Success: Joined ${response.data.name}!`);
      setJoinCode('');
      await refreshClasses();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setJoinError(err.response?.data?.message || 'Invalid code or already joined.');
    }
  };

  const handleInviteStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !selectedClass) {
      setInviteError('Please enter a student email.');
      return;
    }
    setInviteError('');
    try {
      await api.post(`/classworkspaces/${selectedClass.id}/invite`, {
        email: inviteEmail
      });
      setSuccessMsg(`Invitation sent to ${inviteEmail}!`);
      setInviteEmail('');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setInviteError(err.response?.data?.message || 'Student not found.');
    }
  };

  // ==========================================
  // RENDER STUDENT VIEW
  // ==========================================
  const renderStudentView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left side list */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2rem] p-6 shadow-soft space-y-4">
          <h2 className="text-base font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <School className="text-brand-primary" size={18} />
            <span>Enrolled Courses</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classes.length === 0 ? (
              <p className="text-xs font-semibold text-slate-400 dark:text-[#94A3B8] p-4 col-span-2 text-center">
                You are not enrolled in any classes yet. Join one using the code on the right!
              </p>
            ) : (
              classes.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => {
                    setActiveClassId(item.id);
                    setActiveClass(item);
                  }}
                  className={`border rounded-2xl p-4 flex flex-col justify-between hover:scale-[1.01] transition-all cursor-pointer ${
                    item.id === activeClass?.id 
                      ? 'border-brand-primary bg-brand-primary-light/5 dark:bg-brand-primary/5' 
                      : 'border-[#ece8f3] dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-extrabold text-brand-primary bg-brand-primary-light/40 dark:bg-brand-primary/10 px-2 py-0.5 rounded uppercase">
                        {item.code}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-slate-800 dark:text-[#F8FAFC] text-sm mt-3">{item.name}</h3>
                    <p className="text-[11px] text-slate-500 dark:text-[#CBD5E1] font-medium mt-1">Lecturer: {item.lecturerName}</p>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-4 flex items-center justify-between text-[10px] text-slate-400 dark:text-[#94A3B8] font-bold">
                    <span>Active Workspace</span>
                    <span>{item.studentsCount} Classmates</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right side Join Code Form */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2rem] p-6 shadow-soft space-y-4">
          <h2 className="text-base font-black text-slate-800 dark:text-white mb-3 flex items-center gap-1.5">
            <UserPlus size={18} className="text-brand-primary" />
            <span>Join Class via Code</span>
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-medium leading-relaxed">
            Enter the enrollment token provided by your lecturer or class representative to instantly unlock resource items.
          </p>

          <form onSubmit={handleJoinClass} className="space-y-3 pt-2">
            <input
              type="text"
              placeholder="e.g. CS101"
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value);
                if (joinError) setJoinError('');
              }}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-850 rounded-xl text-xs focus:outline-none focus:border-brand-primary font-semibold text-center uppercase shadow-sm dark:text-white"
            />
            {joinError && (
              <p className="text-[10px] text-red-500 font-bold pl-1 select-none animate-pulse">{joinError}</p>
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
  // RENDER LECTURER VIEW
  // ==========================================
  const renderLecturerView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left side list */}
      <div className="lg:col-span-2 bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2rem] p-6 shadow-soft space-y-4">
        <h2 className="text-base font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Award className="text-brand-primary" size={18} />
          <span>My Classes Portfolio</span>
        </h2>

        <div className="space-y-3">
          {classes.length === 0 ? (
            <p className="text-xs font-semibold text-slate-400 dark:text-[#94A3B8] p-4 text-center">
              No classes created yet. Use the creation tool on the right to start!
            </p>
          ) : (
            classes.map(item => (
              <div 
                key={item.id}
                onClick={() => {
                  setActiveClassId(item.id);
                  setActiveClass(item);
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  item.id === activeClassId 
                    ? 'border-brand-primary/20 bg-brand-primary-light/10 dark:bg-brand-primary/5 shadow-soft' 
                    : 'border-[#ece8f3] dark:border-slate-800 bg-transparent hover:bg-slate-50/50 dark:hover:bg-slate-900/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-primary-light/40 dark:bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0">
                      <BookOpen size={16} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-800 dark:text-white">{item.name}</h3>
                      <p className="text-[10px] text-slate-500 dark:text-[#CBD5E1] font-bold uppercase mt-0.5">{item.code} • {item.studentsCount} Students</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-slate-400 dark:text-[#94A3B8] font-bold uppercase">Lecturer Name</p>
                    <p className="text-xs font-extrabold text-brand-primary mt-0.5">{item.lecturerName}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right side Creation & Invite Forms */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2rem] p-6 shadow-soft space-y-4">
          <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
            <PlusCircle size={16} className="text-brand-primary" />
            <span>Create Class Workspace</span>
          </h3>

          <form onSubmit={handleCreateClass} className="space-y-3 pt-2">
            <input
              type="text"
              placeholder="Class Name (e.g. Intro to Logic)"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-brand-primary font-semibold dark:text-white"
            />
            <input
              type="text"
              placeholder="Code (e.g. CS102)"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-brand-primary font-semibold uppercase dark:text-white"
            />
            <textarea
              placeholder="Short Description"
              value={classDesc}
              onChange={(e) => setClassDesc(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-brand-primary font-semibold dark:text-white h-20 resize-none"
            />
            {createError && (
              <p className="text-[10px] text-red-500 font-bold pl-1 animate-pulse">{createError}</p>
            )}
            <button
              type="submit"
              className="w-full py-2.5 bg-brand-primary text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-premium cursor-pointer"
            >
              Create Workspace
            </button>
          </form>
        </div>

        {selectedClass && (
          <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2rem] p-6 shadow-soft space-y-4">
            <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Mail size={16} className="text-brand-primary" />
              <span>Invite Student to {selectedClass.code}</span>
            </h3>

            <form onSubmit={handleInviteStudent} className="space-y-3 pt-2">
              <input
                type="email"
                placeholder="student.email@sans.edu"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-brand-primary font-semibold dark:text-white"
              />
              {inviteError && (
                <p className="text-[10px] text-red-500 font-bold pl-1 animate-pulse">{inviteError}</p>
              )}
              <button
                type="submit"
                className="w-full py-2.5 bg-brand-primary text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-premium cursor-pointer"
              >
                Send Invite Link
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );

  // ==========================================
  // RENDER COURSE REPRESENTATIVE VIEW
  // ==========================================
  const renderRepView = () => renderStudentView(); // Use same flow for enrollment, with liaison directory

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
    <div className="p-8 space-y-6 h-[calc(100vh-64px)] overflow-y-auto relative bg-[#f7f6fb] dark:bg-[#0F172A] transition-colors duration-300">
      
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
