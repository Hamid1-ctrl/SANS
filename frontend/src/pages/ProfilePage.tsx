import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Phone, Hash, Award, ShieldAlert, Camera } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  const getRoleName = (roleVal: number | undefined) => {
    if (roleVal === 1) return 'Lecturer';
    if (roleVal === 2) return 'Course Representative';
    return 'Student';
  };

  const profileFields = [
    { label: 'First Name', value: user?.firstName || 'John', icon: User },
    { label: 'Last Name', value: user?.lastName || 'Doe', icon: User },
    { label: 'Email Address', value: user?.email || 'john.doe@sans.edu', icon: Mail },
    { label: 'Student / Staff ID', value: user?.studentId || 'STU102435', icon: Hash },
    { label: 'Phone Number', value: user?.phoneNumber || '+1 (555) 234-5678', icon: Phone },
    { label: 'Role / Designation', value: getRoleName(user?.role), icon: Award }
  ];

  return (
    <div className="p-8 space-y-6 h-[calc(100vh-64px)] overflow-y-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
          My Profile
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          View your academic registration details, contact credentials, and user authorization permissions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Avatar Card */}
        <div className="bg-white dark:bg-[#191624] rounded-[2rem] border border-[#ece8f3] dark:border-slate-800/40 shadow-soft p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
          {/* Decorative Top Background Banner */}
          <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-br from-brand-green to-brand-green-medium opacity-90"></div>

          {/* Profile Circle Avatar */}
          <div className="relative z-10 mt-10">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-brand-green to-brand-green-medium text-white text-4xl font-extrabold flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-md shadow-brand-green/15 select-none">
              {(user?.firstName?.[0] || 'J')}{(user?.lastName?.[0] || 'D')}
            </div>
            <button className="absolute bottom-0 right-0 p-2 bg-[#1e1b29] hover:bg-slate-850 text-white rounded-full border border-white dark:border-slate-800 transition-all shadow-sm">
              <Camera size={14} />
            </button>
          </div>

          <div className="relative z-10 mt-4 space-y-1">
            <h2 className="text-xl font-extrabold text-slate-855 dark:text-slate-150">
              {user?.firstName || 'John'} {user?.lastName || 'Doe'}
            </h2>
            <p className="text-xs font-bold text-slate-450 dark:text-slate-455 uppercase tracking-widest">
              {getRoleName(user?.role)}
            </p>
            <p className="text-xs text-brand-green font-semibold mt-1">
              SANS Smart Account Active
            </p>
          </div>

          <div className="w-full border-t border-slate-105 dark:border-slate-850 mt-6 pt-6 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Attendance</p>
            <p className="text-lg font-black text-slate-750 dark:text-slate-300 mt-0.5">94.2%</p>
          </div>
        </div>

        {/* Right Side: Account Details Fields */}
        <div className="lg:col-span-2 bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 shadow-soft p-8">
          <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-100 dark:border-slate-855">
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg">
              Registration Information
            </h3>
            
            <button className="px-4.5 py-2 border border-slate-200 dark:border-slate-800 text-slate-655 dark:text-slate-305 hover:bg-slate-50 dark:hover:bg-slate-800/35 rounded-xl text-xs font-bold transition-all">
              Request Info Update
            </button>
          </div>

          {/* Fields list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {profileFields.map((field, idx) => {
              const Icon = field.icon;
              return (
                <div key={idx} className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-450 dark:text-slate-400 uppercase tracking-wider">
                    {field.label}
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      defaultValue={field.value}
                      disabled
                      className="w-full pl-11 pr-4 py-3 rounded-xl text-xs bg-slate-50/70 dark:bg-slate-900/50 text-slate-655 dark:text-slate-305 border border-slate-100 dark:border-slate-800 cursor-not-allowed font-semibold focus:outline-none"
                    />
                    <Icon className="absolute left-4 text-slate-400 dark:text-slate-505" size={14} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Notice Alert Box */}
          <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/15 rounded-2xl flex items-start gap-3.5">
            <ShieldAlert size={18} className="text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
            <div className="text-xs leading-relaxed text-amber-800 dark:text-amber-400 font-medium">
              <p className="font-bold">Identity Verification Secured</p>
              <p className="opacity-90 mt-0.5">
                Certain core properties (e.g. Student ID, Register Email, Course Designation) are managed by university administration. To request modifications, compose an administrative update ticket.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;
