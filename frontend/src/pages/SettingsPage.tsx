import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/axios';
import { UserRole } from '../types';
import { 
  Bell, 
  Eye, 
  CheckCircle,
  Smartphone,
  Mail,
  User as UserIcon,
  Camera
} from 'lucide-react';

const SettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  
  const [successMsg, setSuccessMsg] = useState('');
  
  // Profile Form States
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [officeNumber, setOfficeNumber] = useState(user?.officeNumber || '');
  const [officeHours, setOfficeHours] = useState(user?.officeHours || '');
  const [specialization, setSpecialization] = useState(user?.specialization || '');
  const [bio, setBio] = useState(user?.bio || '');
  
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Avatar Upload States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageErrorMsg, setImageErrorMsg] = useState<string | null>(null);

  // Notification States
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [chatAlerts, setChatAlerts] = useState(false);

  // Sync profile state if user loads later
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhoneNumber(user.phoneNumber || '');
      setOfficeNumber(user.officeNumber || '');
      setOfficeHours(user.officeHours || '');
      setSpecialization(user.specialization || '');
      setBio(user.bio || '');
    }
  }, [user]);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (10 MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setImageErrorMsg('Image size cannot exceed 10 MB.');
      return;
    }

    setIsUploadingImage(true);
    setImageErrorMsg(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post('/users/profile-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      await refreshUser();
      setSuccessMsg('Profile picture updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setImageErrorMsg(err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Failed to upload profile picture.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileErrorMsg(null);
    try {
      await api.put('/users/profile', {
        firstName,
        lastName,
        phoneNumber,
        officeNumber: officeNumber || null,
        officeHours: officeHours || null,
        specialization: specialization || null,
        bio: bio || null,
      });
      await refreshUser();
      setSuccessMsg('Profile details updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setProfileErrorMsg(err?.response?.data?.message || 'Failed to update profile details.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('Notification preferences updated successfully!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="p-8 space-y-6 h-[calc(100vh-64px)] overflow-y-auto relative bg-[#f7f6fb] dark:bg-[#0F172A]">
      
      {/* Toast Alert */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-large flex items-center gap-2 animate-bounce z-100">
          <CheckCircle size={14} className="text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-[#F8FAFC] tracking-tight">
          Settings
        </h1>
        <p className="text-slate-500 dark:text-[#94A3B8] font-medium mt-1">
          Manage your SANS application preferences, profile details, and notification integrations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PANEL 1: Profile Details */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-[rgba(255,255,255,0.18)] rounded-[2.5rem] p-8 shadow-soft space-y-6">
          <h2 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#1e7a34]/10 flex items-center justify-center text-[#1e7a34]">
              <UserIcon size={14} />
            </div>
            <span>Profile Settings</span>
          </h2>

          {/* Avatar Upload Block */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-4 border-b border-slate-100 dark:border-slate-800/40">
            <div className="relative group cursor-pointer" onClick={handleImageClick}>
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-brand-primary to-brand-primary-medium text-white text-2xl font-extrabold flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-md select-none relative">
                {isUploadingImage ? (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : user?.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{(user?.firstName?.[0] || 'J')}{(user?.lastName?.[0] || 'D')}</span>
                )}
                
                {/* Hover overlay camera prompt */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1">
                  <Camera size={12} />
                  <span>Edit</span>
                </div>
              </div>
              <button 
                type="button"
                className="absolute bottom-0 right-0 p-1.5 bg-[#1e1b29] text-white rounded-full border border-white dark:border-slate-850 shadow-sm"
              >
                <Camera size={10} />
              </button>
            </div>
            <div className="text-center sm:text-left space-y-1.5">
              <h3 className="text-xs font-black text-slate-800 dark:text-white">Profile Photo</h3>
              <p className="text-[10px] text-slate-455 dark:text-[#94A3B8] font-semibold leading-relaxed max-w-[240px]">
                Accepts JPG, PNG or WebP images under 10 MB. Recommended square proportions.
              </p>
              {imageErrorMsg && (
                <p className="text-[9px] font-bold text-red-500">{imageErrorMsg}</p>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*" 
            />
          </div>

          {profileErrorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/15 text-red-600 rounded-xl text-xs font-semibold text-center leading-relaxed">
              {profileErrorMsg}
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider pl-1">First Name</label>
                <input 
                  type="text" 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#fbfbfe] dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-primary/30 focus:bg-white dark:focus:bg-slate-900 font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider pl-1">Last Name</label>
                <input 
                  type="text" 
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#fbfbfe] dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-primary/30 focus:bg-white dark:focus:bg-slate-900 font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider pl-1">Email Address</label>
                <input 
                  type="email" 
                  value={user?.email || ''} 
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-855 bg-slate-50 dark:bg-slate-900/20 text-slate-400 dark:text-slate-500 text-xs font-semibold cursor-not-allowed"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider pl-1">Phone Number</label>
                <input 
                  type="text" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#fbfbfe] dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-primary/30 focus:bg-white dark:focus:bg-slate-900 font-semibold"
                />
              </div>
            </div>

            {(user?.role === UserRole.Lecturer || user?.role === UserRole.Administrator) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider pl-1">Office Number</label>
                  <input 
                    type="text" 
                    value={officeNumber}
                    onChange={(e) => setOfficeNumber(e.target.value)}
                    placeholder="e.g. Room 402"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#fbfbfe] dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-primary/30 focus:bg-white dark:focus:bg-slate-900 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider pl-1">Office Hours</label>
                  <input 
                    type="text" 
                    value={officeHours}
                    onChange={(e) => setOfficeHours(e.target.value)}
                    placeholder="e.g. Mon/Wed 2-4 PM"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#fbfbfe] dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-primary/30 focus:bg-white dark:focus:bg-slate-900 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider pl-1">Specialization</label>
                  <input 
                    type="text" 
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="e.g. Cryptography"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#fbfbfe] dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-primary/30 focus:bg-white dark:focus:bg-slate-900 font-semibold"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider pl-1">Biography / About Me</label>
              <textarea 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share a short biography..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#fbfbfe] dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-primary/30 focus:bg-white dark:focus:bg-slate-900 font-semibold resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingProfile}
              className="px-6 py-3 bg-[#1e7a34] hover:bg-[#258d3f] text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-premium cursor-pointer active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {isSavingProfile ? 'Saving...' : 'Update Profile Details'}
            </button>
          </form>
        </div>

        {/* PANEL 2: Notifications settings */}
        <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-[rgba(255,255,255,0.18)] rounded-[2.5rem] p-8 shadow-soft space-y-6">
          <h2 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Bell className="text-[#1e7a34]" size={18} />
            <span>Notification Integrations</span>
          </h2>

          <form onSubmit={handleSaveNotifications} className="space-y-4">
            
            {/* Email Alerts toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-[#1F2937]/50 rounded-2xl border border-slate-100 dark:border-slate-800/40">
              <div className="flex items-start gap-3">
                <Mail className="text-[#1e7a34] mt-0.5" size={16} />
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">Email Notifications</h4>
                  <p className="text-[10px] text-slate-455 dark:text-slate-400 mt-0.5">Receive daily bulletins, schedules, and dead-lines to your registered address.</p>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={emailAlerts}
                onChange={() => setEmailAlerts(!emailAlerts)}
                className="w-4 h-4 text-[#1e7a34] rounded focus:ring-brand-primary border-slate-200 cursor-pointer"
              />
            </div>

            {/* Push alerts */}
            <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-[#1F2937]/50 rounded-2xl border border-slate-100 dark:border-slate-800/40">
              <div className="flex items-start gap-3">
                <Smartphone className="text-[#1e7a34] mt-0.5" size={16} />
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">Push Notifications</h4>
                  <p className="text-[10px] text-[#94A3B8] dark:text-slate-400 mt-0.5">Receive real-time class cancellations and immediate invitations on SANS portal.</p>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={pushAlerts}
                onChange={() => setPushAlerts(!pushAlerts)}
                className="w-4 h-4 text-[#1e7a34] rounded focus:ring-brand-primary border-slate-200 cursor-pointer"
              />
            </div>

            {/* Chat alerts */}
            <div className="flex items-center justify-between p-4 bg-[#fbfbfe] dark:bg-[#1F2937]/50 rounded-2xl border border-slate-100 dark:border-slate-800/40">
              <div className="flex items-start gap-3">
                <Eye className="text-[#1e7a34] mt-0.5" size={16} />
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">Chat & Channel Reminders</h4>
                  <p className="text-[10px] text-slate-455 dark:text-slate-400 mt-0.5">Alert me for every unread direct message or lecture channel comment.</p>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={chatAlerts}
                onChange={() => setChatAlerts(!chatAlerts)}
                className="w-4 h-4 text-[#1e7a34] rounded focus:ring-brand-primary border-slate-200 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-3 bg-[#1e7a34] text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-premium cursor-pointer active:scale-[0.98] transition-all"
            >
              Save Preferences
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default SettingsPage;
