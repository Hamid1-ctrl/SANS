import React, { useState } from 'react';
import { useTheme } from '../components/layout/ThemeProvider';
import { 
  Bell, 
  Moon, 
  Sun, 
  Eye, 
  CheckCircle,
  Smartphone,
  Mail
} from 'lucide-react';

const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  
  const [successMsg, setSuccessMsg] = useState('');
  
  // Notification States
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [chatAlerts, setChatAlerts] = useState(false);

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('Notification preferences updated successfully!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="p-8 space-y-6 h-[calc(100vh-64px)] overflow-y-auto relative">
      
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
        <p className="text-slate-500 dark:text-[#94A3B8] font-medium">
          Manage your SANS application preferences, notification integrations, and password credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PANEL 1: App Theme Configuration */}
        <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-[rgba(255,255,255,0.18)] rounded-[2.5rem] p-6 shadow-soft space-y-4">
          <h2 className="text-base font-black text-slate-800 mb-3 flex items-center gap-2">
            {theme === 'light' ? <Sun size={18} className="text-brand-primary" /> : <Moon size={18} className="text-brand-primary" />}
            <span>App Theme Preference</span>
          </h2>
          <p className="text-[11px] text-slate-455 font-medium leading-relaxed">
            Shift between light mode and dark mode representation values to adjust display contrast.
          </p>

          <div className="bg-slate-50 dark:bg-[#1F2937] rounded-2xl p-1 flex">
            <button
              onClick={() => { if (theme !== 'light') toggleTheme(); }}
              className={`flex-1 text-center py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                theme === 'light'
                  ? 'bg-white dark:bg-[#334155] text-brand-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Sun size={14} />
              <span>Light Mode</span>
            </button>
            <button
              onClick={() => { if (theme !== 'dark') toggleTheme(); }}
              className={`flex-1 text-center py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                theme === 'dark'
                  ? 'bg-white dark:bg-[#334155] text-brand-primary shadow-sm'
                  : 'text-slate-550 hover:text-slate-700'
              }`}
            >
              <Moon size={14} />
              <span>Dark Mode</span>
            </button>
          </div>
        </div>

        {/* PANEL 2: Notifications settings */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-[rgba(255,255,255,0.18)] rounded-[2.5rem] p-8 shadow-soft space-y-6">
          <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
            <Bell className="text-brand-primary" size={18} />
            <span>Notification Integrations</span>
          </h2>

          <form onSubmit={handleSaveNotifications} className="space-y-4">
            
            {/* Email Alerts toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <div className="flex items-start gap-3">
                <Mail className="text-brand-primary mt-0.5" size={16} />
                <div>
                  <h4 className="text-xs font-black text-slate-800">Email Notifications</h4>
                  <p className="text-[10px] text-slate-455 mt-0.5">Receive daily bulletins, schedules, and dead-lines to your registered address.</p>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={emailAlerts}
                onChange={() => setEmailAlerts(!emailAlerts)}
                className="w-4 h-4 text-brand-primary rounded focus:ring-brand-primary border-slate-200 cursor-pointer"
              />
            </div>

            {/* Push alerts */}
            <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <div className="flex items-start gap-3">
                <Smartphone className="text-brand-primary mt-0.5" size={16} />
                <div>
                  <h4 className="text-xs font-black text-slate-800">Push Notifications</h4>
                  <p className="text-[10px] text-slate-455 mt-0.5">Receive real-time class cancellations and immediate invitations on SANS portal.</p>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={pushAlerts}
                onChange={() => setPushAlerts(!pushAlerts)}
                className="w-4 h-4 text-brand-primary rounded focus:ring-brand-primary border-slate-200 cursor-pointer"
              />
            </div>

            {/* Chat alerts */}
            <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <div className="flex items-start gap-3">
                <Eye className="text-brand-primary mt-0.5" size={16} />
                <div>
                  <h4 className="text-xs font-black text-slate-800">Chat & Channel Reminders</h4>
                  <p className="text-[10px] text-slate-455 mt-0.5">Alert me for every unread direct message or lecture channel comment.</p>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={chatAlerts}
                onChange={() => setChatAlerts(!chatAlerts)}
                className="w-4 h-4 text-brand-primary rounded focus:ring-brand-primary border-slate-200 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-3 bg-brand-primary text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-premium cursor-pointer active:scale-[0.98] transition-all"
            >
              Save Notification Preferences
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default SettingsPage;
