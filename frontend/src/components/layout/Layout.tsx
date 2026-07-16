import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useTheme } from './ThemeProvider';
import { 
  Home,
  Megaphone,
  Calendar,
  Clock,
  BookOpen,
  FolderOpen,
  MessageSquare,
  Settings,
  LogOut,
  Moon,
  Sun,
  Bell,
  CheckSquare,
  Beaker,
  GraduationCap,
  Users
} from 'lucide-react';
import { UserRole } from '../../types';

import { useNotifications, useMarkAllNotificationsAsRead, useMarkNotificationAsRead } from '../../hooks/useNotifications';

const Layout: React.FC = () => {
  const { user, isLoading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { classes, activeClass, setActiveClass } = useWorkspace();
  
  const { data: notificationsList } = useNotifications();
  const markAllRead = useMarkAllNotificationsAsRead();
  const markRead = useMarkNotificationAsRead();
  const unreadCount = Array.isArray(notificationsList) ? notificationsList.filter(n => !n.isRead).length : 0;
  
  // Show / Hide keyboard shortcuts modal helper
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#f7f6fb] dark:bg-[#0F172A] text-slate-500 font-bold text-xs select-none">
        Loading SANS Workspace...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Define custom Navigation Items based on the Logged-in User Role
  const getNavItems = () => {
    switch (user?.role) {
      case UserRole.Lecturer:
        return [
          { path: '/dashboard', icon: Home, label: 'Home' },
          { path: '/announcements', icon: Megaphone, label: 'Verified News' },
          { path: '/assignments', icon: CheckSquare, label: 'Assignments' },
          { path: '/quizzes', icon: Beaker, label: 'Quizzes' },
          { path: '/schedule', icon: Calendar, label: 'Timetable' },
          { path: '/classes', icon: GraduationCap, label: 'My Classes' },
          { path: '/resources', icon: FolderOpen, label: 'Resources' },
          { path: '/messages', icon: MessageSquare, label: 'Messages' },
          { path: '/settings', icon: Settings, label: 'Settings' },
        ];
      case UserRole.ClassRepresentative:
        return [
          { path: '/dashboard', icon: Home, label: 'Home' },
          { path: '/announcements', icon: Megaphone, label: 'Class Notices' },
          { path: '/quizzes', icon: Beaker, label: 'Quizzes' },
          { path: '/resources', icon: FolderOpen, label: 'Shared Files' },
          { path: '/classes', icon: Users, label: 'My Classes' },
          { path: '/messages', icon: MessageSquare, label: 'Chat' },
          { path: '/settings', icon: Settings, label: 'Settings' },
        ];
      case UserRole.Student:
      default:
        return [
          { path: '/dashboard', icon: Home, label: 'Home' },
          { path: '/announcements', icon: Megaphone, label: 'Important Announcements' },
          { path: '/schedule', icon: Calendar, label: 'Timetable' },
          { path: '/quizzes', icon: Beaker, label: 'Quizzes' },
          { path: '/assignments', icon: Clock, label: 'Deadlines' },
          { path: '/classes', icon: GraduationCap, label: 'My Classes' },
          { path: '/resources', icon: BookOpen, label: 'Resources' },
          { path: '/messages', icon: MessageSquare, label: 'Chat' },
          { path: '/settings', icon: Settings, label: 'Settings' },
        ];
    }
  };

  const navItems = getNavItems();

  // Dynamic Theme Class binding based on user role
  const getThemeClass = () => {
    if (user?.role === UserRole.Lecturer) return 'theme-lecturer';
    if (user?.role === UserRole.ClassRepresentative) return 'theme-rep';
    return 'theme-student';
  };

  const getRoleLabel = () => {
    if (user?.role === UserRole.Lecturer) return 'Lecturer';
    if (user?.role === UserRole.ClassRepresentative) return 'Course Rep';
    return 'Student';
  };

  // Generate dynamic breadcrumbs based on the active path
  const getBreadcrumbs = () => {
    const segments = location.pathname.split('/').filter(Boolean);
    if (segments.length === 0) return ['Home'];
    return segments.map(seg => seg.charAt(0).toUpperCase() + seg.slice(1));
  };

  return (
    <div className={`h-screen overflow-hidden bg-[#f7f6fb] dark:bg-[#0F172A] font-sans transition-colors duration-300 flex ${getThemeClass()} ${theme === 'dark' ? 'dark' : ''}`}>
      
      {/* Sidebar: Fixed, custom-styled layout that adjusts dynamically based on the role */}
      <aside className="w-24 h-full bg-white dark:bg-[#1E293B] border-r border-[#ece8f3] dark:border-[rgba(255,255,255,0.18)] flex flex-col items-center py-4 shrink-0 relative z-50 overflow-y-auto">
        
        {/* Brand logo circular icon container */}
        <div className="mb-4">
          <div 
            onClick={() => navigate('/dashboard')}
            className="w-10 h-10 rounded-full bg-brand-primary-light flex items-center justify-center cursor-pointer hover:scale-[1.03] transition-transform select-none shadow-sm"
          >
            <span className="text-brand-primary font-black text-xs tracking-tighter">SANS</span>
          </div>
        </div>

        {/* Dynamic Navigation Items (stacked vertically, color accented per role) */}
        <nav className="flex-1 w-full space-y-1.5 px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="w-full flex flex-col items-center justify-center py-2 relative group transition-all duration-200 select-none cursor-pointer"
              >
                {/* Active Indicator Bar on the Right Edge using dynamic brand colors */}
                {isActive && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-7 bg-brand-primary rounded-l-md animate-pulse" />
                )}

                {/* Icon Box carrying the rotating lightning border */}
                <div className="relative p-[1.5px] rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                  {/* Rotating lightning border line */}
                  <div className={`absolute inset-[-1000%] bg-[conic-gradient(from_0deg,transparent_20%,#3ea556_40%,#1e7a34_60%,transparent_80%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${
                    isActive ? 'opacity-100 animate-[spin_3s_linear_infinite]' : 'group-hover:animate-[spin_4s_linear_infinite]'
                  }`} />
                  
                  {/* Inner Icon Box content */}
                  <div className={`relative p-2 rounded-[10px] transition-all duration-200 flex items-center justify-center ${
                    isActive 
                      ? 'bg-white dark:bg-[#1F2937] text-brand-primary' 
                      : 'bg-white dark:bg-[#1E293B] text-slate-500 dark:text-[#94A3B8] group-hover:text-brand-primary'
                  }`}>
                    <Icon size={18} className={isActive ? 'scale-105' : 'group-hover:scale-105'} />
                  </div>
                </div>

                <span className={`text-[10px] font-extrabold tracking-tight mt-1 select-none transition-colors ${
                  isActive 
                    ? 'text-brand-primary' 
                    : 'text-slate-600 dark:text-[#CBD5E1] group-hover:text-slate-800 dark:group-hover:text-[#F8FAFC]'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Logout Button */}
        <div className="w-full px-2 border-t border-slate-100 dark:border-[rgba(255,255,255,0.18)] pt-2 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex flex-col items-center justify-center text-slate-500 dark:text-[#CBD5E1] hover:text-red-500 dark:hover:text-red-400 transition-colors py-2 cursor-pointer group"
            title="Log Out Account"
          >
            <LogOut size={16} className="text-slate-500 dark:text-[#94A3B8] group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors" />
            <span className="text-[10px] font-extrabold mt-1">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header - transparent & fixed (will never scroll) */}
        <header className="h-16 px-8 flex items-center justify-between z-40 bg-[#f7f6fb]/80 dark:bg-[#0F172A]/80 backdrop-blur-md select-none border-b border-[#ece8f3]/35 dark:border-[rgba(255,255,255,0.18)]/20 shrink-0">
          
          {/* Breadcrumb Navigation Trail & Workspace Selector */}
          <div className="flex items-center gap-5 text-xs font-semibold text-slate-400 dark:text-[#94A3B8]">
            <div className="flex items-center gap-2">
              <span>SANS</span>
              <span>/</span>
              {getBreadcrumbs().map((b, i, arr) => (
                <span key={i} className={i === arr.length - 1 ? 'text-slate-800 dark:text-[#CBD5E1] font-extrabold' : ''}>
                  {b}
                </span>
              ))}
            </div>

            {/* Class Workspace Selector Dropdown */}
            <div className="relative pl-2 border-l border-slate-200 dark:border-slate-800">
              <select
                value={activeClass?.id || 'all'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'all') {
                    setActiveClass(null);
                  } else {
                    const cls = classes.find(c => c.id === val);
                    if (cls) setActiveClass(cls);
                  }
                }}
                className="pl-3 pr-8 py-1.5 bg-[#f0f7f2] dark:bg-slate-800 border border-[#d6eedd] dark:border-slate-700/60 rounded-xl text-[10px] font-bold text-slate-700 dark:text-[#CBD5E1] focus:outline-none cursor-pointer shadow-sm hover:border-[#1e7a34]/30 dark:hover:border-slate-600 transition-all appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%231e7a34%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:8px_8px] bg-[position:right_10px_center] bg-no-repeat"
              >
                <option value="all">🌐 All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    📚 {cls.code} - {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Header Navigation Controls */}
          <div className="flex items-center gap-6">
            {/* Bell notification */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-1.5 text-slate-455 dark:text-[#94A3B8] hover:bg-[#ece8f3]/40 dark:hover:bg-slate-800/20 rounded-lg transition-colors cursor-pointer"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#d946ef] rounded-full animate-pulse"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/40 rounded-2xl shadow-large p-4 z-50 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/40 pb-2">
                    <span className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest">Inbox Notifications</span>
                    <button 
                      onClick={async () => {
                        await markAllRead.mutateAsync();
                        setShowNotifications(false);
                      }}
                      className="text-[9px] font-bold text-brand-primary hover:underline cursor-pointer"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="space-y-2.5 max-h-60 overflow-y-auto">
                    {!Array.isArray(notificationsList) || notificationsList.length === 0 ? (
                      <p className="text-[10px] font-semibold text-slate-400 text-center py-4">Your inbox is clean!</p>
                    ) : (
                      notificationsList.slice(0, 10).map((n) => (
                        <div 
                          key={n.id} 
                          onClick={async () => {
                            await markRead.mutateAsync(n.id);
                            setShowNotifications(false);
                            if (n.title.toLowerCase().includes('quiz')) {
                              navigate('/quizzes');
                            } else if (n.title.toLowerCase().includes('assignment')) {
                              navigate('/assignments');
                            } else if (n.title.toLowerCase().includes('announcement')) {
                              navigate('/announcements');
                            } else if (n.title.toLowerCase().includes('session')) {
                              navigate('/schedule');
                            }
                          }}
                          className={`p-2 hover:bg-slate-50 dark:hover:bg-slate-900/40 rounded-xl transition-colors text-left cursor-pointer border-l-2 ${n.isRead ? 'border-transparent opacity-60' : 'border-brand-primary font-semibold'}`}
                        >
                          <div className="flex justify-between items-start">
                            <h4 className="text-xs font-bold text-slate-800 dark:text-[#CBD5E1]">{n.title}</h4>
                            <span className="text-[8px] text-slate-400 font-bold shrink-0">{new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-[#94A3B8] leading-snug mt-0.5">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Theme selector */}
            <button
              onClick={toggleTheme}
              className="p-1.5 text-slate-455 dark:text-[#94A3B8] hover:bg-[#ece8f3]/40 dark:hover:bg-slate-800/20 rounded-lg transition-colors cursor-pointer"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            <div className="h-6 w-px bg-[#ece8f3] dark:bg-slate-800" />


            {/* User profile display — click to view profile */}
            <div 
              onClick={() => navigate('/profile')}
              className="flex items-center gap-3.5 cursor-pointer hover:opacity-80 transition-opacity group"
              title="View My Profile"
            >
              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1] block group-hover:text-brand-primary transition-colors">
                  {user?.firstName || 'John'} {user?.lastName || 'Doe'}
                </span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block -mt-0.5">
                  {getRoleLabel()}
                </span>
              </div>
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary to-brand-primary-medium flex items-center justify-center text-white text-xs font-bold shadow-sm shadow-brand-primary/10 ring-2 ring-transparent group-hover:ring-brand-primary/30 transition-all">
                  {user?.firstName?.[0] || 'J'}{user?.lastName?.[0] || 'D'}
                </div>
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white dark:border-[#12101a]"></span>
              </div>
            </div>

          </div>
        </header>

        {/* Page Content Container wrapper: Scrolls internally, Header/Sidebar never scroll */}
        <main className="flex-1 overflow-y-auto">
          <div className="h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-[#1e1b29]/40 backdrop-blur-sm z-100 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#1F2937] border border-[#ece8f3] dark:border-[rgba(255,255,255,0.18)] rounded-[2rem] p-6 shadow-large animate-fade-in relative">
            <h3 className="text-sm font-black text-slate-800 dark:text-[#F8FAFC] uppercase tracking-wider mb-4">
              Keyboard Shortcuts
            </h3>
            
            <div className="space-y-3 text-xs font-semibold text-slate-600 dark:text-slate-350">
              <div className="flex justify-between items-center py-1">
                <span>Navigate Home:</span>
                <kbd className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md font-mono text-[10px]">H</kbd>
              </div>
              <div className="flex justify-between items-center py-1">
                <span>View Bulletins:</span>
                <kbd className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md font-mono text-[10px]">N</kbd>
              </div>
              <div className="flex justify-between items-center py-1">
                <span>Tasks / Assignments:</span>
                <kbd className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md font-mono text-[10px]">T</kbd>
              </div>
              <div className="flex justify-between items-center py-1">
                <span>Chat / Messages:</span>
                <kbd className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md font-mono text-[10px]">C</kbd>
              </div>
            </div>

            <button
              onClick={() => setShowShortcuts(false)}
              className="mt-6 w-full py-2.5 bg-brand-primary text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm hover:scale-[1.01] transition-transform cursor-pointer"
            >
              Close Guide
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
