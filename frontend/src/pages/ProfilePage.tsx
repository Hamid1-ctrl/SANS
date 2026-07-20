import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Phone, Hash, Award, ShieldAlert, Building, Clock, BookOpen } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  const getRoleName = (roleVal: number | undefined) => {
    if (roleVal === 1) return 'Lecturer';
    if (roleVal === 2) return 'Course Representative';
    if (roleVal === 3) return 'Administrator';
    return 'Student';
  };

  const profileFields = [
    { label: 'First Name', value: user?.firstName || 'John', icon: User },
    { label: 'Last Name', value: user?.lastName || 'Doe', icon: User },
    { label: 'Email Address', value: user?.email || 'john.doe@sans.edu', icon: Mail },
    { label: user?.role === 3 ? 'Admin System ID' : user?.role === 1 ? 'Staff ID' : 'Student ID', value: user?.studentId || 'STU102435', icon: Hash },
    { label: 'Phone Number', value: user?.phoneNumber || '+1 (555) 234-5678', icon: Phone },
    { label: 'Role / Designation', value: getRoleName(user?.role), icon: Award },
    ...(user?.role === 1 ? [
      { label: 'Office Location', value: user?.officeNumber || 'Room 402, Block C', icon: Building },
      { label: 'Office Hours', value: user?.officeHours || 'Mon/Wed 2:00 PM - 4:00 PM', icon: Clock },
      { label: 'Specialization', value: user?.specialization || 'PhD, Artificial Intelligence', icon: BookOpen }
    ] : [])
  ];

  return (
    <div className="p-8 space-y-6 h-[calc(100vh-64px)] overflow-y-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-[#F8FAFC] tracking-tight">
          My Profile
        </h1>
        <p className="text-slate-500 dark:text-[#94A3B8] font-medium">
          View your academic registration details, contact credentials, and user authorization permissions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Avatar Card */}
        <div className="bg-white dark:bg-[#1E293B] rounded-[2rem] border border-[#ece8f3] dark:border-[rgba(255,255,255,0.18)] shadow-soft p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
          {/* Decorative Top Background Banner */}
          <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-br from-brand-green to-brand-green-medium opacity-90"></div>

          {/* Profile Circle Avatar */}
          <div className="relative z-10 mt-10">
            <div className="w-28 h-28 rounded-full overflow-hidden bg-gradient-to-br from-brand-green to-brand-green-medium text-white text-4xl font-extrabold flex items-center justify-center border-4 border-white dark:border-[rgba(255,255,255,0.18)] shadow-md shadow-brand-green/15 select-none">
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{(user?.firstName?.[0] || 'J')}{(user?.lastName?.[0] || 'D')}</span>
              )}
            </div>
          </div>

          <div className="relative z-10 mt-4 space-y-1">
            <h2 className="text-xl font-extrabold text-slate-855 dark:text-slate-150">
              {user?.firstName || 'John'} {user?.lastName || 'Doe'}
            </h2>
            <p className="text-xs font-bold text-slate-500 dark:text-brand-primary uppercase tracking-widest">
              {getRoleName(user?.role)}
            </p>
            <p className="text-xs text-brand-green font-semibold mt-1">
              SANS Smart Account Active
            </p>
          </div>


        </div>

        {/* Right Side: Account Details Fields */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-[rgba(255,255,255,0.18)] shadow-soft p-8">
          <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-100 dark:border-slate-855">
            <h3 className="font-extrabold text-slate-800 dark:text-[#F8FAFC] text-lg">
              Registration Information
            </h3>
            

          </div>

          {/* Fields list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {profileFields.map((field, idx) => {
              const Icon = field.icon;
              return (
                <div key={idx} className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-450 dark:text-[#94A3B8] uppercase tracking-wider">
                    {field.label}
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      defaultValue={field.value}
                      disabled
                      className="w-full pl-11 pr-4 py-3 rounded-xl text-xs bg-slate-50/70 dark:bg-[#1F2937]/50 text-slate-655 dark:text-slate-305 border border-slate-100 dark:border-[rgba(255,255,255,0.18)] cursor-not-allowed font-semibold focus:outline-none"
                    />
                    <Icon className="absolute left-4 text-slate-400 dark:text-slate-505" size={14} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Notice Alert Box */}
          {user?.role !== 3 && (
            <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/15 rounded-2xl flex items-start gap-3.5">
              <ShieldAlert size={18} className="text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
              <div className="text-xs leading-relaxed text-amber-800 dark:text-amber-400 font-medium">
                <p className="font-bold">Identity Verification Secured</p>
                <p className="opacity-90 mt-0.5">
                  Certain core properties (e.g. Student ID, Register Email, Course Designation) are managed by university administration. To request modifications, compose an administrative update ticket.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;
