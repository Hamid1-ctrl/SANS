import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
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

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Show / Hide keyboard shortcuts modal helper
  const [showShortcuts, setShowShortcuts] = useState(false);

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
    <div className={`h-screen overflow-hidden bg-[#f7f6fb] dark:bg-[#12101a] font-sans transition-colors duration-300 flex ${getThemeClass()}`}>
      
      {/* Sidebar: Fixed, custom-styled layout that adjusts dynamically based on the role */}
      <aside className="w-24 h-full bg-white dark:bg-[#191624] border-r border-[#ece8f3] dark:border-slate-800/40 flex flex-col items-center py-4 shrink-0 relative z-50 overflow-y-auto">
        
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
                className={`w-full flex flex-col items-center justify-center py-1.5 relative group transition-all duration-200 ${
                  isActive
                    ? 'text-brand-primary font-bold'
                    : 'text-slate-455 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
                }`}
              >
                {/* Active Indicator Bar on the Right Edge using dynamic brand colors */}
                {isActive && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-7 bg-brand-primary rounded-l-md" />
                )}

                <div className={`p-1.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-brand-primary-light text-brand-primary' : 'group-hover:bg-[#f8f7fa] dark:group-hover:bg-slate-800/20'}`}>
                  <Icon size={18} className={isActive ? 'scale-105' : 'group-hover:scale-105'} />
                </div>
                <span className="text-[9px] font-bold tracking-tight mt-0.5 opacity-90 select-none">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Logout Button */}
        <div className="w-full px-2 border-t border-slate-100 dark:border-slate-800/40 pt-2 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex flex-col items-center justify-center text-slate-455 hover:text-red-500 transition-colors py-1.5 cursor-pointer"
            title="Log Out Account"
          >
            <LogOut size={15} />
            <span className="text-[8px] font-bold mt-0.5">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header - transparent & fixed (will never scroll) */}
        <header className="h-16 px-8 flex items-center justify-between z-40 bg-[#f7f6fb]/80 dark:bg-[#12101a]/80 backdrop-blur-md select-none border-b border-[#ece8f3]/35 dark:border-slate-800/20 shrink-0">
          
          {/* Breadcrumb Navigation Trail */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
            <span>SANS</span>
            <span>/</span>
            {getBreadcrumbs().map((b, i, arr) => (
              <span key={i} className={i === arr.length - 1 ? 'text-slate-800 dark:text-slate-200 font-extrabold' : ''}>
                {b}
              </span>
            ))}
          </div>

          {/* Right Header Navigation Controls */}
          <div className="flex items-center gap-6">
            {/* Bell notification */}
            <button className="relative p-1.5 text-slate-455 dark:text-slate-400 hover:bg-[#ece8f3]/40 dark:hover:bg-slate-800/20 rounded-lg transition-colors cursor-pointer">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#d946ef] rounded-full"></span>
            </button>

            {/* Theme selector */}
            <button
              onClick={toggleTheme}
              className="p-1.5 text-slate-455 dark:text-slate-400 hover:bg-[#ece8f3]/40 dark:hover:bg-slate-800/20 rounded-lg transition-colors cursor-pointer"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            <div className="h-6 w-px bg-[#ece8f3] dark:bg-slate-800" />

            {/* User profile controls */}
            <div 
              onClick={() => navigate('/profile')}
              className="flex items-center gap-3.5 cursor-pointer hover:opacity-90 group"
            >
              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block group-hover:text-brand-primary transition-colors">
                  {user?.firstName || 'John'} {user?.lastName || 'Doe'}
                </span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block -mt-0.5">
                  {getRoleLabel()}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary to-brand-primary-medium flex items-center justify-center text-white text-xs font-bold shadow-sm shadow-brand-primary/10">
                {user?.firstName?.[0] || 'J'}{user?.lastName?.[0] || 'D'}
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
          <div className="w-full max-w-sm bg-white dark:bg-[#1a1726] border border-[#ece8f3] dark:border-slate-850 rounded-[2rem] p-6 shadow-large animate-fade-in relative">
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4">
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
