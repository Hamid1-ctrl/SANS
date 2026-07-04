import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../components/layout/ThemeProvider';
import { 
  ArrowRight, 
  Shield, 
  Sparkles, 
  CheckCircle, 
  GraduationCap, 
  Users, 
  Zap, 
  Clock, 
  Bell, 
  Calendar, 
  BookOpen, 
  MessageSquare, 
  FileText, 
  ChevronDown, 
  Menu, 
  X, 
  Star,
  Layers,
  Target
} from 'lucide-react';

// CountUp component using standard requestAnimationFrame
const CountUp: React.FC<{ to: number; duration?: number }> = ({ to, duration = 2 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const end = to;
    const totalFrames = duration * 60;
    let frame = 0;

    const animate = () => {
      frame++;
      const progress = frame / totalFrames;
      const current = Math.round(end * progress);
      setCount(current);

      if (frame < totalFrames) {
        requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    requestAnimationFrame(animate);
  }, [to, duration]);

  return <span>{count.toLocaleString()}</span>;
};

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [activeRole, setActiveRole] = useState<'student' | 'lecturer' | 'rep'>('student');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const bgStyle = {
    backgroundImage: theme === 'dark'
      ? 'linear-gradient(to bottom, rgba(7, 19, 10, 0.95), rgba(7, 19, 10, 0.97)), url("/sans_landing_background.jpg")'
      : 'linear-gradient(to bottom, rgba(252, 252, 253, 0.93), rgba(252, 252, 253, 0.96)), url("/sans_landing_background.jpg")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed' as const
  };

  // Auto-scroll loop for dashboard preview mockup tabs
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveRole((prev) => {
        if (prev === 'student') return 'lecturer';
        if (prev === 'lecturer') return 'rep';
        return 'student';
      });
    }, 4000); // Transitions every 4 seconds
    return () => clearInterval(interval);
  }, []);

  const roles = [
    { id: 'student', title: 'Student Feed', icon: GraduationCap, color: 'text-[#1e7a34] bg-[#1e7a34]/10 border-[#1e7a34]/20' },
    { id: 'lecturer', title: 'Faculty Console', icon: Users, color: 'text-[#1e7a34] bg-[#1e7a34]/10 border-[#1e7a34]/20' },
    { id: 'rep', title: 'Liaison Deck', icon: Shield, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' }
  ];

  const features = [
    { title: 'Smart Announcements', desc: 'Verified notifications sent directly from convener faculty channels.', icon: MegaphoneIcon },
    { title: 'Assignment Tracking', desc: 'Dynamic timeline checklists highlighting upcoming deadlines and due items.', icon: Clock },
    { title: 'Quiz Scheduling', desc: 'Secure evaluation portal allowing professors to schedule exams on active rosters.', icon: Target },
    { title: 'Timetable Management', desc: 'Personal schedule view displaying lecture locations, hours, and calendar intervals.', icon: Calendar },
    { title: 'Learning Resources', desc: 'Role-protected file explorer allowing download and download access parameters.', icon: BookOpen },
    { title: 'Real-Time Notifications', desc: 'Dynamic bell alerts displaying instant system changes and notice approvals.', icon: Bell },
    { title: 'Class Workspaces', desc: 'Segmented dashboards designed for customized workflows and dashboards.', icon: Layers },
    { title: 'Secure Messaging', desc: 'Live discussion boards and direct channels linking classmates with instructors.', icon: MessageSquare },
    { title: 'File Distribution', desc: 'Class reps can upload handouts and lecture design pdf files cleanly.', icon: FileText }
  ];

  const testimonials = [
    { name: 'Dr. Sarah Jenkins', role: 'Chief Instructor, AI Dept', avatar: 'SJ', rating: 5, feedback: 'SANS completely transformed my lecture workflow. Students no longer miss class deadlines, and the quiz scheduling board is incredibly intuitive.' },
    { name: 'Arthur Dent', role: 'Course Representative', avatar: 'AD', rating: 5, feedback: 'The liaison ticketing dashboard makes it extremely simple to collect student connectivity issues and relay them to administrators and faculty.' },
    { name: 'Tricia McMillan', role: 'Computer Science Major', avatar: 'TM', rating: 5, feedback: 'I love the customizable layout and credit load tracker. The timetable matches our current slots perfectly, and downloads work with a single tap.' }
  ];

  const faqItems = [
    { q: 'How does SANS secure verified announcements?', a: 'SANS uses role-based access tokens. Only registered Lecturers and certified Course Representatives can draft notice alerts, which then undergo cryptographic approval rules before publication.' },
    { q: 'Can students upload resources into the portal?', a: 'No, to maintain resource validation guidelines, students are restricted to downloading verified documents. Only Lecturers and Course Representatives have file upload privileges.' },
    { q: 'Is there support for dark and light theme layouts?', a: 'Yes, SANS supports system-wide light and dark modes, carrying custom HSL color-scheme maps for each unique user dashboard.' },
    { q: 'How do I join my classes as a student?', a: 'Your lecturer or class representative will generate a unique CS101/SE206 class code token. Enter this token on your dashboard to instantly unlock materials.' }
  ];

  return (
    <div 
      className="min-h-screen bg-[#fcfcfd] dark:bg-[#07130a] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300 overflow-x-hidden selection:bg-[#1e7a34]/20 selection:text-[#1e7a34]"
      style={bgStyle}
    >
      
      {/* Sticky Navigation Bar */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 py-4 bg-white/90 dark:bg-[#07130a]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/60 shadow-md shadow-slate-100/5 px-6 transition-all duration-300"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1e7a34] to-[#3ea556] text-white flex items-center justify-center font-black text-lg shadow-md shadow-brand-green/20">
              S
            </div>
            <span className="text-slate-900 dark:text-white font-extrabold text-lg tracking-tight">SANS</span>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-655 dark:text-slate-350">
            <a href="#features" className="hover:text-[#1e7a34] transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-[#1e7a34] transition-colors">How It Works</a>
            <a href="#roles" className="hover:text-[#1e7a34] transition-colors">Roles</a>
            <a href="#why-sans" className="hover:text-[#1e7a34] transition-colors">Benefits</a>
            <a href="#faq" className="hover:text-[#1e7a34] transition-colors">FAQ</a>
          </div>

          {/* Navigation CTAs */}
          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="text-xs font-extrabold text-slate-700 dark:text-slate-200 hover:text-[#1e7a34] transition-colors px-4 py-2 cursor-pointer"
            >
              Sign In
            </button>
            
            <button 
              onClick={() => navigate('/register')}
              className="px-6 py-2.5 bg-[#1e7a34] hover:bg-[#258d3f] text-white rounded-xl text-xs font-black shadow-md shadow-brand-green/10 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border border-[#2b9b47]"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Menu Icon */}
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-[72px] left-6 right-6 bg-white dark:bg-[#0b170e] border border-slate-200/50 dark:border-slate-850 rounded-3xl p-6 shadow-large z-40 space-y-4 md:hidden"
          >
            <div className="flex flex-col gap-4 text-sm font-bold text-slate-655 dark:text-slate-350">
              <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#1e7a34] transition-colors py-1">Features</a>
              <a href="#how-it-works" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#1e7a34] transition-colors py-1">How It Works</a>
              <a href="#roles" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#1e7a34] transition-colors py-1">Roles</a>
              <a href="#why-sans" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#1e7a34] transition-colors py-1">Benefits</a>
              <a href="#faq" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#1e7a34] transition-colors py-1">FAQ</a>
            </div>
            
            <div className="h-px bg-slate-100 dark:bg-slate-800" />
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => { setIsMobileMenuOpen(false); navigate('/login'); }}
                className="w-full py-3 bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-2xl text-xs font-extrabold text-slate-700 dark:text-white"
              >
                Sign In
              </button>
              <button 
                onClick={() => { setIsMobileMenuOpen(false); navigate('/register'); }}
                className="w-full py-3 bg-[#1e7a34] text-white rounded-2xl text-xs font-black shadow-md"
              >
                Get Started
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-24 md:pt-40 md:pb-36 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left side info */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-5 space-y-6 text-left"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#f0f7f2] dark:bg-[#1e7a34]/15 border border-[#1e7a34]/15 rounded-full text-[#1e7a34] dark:text-[#3ea556] text-[10px] font-black uppercase tracking-widest">
            <Sparkles size={12} />
            <span>Academic Portal Redefined</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.08]">
            Never Miss an <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1e7a34] to-[#3ea556]">Academic Notice</span> Again.
          </h1>

          <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-semibold leading-relaxed max-w-lg">
            SANS consolidates course syllabus tracks, verified notice boards, and student queries into customized role dashboards for Students, Lecturers, and Class Reps.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="px-8 py-4 bg-gradient-to-r from-[#1e7a34] to-[#3ea556] hover:from-[#258d3f] hover:to-[#49bf63] text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-brand-green/20 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] transition-all border border-[#2b9b47]"
            >
              <span>Get Started</span>
              <ArrowRight size={14} strokeWidth={3} />
            </button>
            
            <a 
              href="#roles" 
              className="px-8 py-4 bg-white dark:bg-[#07130a] border border-[#1e7a34]/20 hover:border-[#1e7a34]/40 text-slate-700 dark:text-slate-200 font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              <span>Explore Demo</span>
            </a>
          </div>
        </motion.div>

        {/* Right side: Interactive Dashboard Preview */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="lg:col-span-7 flex flex-col items-center"
        >
          {/* Role selector tabs */}
          <div className="bg-white/90 dark:bg-[#0f1d13]/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 flex gap-2 mb-6 shadow-sm">
            {roles.map((r) => {
              const Icon = r.icon;
              const isActive = activeRole === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setActiveRole(r.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-[#1e7a34] text-white shadow-md' 
                      : 'text-slate-555 hover:text-[#1e7a34] dark:hover:text-white'
                  }`}
                >
                  <Icon size={14} />
                  <span>{r.title}</span>
                </button>
              );
            })}
          </div>

          {/* Interactive Screen Container */}
          <div className="w-full bg-[#0a120c] border border-slate-800/60 rounded-3xl overflow-hidden shadow-large relative aspect-[1.5/1]">
            {/* Window Header */}
            <div className="bg-[#101912] px-4 py-3 border-b border-slate-800/40 flex items-center justify-between shrink-0 select-none">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              </div>
              <div className="bg-[#050906] px-12 py-1 rounded-lg text-[9px] font-bold text-slate-500 tracking-wider">
                sans.edu/app/dashboard
              </div>
              <div className="w-8"></div>
            </div>

            {/* Simulated Workspace view */}
            <div className="p-5 h-[calc(100%-40px)] flex gap-4 text-left">
              {/* Sidebar */}
              <div className="w-36 border-r border-slate-800/40 pr-3 space-y-4 hidden sm:block shrink-0 select-none">
                <div className="space-y-1.5">
                  <div className="h-2.5 w-16 bg-slate-700/40 rounded mb-3"></div>
                  <div className="h-6 w-full bg-[#1e7a34]/15 border border-[#1e7a34]/15 text-[#3ea556] rounded-lg flex items-center px-2 gap-1.5 text-[9px] font-bold"><Zap size={10} />Home</div>
                  <div className="h-6 w-full rounded-lg flex items-center px-2 gap-1.5 text-[9px] font-semibold text-slate-500"><Bell size={10} />Announcements</div>
                  <div className="h-6 w-full rounded-lg flex items-center px-2 gap-1.5 text-[9px] font-semibold text-slate-500"><Calendar size={10} />Schedule</div>
                  <div className="h-6 w-full rounded-lg flex items-center px-2 gap-1.5 text-[9px] font-semibold text-slate-500"><FileText size={10} />Files</div>
                </div>
              </div>

              {/* Main Area */}
              <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                <AnimatePresence mode="wait">
                  {activeRole === 'student' && (
                    <motion.div 
                      key="student"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      {/* Banner */}
                      <div className="bg-[#1e7a34] p-4 rounded-2xl text-white space-y-1 shadow-sm">
                        <h4 className="text-xs font-black">Welcome Back, John Doe</h4>
                        <p className="text-[9px] text-[#f0f7f2] font-medium">Your overall Attendance is sitting at 94.2%</p>
                      </div>

                      {/* Content block */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#111c14] border border-slate-800/40 p-3 rounded-2xl space-y-1.5">
                          <span className="text-[8px] font-extrabold text-[#3ea556] uppercase tracking-widest">Notice from Dean</span>
                          <h5 className="text-[10px] font-extrabold text-white">Syllabus revision release</h5>
                          <p className="text-[9px] text-slate-400 font-semibold line-clamp-2">The syllabus guidelines have been updated for SE206 core tracks.</p>
                        </div>
                        
                        <div className="bg-[#111c14] border border-slate-800/40 p-3 rounded-2xl space-y-2">
                          <span className="text-[8px] font-extrabold text-[#3ea556] uppercase tracking-widest">Deadlines Checker</span>
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[9px] font-bold text-white">
                              <span className="truncate">DB Lab 4 Submission</span>
                              <span className="text-rose-455 shrink-0">Due Tomorrow</span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] font-bold text-white">
                              <span className="truncate">AI Planning Problems</span>
                              <span className="text-slate-400 shrink-0">July 12</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeRole === 'lecturer' && (
                    <motion.div 
                      key="lecturer"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      {/* Banner */}
                      <div className="bg-[#1e7a34] p-4 rounded-2xl text-white space-y-1 shadow-sm">
                        <h4 className="text-xs font-black">Faculty Console: Dr. Jenkins</h4>
                        <p className="text-[9px] text-[#f0f7f2] font-medium">Currently monitoring 2 courses with 102 total students.</p>
                      </div>

                      {/* Content block */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#111c14] border border-slate-800/40 p-3 rounded-2xl space-y-2.5">
                          <span className="text-[8px] font-extrabold text-[#3ea556] uppercase tracking-widest">Rep notice approvals</span>
                          <div className="p-2 bg-[#182a1d] border border-[#233f2b] rounded-xl flex justify-between items-center">
                            <div>
                              <p className="text-[9px] font-bold text-white">Dean Committee Sync</p>
                              <p className="text-[7px] text-slate-450 font-bold uppercase">Awaiting approval</p>
                            </div>
                            <button className="px-2 py-1 bg-[#1e7a34] hover:bg-[#258d3f] text-white text-[8px] font-black rounded-lg shrink-0">Verify</button>
                          </div>
                        </div>

                        <div className="bg-[#111c14] border border-slate-800/40 p-3 rounded-2xl space-y-2">
                          <span className="text-[8px] font-extrabold text-[#3ea556] uppercase tracking-widest">Active Quizzes</span>
                          <div className="space-y-1 text-[8px] font-bold text-slate-300">
                            <div className="flex justify-between items-center">
                              <span>Algorithms Quiz #1</span>
                              <span className="text-[#3ea556]">87% submitted</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>Database Quiz #2</span>
                              <span className="text-[#3ea556]">100% submitted</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeRole === 'rep' && (
                    <motion.div 
                      key="rep"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      {/* Banner */}
                      <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-4 rounded-2xl text-white space-y-1 shadow-sm">
                        <h4 className="text-xs font-black">Liaison Deck: Arthur Dent</h4>
                        <p className="text-[9px] text-amber-100 font-medium">Resolving student tickets. Open issues remaining: 1</p>
                      </div>

                      {/* Content block */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#111c14] border border-slate-800/40 p-3 rounded-2xl space-y-2">
                          <span className="text-[8px] font-extrabold text-amber-400 uppercase tracking-widest">Support tickets Log</span>
                          <div className="space-y-1.5">
                            <div className="p-1.5 bg-[#182a1d] border border-slate-800/40 rounded-lg flex items-center justify-between text-[8px] font-bold">
                              <span className="text-white truncate">Lab 3 Database Outage</span>
                              <span className="text-amber-400 shrink-0 font-extrabold">Open</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-[#111c14] border border-slate-800/40 p-3 rounded-2xl space-y-2 flex flex-col justify-between">
                          <div>
                            <span className="text-[8px] font-extrabold text-amber-400 uppercase tracking-widest">Ticket Resolution Target</span>
                            <div className="flex justify-between items-center text-[9px] font-bold text-white mt-1">
                              <span>Weekly Target</span>
                              <span>92% resolved</span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1 mt-1">
                            <div className="bg-amber-500 h-1 rounded-full" style={{ width: '92%' }}></div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Glowing blur */}
            <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full bg-[#1e7a34]/10 blur-3xl pointer-events-none select-none"></div>
          </div>
        </motion.div>
      </section>

      {/* TRUSTED / CREDIBILITY SECTION */}
      <section className="border-y border-slate-200/55 dark:border-slate-800/20 bg-white/40 dark:bg-[#07130a]/30 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-left">
            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Reliable Collaboration</h3>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1">SANS provides secure academic synchronization pipelines.</p>
          </div>
          
          <div className="flex flex-wrap items-center justify-start gap-8 lg:gap-12">
            {[
              { icon: Shield, text: 'Secure Protocols' },
              { icon: Sparkles, text: 'Verified Notices' },
              { icon: CheckCircle, text: 'No Stale Timelines' },
              { icon: Zap, text: 'Instant Sync Alerts' }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="flex items-center gap-2.5 text-slate-655 dark:text-slate-350">
                  <div className="w-8 h-8 rounded-lg bg-[#1e7a34]/5 text-[#1e7a34] dark:text-[#3ea556] flex items-center justify-center"><Icon size={15} /></div>
                  <span className="text-xs font-bold">{item.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FEATURES SECTION (Bento Grid) */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#f0f7f2] dark:bg-[#1e7a34]/15 border border-[#1e7a34]/15 rounded-full text-[#1e7a34] dark:text-[#3ea556] text-[10px] font-black uppercase tracking-widest">
            <Layers size={11} />
            <span>Robust Feature Catalog</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Features Tailored for Higher Education
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
            From assignment logs to dean liaison minutes, SANS provides the exact tools required to streamline class communications.
          </p>
        </div>

        {/* Bento Grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {features.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div 
                key={idx}
                whileHover={{ y: -4, scale: 1.01 }}
                className="bg-white dark:bg-[#0c160f] border border-slate-200/50 dark:border-slate-800/40 rounded-3xl p-6 shadow-soft text-left space-y-4 hover:shadow-medium transition-all duration-300 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-2xl bg-[#f0f7f2] dark:bg-slate-900 text-[#1e7a34] dark:text-[#3ea556] flex items-center justify-center group-hover:bg-gradient-to-tr group-hover:from-[#1e7a34] group-hover:to-[#3ea556] group-hover:text-white transition-all shadow-sm">
                  <Icon size={16} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-sm group-hover:text-[#1e7a34] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-slate-455 dark:text-slate-400 leading-relaxed font-semibold">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="border-t border-slate-200/55 dark:border-slate-800/20 bg-white/40 dark:bg-[#07130a]/30 py-24 px-6">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">How SANS Coordinates Your Term</h2>
            <p className="text-xs text-slate-505 dark:text-slate-400 font-semibold leading-relaxed">
              Unlock a unified workspace in four steps. Secure onboarding ensures authentication integrity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { num: '01', title: 'Register Account', desc: 'Create your credentials in seconds using secure auth forms.' },
              { num: '02', title: 'Choose Your Role', desc: 'Select Student, Lecturer, or Representative during registry.' },
              { num: '03', title: 'Join Class Catalogs', desc: 'Plug class tokens to automatically synchronize course logs.' },
              { num: '04', title: 'Stay Connected', desc: 'Receive real-time push notice updates and check deadlines.' }
            ].map((step, idx) => (
              <div key={idx} className="relative text-left space-y-3 p-4">
                <span className="text-3xl font-black text-[#1e7a34]/10 dark:text-white/5 block">{step.num}</span>
                <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-150">{step.title}</h4>
                <p className="text-[11px] text-slate-455 dark:text-slate-400 font-semibold leading-relaxed">{step.desc}</p>
                {idx < 3 && (
                  <span className="hidden md:block absolute top-12 -right-4 w-8 h-px bg-slate-200 dark:bg-slate-800"></span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DASHBOARDS SHOWCASE */}
      <section id="roles" className="py-24 px-6 max-w-7xl mx-auto space-y-16">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">Unified Design. Role-Specific Dashboards.</h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
            Each role uses an application specifically tailored for their daily tasks, using consistent, premium UI design systems.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Student */}
          <div className="bg-white dark:bg-[#0c160f] border border-slate-200/50 dark:border-slate-800/40 rounded-[2rem] p-8 shadow-soft flex flex-col justify-between hover:shadow-medium transition-all duration-300">
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-[#1e7a34] flex items-center justify-center"><GraduationCap size={22} /></div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Student Workspace</h3>
                <p className="text-xs text-slate-450 dark:text-slate-400 font-semibold leading-relaxed">
                  Track homework task submission checkmarks, register for class codes, view timetables, and download lecture notes.
                </p>
              </div>
              <ul className="space-y-3.5 pt-4 text-xs text-slate-655 dark:text-slate-350 font-bold">
                <li className="flex items-center gap-2.5"><CheckCircle size={14} className="text-[#1e7a34] shrink-0" />View verified notices</li>
                <li className="flex items-center gap-2.5"><CheckCircle size={14} className="text-[#1e7a34] shrink-0" />Dynamic credit load metrics</li>
                <li className="flex items-center gap-2.5"><CheckCircle size={14} className="text-[#1e7a34] shrink-0" />Attendance tracker</li>
                <li className="flex items-center gap-2.5"><CheckCircle size={14} className="text-[#1e7a34] shrink-0" />Download pdf documents only</li>
              </ul>
            </div>
            <button 
              onClick={() => navigate('/login')} 
              className="mt-8 w-full py-3 bg-[#f0f7f2] hover:bg-[#e1f0e5] text-[#1e7a34] hover:text-[#18642a] rounded-xl text-xs font-black border border-[#1e7a34]/15 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer shadow-sm"
            >
              Enter Student Portal
            </button>
          </div>

          {/* Lecturer */}
          <div className="bg-white dark:bg-[#0c160f] border border-slate-200/50 dark:border-slate-800/40 rounded-[2rem] p-8 shadow-soft flex flex-col justify-between hover:shadow-medium transition-all duration-300">
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center"><Users size={22} /></div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Lecturer Workspace</h3>
                <p className="text-xs text-slate-450 dark:text-slate-400 font-semibold leading-relaxed">
                  Post emergency class notices, manage syllabus status percentages, coordinate quiz allocations, and upload slides.
                </p>
              </div>
              <ul className="space-y-3.5 pt-4 text-xs text-slate-655 dark:text-slate-350 font-bold">
                <li className="flex items-center gap-2.5"><CheckCircle size={14} className="text-[#1e7a34] shrink-0" />Verified notice creation</li>
                <li className="flex items-center gap-2.5"><CheckCircle size={14} className="text-[#1e7a34] shrink-0" />Quiz schedules creator</li>
                <li className="flex items-center gap-2.5"><CheckCircle size={14} className="text-[#1e7a34] shrink-0" />Approved handouts upload</li>
                <li className="flex items-center gap-2.5"><CheckCircle size={14} className="text-[#1e7a34] shrink-0" />Student roster review metrics</li>
              </ul>
            </div>
            <button 
              onClick={() => navigate('/login')} 
              className="mt-8 w-full py-3 bg-[#f0f7f2] hover:bg-[#e1f0e5] text-[#1e7a34] hover:text-[#18642a] rounded-xl text-xs font-black border border-[#1e7a34]/15 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer shadow-sm"
            >
              Enter Faculty Console
            </button>
          </div>

          {/* Rep */}
          <div className="bg-white dark:bg-[#0c160f] border border-slate-200/50 dark:border-slate-800/40 rounded-[2rem] p-8 shadow-soft flex flex-col justify-between hover:shadow-medium transition-all duration-300">
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center"><Shield size={22} /></div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Liaison Deck</h3>
                <p className="text-xs text-slate-455 dark:text-slate-400 font-semibold leading-relaxed">
                  Log committee sync minutes, escalate student connectivity queries, compile directories, and invite classmates.
                </p>
              </div>
              <ul className="space-y-3.5 pt-4 text-xs text-slate-655 dark:text-slate-350 font-bold">
                <li className="flex items-center gap-2.5"><CheckCircle size={14} className="text-[#1e7a34] shrink-0" />Add notices approval requests</li>
                <li className="flex items-center gap-2.5"><CheckCircle size={14} className="text-[#1e7a34] shrink-0" />Minute resolutions compiler</li>
                <li className="flex items-center gap-2.5"><CheckCircle size={14} className="text-[#1e7a34] shrink-0" />Student support ticketing</li>
                <li className="flex items-center gap-2.5"><CheckCircle size={14} className="text-[#1e7a34] shrink-0" />Invite classmates to portals</li>
              </ul>
            </div>
            <button 
              onClick={() => navigate('/login')} 
              className="mt-8 w-full py-3 bg-[#f0f7f2] hover:bg-[#e1f0e5] text-[#1e7a34] hover:text-[#18642a] rounded-xl text-xs font-black border border-[#1e7a34]/15 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer shadow-sm"
            >
              Enter Liaison Deck
            </button>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE SANS */}
      <section id="why-sans" className="border-t border-slate-200/55 dark:border-slate-800/20 bg-white/40 dark:bg-[#07130a]/30 py-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 text-left space-y-4">
            <span className="text-xs font-black text-[#1e7a34] dark:text-[#3ea556] uppercase tracking-widest">Engineered for Academic Success</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Why Institutions Choose SANS</h2>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
              Standard group chats and announcement groups suffer from notice clutter, duplicate requests, and lack of verification. SANS solves this with role boundaries and customized dashboard workspaces.
            </p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { title: 'Zero Notice Clutter', desc: 'No repetitive messages. High-priority announcements are highlighted.' },
              { title: 'Role Boundaries', desc: 'Students, instructors, and representatives use workspaces matching their tasks.' },
              { title: 'Secure Onboarding', desc: 'Roster validation restricts access to authentic course participants.' },
              { title: 'Centralized Files', desc: 'No hunting through chat histories. Access files on clean Explorer tables.' }
            ].map((benefit, idx) => (
              <div key={idx} className="bg-white dark:bg-[#0c160f] border border-slate-200/50 dark:border-slate-800/40 rounded-3xl p-6 shadow-soft text-left space-y-2">
                <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-150 flex items-center gap-2">
                  <CheckCircle size={15} className="text-[#1e7a34]" />
                  <span>{benefit.title}</span>
                </h4>
                <p className="text-[11px] text-slate-455 dark:text-slate-400 font-semibold leading-relaxed">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section className="py-24 px-6 max-w-7xl mx-auto space-y-16">
        <div className="text-center max-w-xl mx-auto space-y-3">
          <span className="text-xs font-black text-[#1e7a34] dark:text-[#3ea556] uppercase tracking-widest">Endorsed by Academics</span>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Fidelity Endorsements</h2>
          <p className="text-xs text-slate-505 dark:text-slate-400 font-semibold leading-relaxed">
            See what students and class representatives say about SANS.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((test, idx) => (
            <div key={idx} className="bg-white dark:bg-[#0c160f] border border-slate-200/50 dark:border-slate-800/40 rounded-3xl p-6 shadow-soft text-left flex flex-col justify-between space-y-6 hover:shadow-medium transition-all duration-300">
              <div className="space-y-4">
                <div className="flex gap-1">
                  {[...Array(test.rating)].map((_, i) => (
                    <Star key={i} size={12} className="text-amber-500 fill-amber-500" />
                  ))}
                </div>
                <p className="text-[11px] text-slate-655 dark:text-slate-350 italic font-semibold leading-relaxed">
                  "{test.feedback}"
                </p>
              </div>
              <div className="flex items-center gap-3 border-t border-slate-100 dark:border-slate-800/40 pt-4">
                <div className="w-9 h-9 rounded-full bg-[#1e7a34]/10 text-[#1e7a34] font-black flex items-center justify-center text-xs animate-none select-none">
                  {test.avatar}
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-150">{test.name}</h4>
                  <p className="text-[9px] text-slate-400 font-extrabold uppercase">{test.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* STATISTICS SECTION */}
      <section className="border-y border-slate-200/55 dark:border-slate-800/20 bg-white/40 dark:bg-[#07130a]/30 py-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: 'Active Students', value: 1200 },
            { label: 'Course Classes', value: 48 },
            { label: 'Resources Shared', value: 850 },
            { label: 'Announcements Delivered', value: 3200 }
          ].map((stat, idx) => (
            <div key={idx} className="text-center space-y-1">
              <p className="text-2xl md:text-3xl font-black text-[#1e7a34]">
                <CountUp to={stat.value} />
                <span>+</span>
              </p>
              <p className="text-[10px] text-slate-455 dark:text-slate-400 font-black uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-24 px-6 max-w-3xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Frequently Asked Questions</h2>
          <p className="text-xs text-slate-505 dark:text-slate-400 font-semibold leading-relaxed">
            Have questions about roles, files or notice approvals?
          </p>
        </div>

        <div className="space-y-4 pt-4">
          {faqItems.map((item, idx) => {
            const isOpen = faqOpen === idx;
            return (
              <div 
                key={idx} 
                className="bg-white dark:bg-[#0c160f] border border-slate-200/50 dark:border-slate-800/40 rounded-2xl shadow-soft overflow-hidden"
              >
                <button
                  onClick={() => setFaqOpen(isOpen ? null : idx)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left font-extrabold text-xs text-slate-800 dark:text-slate-150 cursor-pointer"
                >
                  <span>{item.q}</span>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <div className="bg-gradient-to-tr from-[#1e7a34] to-[#3ea556] rounded-[3rem] p-12 text-center text-white relative overflow-hidden shadow-large space-y-6 border border-[#2b9b47]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight max-w-xl mx-auto">
            Ready to Streamline Class Notification Workflows?
          </h2>
          
          <p className="text-xs text-[#f0f7f2] font-semibold max-w-md mx-auto leading-relaxed">
            Create your account today, lock class tokens, and receive verified notice publications instantly.
          </p>

          <div className="pt-4">
            <button 
              onClick={() => navigate('/register')}
              className="px-8 py-4 bg-white hover:bg-slate-50 text-[#1e7a34] font-black rounded-2xl text-xs uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              Create Your Account
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200/55 dark:border-slate-800/40 bg-white/55 dark:bg-[#07130a]/30 pt-16 pb-8 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-left">
          
          {/* Logo & Desc */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#1e7a34] to-[#3ea556] text-white flex items-center justify-center font-black text-base shadow-md">
                S
              </div>
              <span className="text-slate-900 dark:text-white font-extrabold text-base tracking-tight">SANS</span>
            </div>
            <p className="text-[11px] text-slate-455 dark:text-slate-450 leading-relaxed font-semibold">
              The Smart Academic Notification System coordinates class rosters, verified notice approvals, and files.
            </p>
          </div>

          {/* Links 1 */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">Platform</h4>
            <ul className="space-y-2 text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider">
              <li><a href="#features" className="hover:text-[#1e7a34]">Features</a></li>
              <li><a href="#roles" className="hover:text-[#1e7a34]">User Workspaces</a></li>
              <li><a href="#how-it-works" className="hover:text-[#1e7a34]">How It Works</a></li>
            </ul>
          </div>

          {/* Links 2 */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">Security</h4>
            <ul className="space-y-2 text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider">
              <li><a href="#" className="hover:text-[#1e7a34]">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#1e7a34]">Terms of Service</a></li>
              <li><a href="#" className="hover:text-[#1e7a34]">Institutional SLA</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">Contact Information</h4>
            <p className="text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider leading-relaxed">
              support@sans.edu<br />
              SANS Technical Team<br />
              Lab Annex 4, Campus CS
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto border-t border-slate-100 dark:border-slate-800/40 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-black text-slate-400 dark:text-slate-505 uppercase tracking-wider">
          <span>Smart Academic Notification System © 2026</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[#1e7a34]">Twitter</a>
            <a href="#" className="hover:text-[#1e7a34]">GitHub</a>
            <a href="#" className="hover:text-[#1e7a34]">LinkedIn</a>
          </div>
        </div>
      </footer>

    </div>
  );
};

// Simple inline Megaphone icon placeholder
const MegaphoneIcon: React.FC<any> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <path d="m3 11 18-5v12L3 13v-2z" />
    <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
  </svg>
);

export default LandingPage;
