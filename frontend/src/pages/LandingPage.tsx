import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

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
  ChevronDown, 
  Layers, 
  Target, 
  Database, 
  UserCheck, 
  UploadCloud, 
  Lock, 
  Cpu, 
  Share2, 
  Radio
} from 'lucide-react';

import { api } from '../lib/axios';

// CountUp component using requestAnimationFrame and IntersectionObserver
// Animates counting DOWNWARDS from a fixed baseline start number down to the live real-time system metrics
const CountUp: React.FC<{ from?: number; to: number; duration?: number }> = ({ from = 500, to, duration = 2.5 }) => {
  const [count, setCount] = useState(from);
  const elementRef = useRef<HTMLSpanElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const startAnimation = (startVal: number, endVal: number) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    const totalFrames = Math.max(30, Math.round(duration * 60));
    let frame = 0;

    const animate = () => {
      frame++;
      const progress = frame / totalFrames;
      // Smooth cubic ease-out curve
      const easeOutProgress = 1 - Math.pow(1 - progress, 3);
      // Count downwards from startVal reading down to endVal
      const current = Math.round(startVal - (startVal - endVal) * easeOutProgress);
      setCount(current);

      if (frame < totalFrames) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setCount(endVal);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          startAnimation(from, to);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      observer.disconnect();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [from, to]);

  useEffect(() => {
    startAnimation(from, to);
  }, [from, to]);

  return <span ref={elementRef}>{count.toLocaleString()}</span>;
};

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeRole, setActiveRole] = useState<'student' | 'lecturer' | 'rep'>('student');
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<'student' | 'lecturer' | 'rep'>('student');
  
  // Real system stats fetched directly from Cloudflare D1 / SQLite database
  const [systemStats, setSystemStats] = useState({
    activeStudents: 0,
    courseClasses: 0,
    resourcesShared: 0,
    announcementsDelivered: 0,
  });

  useEffect(() => {
    api.get('/system/public-stats')
      .then((res) => {
        if (res.data) {
          setSystemStats({
            activeStudents: res.data.activeStudents ?? res.data.ActiveStudents ?? 0,
            courseClasses: res.data.courseClasses ?? res.data.CourseClasses ?? 0,
            resourcesShared: res.data.resourcesShared ?? res.data.ResourcesShared ?? 0,
            announcementsDelivered: res.data.announcementsDelivered ?? res.data.AnnouncementsDelivered ?? 0,
          });
        }
      })
      .catch((err) => {
        console.warn('System public-stats fetch error:', err);
      });
  }, []);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['features', 'how-it-works', 'roles', 'platform-engine', 'faq'];
      if (window.scrollY < 200) {
        setActiveSection('home');
        return;
      }
      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 200 && rect.bottom >= 200) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const bgStyle = {
    backgroundImage: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.84), rgba(255, 255, 255, 0.90)), url("/sans_landing_background.jpg")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed' as const
  };

  // Auto-rotate dashboard preview mockup tabs
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveRole((prev) => {
        if (prev === 'student') return 'lecturer';
        if (prev === 'lecturer') return 'rep';
        return 'student';
      });
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const roles = [
    { id: 'student', title: 'Student Workspace', icon: GraduationCap },
    { id: 'lecturer', title: 'Faculty Console', icon: UserCheck },
    { id: 'rep', title: 'Liaison Deck', icon: Shield }
  ];

  const features = [
    { 
      title: 'Class Workspaces & Catalogs', 
      desc: 'Dedicated portals for every course workspace. Join instantly via class codes (e.g. CS101, EL300).', 
      icon: Layers 
    },
    { 
      title: 'Verified Academic Announcements', 
      desc: 'Official notices published by lecturers and representatives with priority badges, categories, and verification status.', 
      icon: Bell 
    },
    { 
      title: 'Assignments & File Submissions', 
      desc: 'Coursework assignments with downloadable instructions, max points, late penalty calculation, and submission previews.', 
      icon: Clock 
    },
    { 
      title: 'Cloudflare R2 Learning Resources', 
      desc: 'Centralized document library for lecture slides, syllabus guides, and PDFs hosted on high-speed Cloudflare R2 storage.', 
      icon: BookOpen 
    },
    { 
      title: 'Class Discussion Forums', 
      desc: 'Interactive academic discussion threads with categorized topics, nested replies, and pinned/locked moderation.', 
      icon: MessageSquare 
    },
    { 
      title: 'Class & Master Timetables', 
      desc: 'Unified weekly lecture schedules with room numbers, campus buildings, and official university master timetable downloads.', 
      icon: Calendar 
    },
    { 
      title: 'Quiz Scheduling & Alerts', 
      desc: 'Schedule quizzes with date countdowns, question counts, and points value directly in class workspaces.', 
      icon: Target 
    },
    { 
      title: 'Firebase Auth & Cloudflare D1', 
      desc: 'Enterprise security powered by Firebase Authentication linked directly to Cloudflare D1 relational database storage.', 
      icon: Database 
    },
    { 
      title: 'Role-Based Access Control', 
      desc: 'Tailored views and permissions scoped specifically for Students, Lecturers, Course Representatives, and Administrators.', 
      icon: Users 
    }
  ];

  const studentWorkflow = [
    { num: '01', title: 'Register Account', desc: 'Create your account securely using Firebase Authentication.' },
    { num: '02', title: 'Join Class Workspace', desc: 'Enter your class code token (e.g., CE101) to unlock your workspace.' },
    { num: '03', title: 'Access Workspace Feed', desc: 'Receive verified notices, view class timetables, and download lecture slides.' },
    { num: '04', title: 'Engage & Submit', desc: 'Participate in discussion threads and complete coursework assignments.' }
  ];

  const lecturerWorkflow = [
    { num: '01', title: 'Request Lecturer Access', desc: 'Register and request faculty verification for official teaching access.' },
    { num: '02', title: 'Access Teaching Console', desc: 'Select your assigned course workspace and view student enrollment rosters.' },
    { num: '03', title: 'Publish Notices & Slides', desc: 'Post verified announcements and upload lecture materials to Cloudflare R2.' },
    { num: '04', title: 'Manage Coursework', desc: 'Schedule upcoming quizzes and issue assignments with penalty rules.' }
  ];

  const repWorkflow = [
    { num: '01', title: 'Register as Student', desc: 'Create your account and enroll into your academic level class.' },
    { num: '02', title: 'Liaison Designation', desc: 'Get designated as Course Representative for your workspace.' },
    { num: '03', title: 'Manage Class Timetable', desc: 'Create class workspaces, update weekly schedules, and post notices.' },
    { num: '04', title: 'Coordinate Activities', desc: 'Upload master timetable files and facilitate class communication.' }
  ];

  const systemCapabilities = [
    {
      title: 'Real-Time Notification Pipeline',
      desc: 'Verified announcements broadcast instantly to enrolled student feeds with priority tags, categories, and push notifications.',
      icon: Radio,
      badge: 'Instant Sync'
    },
    {
      title: 'Cloudflare R2 Document Vault',
      desc: 'Lecture slides, syllabus documents, and assignment attachments served directly via global Cloudflare R2 object storage.',
      icon: UploadCloud,
      badge: 'High Performance'
    },
    {
      title: 'Academic Discussion Engine',
      desc: 'Dedicated class Q&A forums featuring nested comment threads, category filtering, and instructor resolution badges.',
      icon: Share2,
      badge: 'Collaborative'
    },
    {
      title: 'Cloudflare D1 Relational Engine',
      desc: 'Edge-replicated SQLite relational persistence linked with Firebase Auth credentials for bulletproof data integrity.',
      icon: Cpu,
      badge: 'Cloudflare Edge'
    }
  ];

  const faqItems = [
    { 
      q: 'How does Firebase Authentication and Cloudflare D1 secure user data?', 
      a: 'Firebase Authentication manages password credentials and token issuance securely, while Cloudflare D1 relational database persists user profiles, class workspaces, and academic records linked via Firebase UID.' 
    },
    { 
      q: 'How do Course Representatives manage class timetables and workspaces?', 
      a: 'Course Representatives can create class workspaces, build weekly class schedules with room and building details, post class notices, and upload master timetable documents for their class.' 
    },
    { 
      q: 'How are learning resources and assignment files stored and downloaded?', 
      a: 'Files are uploaded directly to Cloudflare R2 high-speed object storage. Students and lecturers can preview and download documents with high reliability and fast global access.' 
    },
    { 
      q: 'What happens when a lecturer posts a notice on SANS?', 
      a: 'Notices posted by verified lecturers automatically carry a "Verified" badge and priority status, instantly notifying all enrolled students across their class workspace feeds.' 
    },
    { 
      q: 'Can students participate in academic discussions?', 
      a: 'Yes! Every class workspace features a dedicated Discussion Forum where students and instructors can post categorized threads, reply in nested comments, and resolve academic queries.' 
    }
  ];

  return (
    <div 
      className="min-h-screen bg-white text-slate-800 font-sans overflow-x-hidden selection:bg-[#1e7a34]/20 selection:text-[#1e7a34] relative"
      style={bgStyle}
    >
      {/* Background Ambient Glow Lights */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-[#1e7a34]/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute top-96 right-1/4 w-96 h-96 bg-[#3ea556]/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

      {/* Sticky Navigation Bar */}
      <div className="fixed top-4 left-0 right-0 z-50 px-6 flex justify-center w-full">
        <motion.nav 
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-7xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-white/60 dark:border-slate-800/40 shadow-[0_8px_32px_0_rgba(15,23,42,0.06)] rounded-2xl px-6 py-3.5 transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1e7a34] to-[#3ea556] text-white flex items-center justify-center font-black text-lg shadow-md shadow-emerald-600/20">
                S
              </div>
              <div className="flex flex-col">
                <span className="text-slate-900 dark:text-white font-extrabold text-lg tracking-tight leading-none">SANS</span>
                <span className="text-[9px] font-bold text-[#1e7a34] dark:text-emerald-400 tracking-wider">ACADEMIC HUB</span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
              {[
                { id: 'features', label: 'Features', href: '#features' },
                { id: 'how-it-works', label: 'Workflows', href: '#how-it-works' },
                { id: 'roles', label: 'Workspaces', href: '#roles' },
                { id: 'platform-engine', label: 'Platform Engine', href: '#platform-engine' },
                { id: 'faq', label: 'FAQ', href: '#faq' },
              ].map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    className={`relative px-4 py-2 rounded-xl transition-all duration-300 flex items-center justify-center hover:text-[#1e7a34] dark:hover:text-white ${
                      isActive 
                        ? 'text-[#1e7a34] dark:text-white font-black' 
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {isActive && (
                      <div 
                        className="absolute inset-0 bg-gradient-to-b from-[#1e7a34]/10 dark:from-white/12 to-transparent pointer-events-none rounded-xl" 
                        style={{ clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)' }}
                      />
                    )}
                    {isActive && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2.5px] bg-[#1e7a34] dark:bg-white rounded-b-full shadow-[0_0_6px_rgba(30,122,52,0.6)]" />
                    )}
                    <span className="relative z-10">{item.label}</span>
                  </a>
                );
              })}
            </div>

            {/* Navigation Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <button 
                onClick={() => navigate('/login')}
                className="text-xs font-extrabold text-slate-700 dark:text-slate-300 hover:text-[#1e7a34] dark:hover:text-white transition-colors px-4 py-2 cursor-pointer"
              >
                Sign In
              </button>
              
              {/* Rotating lightning border button for Join Portal */}
              <div 
                onClick={() => navigate('/register')}
                className="relative p-[1.5px] rounded-xl overflow-hidden flex items-center justify-center group active:scale-[0.98] transition-transform select-none shadow-md cursor-pointer"
              >
                <div className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_20%,#3ea556_40%,#1e7a34_60%,transparent_80%)] opacity-100 group-hover:animate-[spin_1.5s_linear_infinite]" />
                <div className="relative px-5 py-2 bg-gradient-to-r from-[#1e7a34] to-[#3ea556] text-white text-xs font-extrabold rounded-[10px] flex items-center justify-center gap-1.5">
                  <span>Join SANS Portal</span>
                  <Zap size={11} className="text-emerald-200 fill-emerald-200 animate-pulse" />
                </div>
              </div>
            </div>

            {/* Mobile menu trigger */}
            <div className="md:hidden">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-slate-700 dark:text-slate-200"
              >
                <div className="space-y-1.5">
                  <span className="block w-6 h-0.5 bg-current"></span>
                  <span className="block w-6 h-0.5 bg-current"></span>
                  <span className="block w-6 h-0.5 bg-current"></span>
                </div>
              </button>
            </div>
          </div>
        </motion.nav>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="fixed top-20 left-6 right-6 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl md:hidden"
          >
            <div className="flex flex-col gap-4 text-center">
              <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-extrabold text-slate-800 dark:text-slate-200 py-2 border-b border-slate-100 dark:border-slate-800">Features</a>
              <a href="#how-it-works" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-extrabold text-slate-800 dark:text-slate-200 py-2 border-b border-slate-100 dark:border-slate-800">Workflows</a>
              <a href="#roles" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-extrabold text-slate-800 dark:text-slate-200 py-2 border-b border-slate-100 dark:border-slate-800">Workspaces</a>
              <a href="#platform-engine" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-extrabold text-slate-800 dark:text-slate-200 py-2 border-b border-slate-100 dark:border-slate-800">Platform Engine</a>
              <a href="#faq" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-extrabold text-slate-800 dark:text-slate-200 py-2 border-b border-slate-100 dark:border-slate-800">FAQ</a>
              
              <div className="pt-2 flex flex-col gap-3">
                <button 
                  onClick={() => { setIsMobileMenuOpen(false); navigate('/login'); }}
                  className="w-full py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-extrabold text-slate-800 dark:text-white"
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
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#f0f7f2] dark:bg-emerald-950/50 border border-[#1e7a34]/20 rounded-full text-[#1e7a34] dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest">
            <Sparkles size={12} />
            <span>Centralized Academic Collaboration</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.1]">
            Never Miss an <br className="hidden sm:inline" />
            <span className="text-[#1e7a34] dark:text-emerald-400">Academic Notice</span> <br className="hidden sm:inline" />
            Again.
          </h1>

          <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 font-semibold leading-relaxed max-w-lg">
            SANS consolidates course syllabus tracks, verified notice boards, and student queries into customized role dashboards for Students, Lecturers, and Class Reps.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => navigate('/register')}
              className="px-8 py-4 bg-[#1e7a34] hover:bg-[#18632a] text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2.5 cursor-pointer hover:scale-[1.01] transition-all"
            >
              <span>GET STARTED</span>
              <ArrowRight size={15} strokeWidth={3} />
            </button>

            {/* Rotating Lightning Border Animation on Sign In Button */}
            <div 
              onClick={() => navigate('/login')}
              className="relative p-[1.5px] rounded-2xl overflow-hidden flex items-center justify-center group active:scale-[0.98] transition-transform select-none shadow-md cursor-pointer"
            >
              <div className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_20%,#3ea556_40%,#1e7a34_60%,transparent_80%)] opacity-100 group-hover:animate-[spin_1.5s_linear_infinite]" />
              
              <div className="relative px-8 py-4 bg-white hover:bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-extrabold rounded-[14px] text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 w-full h-full">
                <span>Sign In to Portal</span>
                <Zap size={13} className="text-[#3ea556] fill-[#3ea556] animate-pulse" />
              </div>
            </div>
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
          <div className="flex flex-wrap gap-3 mb-6 select-none justify-center">
            {roles.map((r) => {
              const Icon = r.icon;
              const isActive = activeRole === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setActiveRole(r.id as any)}
                  className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer border shadow-sm ${
                    isActive 
                      ? 'bg-[#1e7a34] text-white border-[#1e7a34] scale-[1.03] shadow-md shadow-[#1e7a34]/20' 
                      : 'bg-white/90 backdrop-blur-sm border-slate-200 text-slate-700 hover:border-[#1e7a34]/40 hover:text-[#1e7a34]'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-white' : 'text-[#1e7a34]'} />
                  <span>{r.title}</span>
                </button>
              );
            })}
          </div>

          {/* Interactive Screen Container */}
          <div className="w-full bg-[#0a120c] border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl relative aspect-[1.5/1]">
            {/* Window Header */}
            <div className="bg-[#101912] px-4 py-3 border-b border-slate-800/60 flex items-center justify-between shrink-0 select-none">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              </div>
              <div className="bg-[#050906] px-8 py-1 rounded-lg text-[9px] font-bold text-slate-400 tracking-wider">
                sans.edu/app/workspace/CE101
              </div>
              <div className="w-8"></div>
            </div>

            {/* Simulated Workspace view */}
            <div className="p-5 h-[calc(100%-40px)] flex gap-4 text-left">
              {/* Sidebar */}
              <div className="w-40 border-r border-slate-800/60 pr-3 space-y-4 hidden sm:block shrink-0 select-none">
                <div className="space-y-1.5">
                  <div className="h-2.5 w-16 bg-slate-700/40 rounded mb-3"></div>
                  <div className="h-6 w-full bg-[#1e7a34]/20 border border-[#1e7a34]/30 text-[#3ea556] rounded-lg flex items-center px-2 gap-1.5 text-[9px] font-bold"><Zap size={10} />Feed</div>
                  <div className="h-6 w-full rounded-lg flex items-center px-2 gap-1.5 text-[9px] font-semibold text-slate-400"><Bell size={10} />Notices</div>
                  <div className="h-6 w-full rounded-lg flex items-center px-2 gap-1.5 text-[9px] font-semibold text-slate-400"><Clock size={10} />Assignments</div>
                  <div className="h-6 w-full rounded-lg flex items-center px-2 gap-1.5 text-[9px] font-semibold text-slate-400"><BookOpen size={10} />R2 Resources</div>
                  <div className="h-6 w-full rounded-lg flex items-center px-2 gap-1.5 text-[9px] font-semibold text-slate-400"><Calendar size={10} />Timetable</div>
                  <div className="h-6 w-full rounded-lg flex items-center px-2 gap-1.5 text-[9px] font-semibold text-slate-400"><MessageSquare size={10} />Discussions</div>
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
                      className="space-y-3"
                    >
                      {/* Banner */}
                      <div className="bg-gradient-to-r from-[#1e7a34] to-[#3ea556] p-3.5 rounded-2xl text-white space-y-1 shadow-sm">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-black">Cybersecurity — Class Workspace</h4>
                          <span className="text-[8px] bg-white/20 px-2 py-0.5 rounded-full font-bold">CE101</span>
                        </div>
                        <p className="text-[9px] text-[#f0f7f2] font-medium">3 verified announcements, 1 upcoming assignment due.</p>
                      </div>

                      {/* Content block */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/95 border border-slate-200 p-3 rounded-2xl space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[8px] font-extrabold text-[#1e7a34] uppercase tracking-widest">Verified Notice</span>
                            <span className="text-[7px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Verified</span>
                          </div>
                          <h5 className="text-[10px] font-extrabold text-slate-800">Midterm Lab Guidelines</h5>
                          <p className="text-[9px] text-slate-500 font-semibold line-clamp-2">Please submit your lab reports through the assignment portal before Thursday 11:59 PM.</p>
                        </div>
                        
                        <div className="bg-white/95 border border-slate-200 p-3 rounded-2xl space-y-2">
                          <span className="text-[8px] font-extrabold text-[#1e7a34] uppercase tracking-widest">Assignment Due</span>
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[9px] font-bold text-slate-800">
                              <span className="truncate">HCI Lab Report #2</span>
                              <span className="text-amber-600 shrink-0 font-extrabold">Due July 28</span>
                            </div>
                            <div className="flex items-center gap-1 text-[8px] text-slate-500 font-semibold">
                              <BookOpen size={9} className="text-[#1e7a34]" />
                              <span>Attached: Guidelines.pdf (Cloudflare R2)</span>
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
                      className="space-y-3"
                    >
                      {/* Banner */}
                      <div className="bg-gradient-to-r from-[#1e7a34] to-[#3ea556] p-3.5 rounded-2xl text-white space-y-1 shadow-sm">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-black">Faculty Console: Dr. Raymond Bosiako</h4>
                          <span className="text-[8px] bg-emerald-950/40 px-2 py-0.5 rounded-full font-bold">Verified Faculty</span>
                        </div>
                        <p className="text-[9px] text-[#f0f7f2] font-medium">Currently directing 2 course workspaces with 102 total students.</p>
                      </div>

                      {/* Content block */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/95 border border-slate-200 p-3 rounded-2xl space-y-2">
                          <span className="text-[8px] font-extrabold text-[#1e7a34] uppercase tracking-widest">Post Verified Notice</span>
                          <div className="p-2 bg-[#f0f7f2] border border-[#d6eedd] rounded-xl space-y-1">
                            <p className="text-[9px] font-bold text-slate-800">Exam Preparation Guidelines</p>
                            <div className="flex justify-between items-center text-[7px] text-slate-500 font-bold">
                              <span>Priority: High</span>
                              <span className="text-[#1e7a34]">Verified Badge Active</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white/95 border border-slate-200 p-3 rounded-2xl space-y-2">
                          <span className="text-[8px] font-extrabold text-[#1e7a34] uppercase tracking-widest">R2 Resource Storage</span>
                          <div className="space-y-1 text-[8px] font-bold text-slate-700">
                            <div className="flex justify-between items-center">
                              <span>Lecture_Slides_W6.pdf</span>
                              <span className="text-[#3ea556]">Uploaded R2</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>Cybersecurity_Syllabus.docx</span>
                              <span className="text-[#3ea556]">Uploaded R2</span>
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
                      className="space-y-3"
                    >
                      {/* Banner */}
                      <div className="bg-gradient-to-r from-[#1e7a34] to-[#3ea556] p-3.5 rounded-2xl text-white space-y-1 shadow-sm">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-black">Liaison Deck: Rafiu Mohammed</h4>
                          <span className="text-[8px] bg-white/20 px-2 py-0.5 rounded-full font-bold">Class Rep</span>
                        </div>
                        <p className="text-[9px] text-[#f0f7f2] font-medium">Class Workspace EL 300 active. Weekly schedule updated.</p>
                      </div>

                      {/* Content block */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/95 border border-slate-200 p-3 rounded-2xl space-y-2">
                          <span className="text-[8px] font-extrabold text-[#1e7a34] uppercase tracking-widest">Class Timetable Manager</span>
                          <div className="space-y-1">
                            <div className="p-1.5 bg-[#f0f7f2] border border-slate-200 rounded-lg flex items-center justify-between text-[8px] font-bold">
                              <span className="text-slate-800 truncate">CE352 Lecture (SR5)</span>
                              <span className="text-[#1e7a34] shrink-0 font-extrabold">Mon 8:30 AM</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white/95 border border-slate-200 p-3 rounded-2xl space-y-2 flex flex-col justify-between">
                          <div>
                            <span className="text-[8px] font-extrabold text-[#1e7a34] uppercase tracking-widest">Master Timetable Upload</span>
                            <div className="flex justify-between items-center text-[9px] font-bold text-slate-700 mt-1">
                              <span>Official Master PDF</span>
                              <span className="text-[#3ea556]">Active</span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1 mt-1">
                            <div className="bg-[#1e7a34] h-1 rounded-full" style={{ width: '100%' }}></div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Glowing blur */}
            <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full bg-[#1e7a34]/15 blur-3xl pointer-events-none select-none"></div>
          </div>
        </motion.div>
      </section>

      {/* INFRASTRUCTURE BAR */}
      <section className="border-y border-slate-200/60 bg-white/40 backdrop-blur-sm py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-left">
            <h3 className="text-xs font-black text-[#1e7a34] dark:text-emerald-400 uppercase tracking-widest">University Platform Infrastructure</h3>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">Engineered with ASP.NET Core, Firebase Authentication, and Cloudflare D1 & R2.</p>
          </div>
          
          <div className="flex flex-wrap items-center justify-start gap-6 lg:gap-10">
            {[
              { icon: Shield, text: 'Firebase Auth' },
              { icon: Database, text: 'Cloudflare D1 SQLite' },
              { icon: UploadCloud, text: 'Cloudflare R2 Files' },
              { icon: UserCheck, text: 'Verified Faculty' }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                  <div className="w-8 h-8 rounded-xl bg-[#1e7a34]/10 text-[#1e7a34] dark:text-emerald-400 flex items-center justify-center"><Icon size={15} /></div>
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
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-[#f0f7f2] dark:bg-emerald-950/40 border border-[#1e7a34]/20 rounded-full text-[#1e7a34] dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest">
            <Layers size={11} />
            <span>Complete Academic Suite</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            Comprehensive Tools Built for Modern Higher Education
          </h2>
          <p className="text-xs md:text-sm text-slate-600 font-semibold leading-relaxed">
            From class workspaces and assignment submissions to Cloudflare R2 lecture materials and timetable schedules, SANS provides everything students and instructors need.
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
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-white/60 dark:border-slate-800/60 shadow-md rounded-3xl p-6 text-left space-y-4 hover:shadow-lg transition-all duration-300 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-2xl bg-[#f0f7f2] dark:bg-slate-800 text-[#1e7a34] dark:text-emerald-400 flex items-center justify-center group-hover:bg-gradient-to-tr group-hover:from-[#1e7a34] group-hover:to-[#3ea556] group-hover:text-white transition-all shadow-sm">
                  <Icon size={18} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm group-hover:text-[#1e7a34] dark:group-hover:text-emerald-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* HOW SANS WORKS (INTERACTIVE WORKFLOW TABS) */}
      <section id="how-it-works" className="border-t border-slate-200/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm py-24 px-6">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-[#f0f7f2] dark:bg-emerald-950/40 border border-[#1e7a34]/20 rounded-full text-[#1e7a34] dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest">
              <Zap size={11} />
              <span>Step-by-Step Workflows</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">How SANS Streamlines Your Academic Experience</h2>
            <p className="text-xs md:text-sm text-slate-600 font-semibold leading-relaxed">
              Explore the exact system workflow designed for Students, Lecturers, and Course Representatives.
            </p>

            {/* Workflow Role Selector Tabs */}
            <div className="flex justify-center gap-2 pt-4">
              {[
                { id: 'student', label: 'Student Flow', icon: GraduationCap },
                { id: 'lecturer', label: 'Lecturer Flow', icon: UserCheck },
                { id: 'rep', label: 'Course Rep Flow', icon: Shield }
              ].map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeWorkflowTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveWorkflowTab(tab.id as any)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                      isActive 
                        ? 'bg-[#1e7a34] text-white border-[#1e7a34] shadow-md shadow-emerald-600/20' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[#1e7a34]'
                    }`}
                  >
                    <TabIcon size={14} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Workflow Steps Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {(activeWorkflowTab === 'student' ? studentWorkflow : activeWorkflowTab === 'lecturer' ? lecturerWorkflow : repWorkflow).map((step, idx) => (
              <div key={idx} className="relative text-left space-y-3 p-6 bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl shadow-sm hover:shadow-md transition-all">
                <span className="text-4xl font-black text-[#1e7a34] dark:text-emerald-400 block mb-1">{step.num}</span>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">{step.title}</h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold leading-relaxed">{step.desc}</p>
                {idx < 3 && (
                  <span className="hidden md:block absolute top-12 -right-4 w-8 h-px bg-slate-300 dark:bg-slate-700"></span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TAILORED PORTALS SHOWCASE */}
      <section id="roles" className="py-24 px-6 max-w-7xl mx-auto space-y-16">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Tailored Workspaces for Every Campus Role</h2>
          <p className="text-xs md:text-sm text-slate-600 font-semibold leading-relaxed">
            SANS delivers specialized interfaces optimized for Students, Instructors, and Course Representatives.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Student */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-white/60 dark:border-slate-800/60 shadow-md rounded-[2.5rem] p-8 flex flex-col justify-between hover:shadow-xl transition-all duration-300">
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-[#1e7a34] dark:text-emerald-400 flex items-center justify-center"><GraduationCap size={22} /></div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Student Workspace</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold leading-relaxed">
                  Join class workspaces using class codes, receive verified notice publications, track assignment due dates, download lecture slides, and participate in discussion threads.
                </p>
              </div>
              <ul className="space-y-3.5 pt-4 text-xs text-slate-700 dark:text-slate-300 font-bold">
                <li className="flex items-center gap-2.5"><CheckCircle size={14} className="text-[#1e7a34] dark:text-emerald-400 shrink-0" />Class workspace feed & notifications</li>
                <li className="flex items-center gap-2.5"><CheckCircle size={14} className="text-[#1e7a34] dark:text-emerald-400 shrink-0" />Assignments & R2 file downloads</li>
                <li className="flex items-center gap-2.5"><CheckCircle size={14} className="text-[#1e7a34] dark:text-emerald-400 shrink-0" />Weekly timetable & lecture room tracker</li>
                <li className="flex items-center gap-2.5"><CheckCircle size={14} className="text-[#1e7a34] dark:text-emerald-400 shrink-0" />Class discussion forums & Q&A</li>
              </ul>
            </div>
            <button 
              onClick={() => navigate('/login')} 
              className="mt-8 w-full py-3.5 bg-[#f0f7f2] dark:bg-emerald-950/40 hover:bg-[#1e7a34] hover:text-white text-[#1e7a34] dark:text-emerald-400 rounded-2xl text-xs font-black border border-[#1e7a34]/30 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer shadow-sm"
            >
              Enter Student Portal
            </button>
          </div>

          {/* Lecturer */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-white/60 dark:border-slate-800/60 shadow-md rounded-[2.5rem] p-8 flex flex-col justify-between hover:shadow-xl transition-all duration-300">
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-[#1e7a34]/10 text-[#1e7a34] dark:text-emerald-400 flex items-center justify-center"><UserCheck size={22} /></div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Faculty Console</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold leading-relaxed">
                  Publish verified course announcements, create assignments with downloadable instructions, upload lecture slides to Cloudflare R2, and schedule quizzes.
                </p>
              </div>
              <ul className="space-y-3.5 pt-4 text-xs text-slate-700 dark:text-slate-300 font-bold">
                <li className="flex items-center gap-2.5"><CheckCircle size={14} className="text-[#1e7a34] dark:text-emerald-400 shrink-0" />Verified notice publication & priority tags</li>
                <li className="flex items-center gap-2.5"><CheckCircle size={14} className="text-[#1e7a34] dark:text-emerald-400 shrink-0" />Assignment creation with penalty rules</li>
                <li className="flex items-center gap-2.5"><CheckCircle size={14} className="text-[#1e7a34] dark:text-emerald-400 shrink-0" />Cloudflare R2 lecture slides upload</li>
                <li className="flex items-center gap-2.5"><CheckCircle size={14} className="text-[#1e7a34] dark:text-emerald-400 shrink-0" />Quiz dates & points manager</li>
              </ul>
            </div>
            <button 
              onClick={() => navigate('/login')} 
              className="mt-8 w-full py-3.5 bg-[#1e7a34] hover:bg-[#258d3f] text-white rounded-2xl text-xs font-black shadow-md shadow-emerald-600/20 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
            >
              Enter Faculty Console
            </button>
          </div>

          {/* Rep */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-white/60 dark:border-slate-800/60 shadow-md rounded-[2.5rem] p-8 flex flex-col justify-between hover:shadow-xl transition-all duration-300">
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-[#1e7a34]/10 text-[#1e7a34] dark:text-emerald-400 flex items-center justify-center"><Shield size={22} /></div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Liaison Deck</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold leading-relaxed">
                  Create class workspaces, manage weekly timetables, publish class notices, upload master timetable files, and coordinate academic activities.
                </p>
              </div>
              <ul className="space-y-3.5 pt-4 text-xs text-slate-700 dark:text-slate-300 font-bold">
                <li className="flex items-center gap-2.5"><CheckCircle size={14} className="text-[#1e7a34] dark:text-emerald-400 shrink-0" />Create class workspaces & class tokens</li>
                <li className="flex items-center gap-2.5"><CheckCircle size={14} className="text-[#1e7a34] dark:text-emerald-400 shrink-0" />Weekly timetable schedule builder</li>
                <li className="flex items-center gap-2.5"><CheckCircle size={14} className="text-[#1e7a34] dark:text-emerald-400 shrink-0" />Upload official master timetable documents</li>
                <li className="flex items-center gap-2.5"><CheckCircle size={14} className="text-[#1e7a34] dark:text-emerald-400 shrink-0" />Publish class notices & updates</li>
              </ul>
            </div>
            <button 
              onClick={() => navigate('/login')} 
              className="mt-8 w-full py-3.5 bg-white dark:bg-slate-800 hover:bg-[#f0f7f2] dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-2xl text-xs font-black border-2 border-slate-800 dark:border-slate-700 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer shadow-sm"
            >
              Enter Liaison Deck
            </button>
          </div>
        </div>
      </section>

      {/* PLATFORM ENGINE & SYSTEM CAPABILITIES */}
      <section id="platform-engine" className="py-24 px-6 max-w-7xl mx-auto space-y-16">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-[#f0f7f2] dark:bg-emerald-950/40 border border-[#1e7a34]/20 rounded-full text-[#1e7a34] dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest">
            <Lock size={11} />
            <span>Platform Engine & Architecture</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            High-Performance System Capabilities
          </h2>
          <p className="text-xs md:text-sm text-slate-600 font-semibold leading-relaxed">
            SANS is built on enterprise cloud infrastructure engineered for speed, data security, and seamless academic collaboration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {systemCapabilities.map((cap, idx) => {
            const Icon = cap.icon;
            return (
              <motion.div 
                key={idx}
                whileHover={{ y: -6, scale: 1.02 }}
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-white/60 dark:border-slate-800/60 shadow-md rounded-3xl p-6 text-left space-y-4 flex flex-col justify-between hover:shadow-xl transition-all duration-300 group"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="w-10 h-10 rounded-2xl bg-[#f0f7f2] dark:bg-slate-800 text-[#1e7a34] dark:text-emerald-400 flex items-center justify-center group-hover:bg-gradient-to-tr group-hover:from-[#1e7a34] group-hover:to-[#3ea556] group-hover:text-white transition-all shadow-sm">
                      <Icon size={18} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#1e7a34]/10 text-[#1e7a34] dark:text-emerald-400 border border-[#1e7a34]/20">
                      {cap.badge}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-sm group-hover:text-[#1e7a34] dark:group-hover:text-emerald-400 transition-colors">
                      {cap.title}
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
                      {cap.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* STATISTICS SECTION */}
      <section className="border-y border-slate-200/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm py-20 px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#1e7a34] dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Real-Time Database Metrics</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'Active Students', value: systemStats.activeStudents, startFrom: 500 },
              { label: 'Course Classes', value: systemStats.courseClasses, startFrom: 150 },
              { label: 'Resources Shared', value: systemStats.resourcesShared, startFrom: 350 },
              { label: 'Announcements Delivered', value: systemStats.announcementsDelivered, startFrom: 450 }
            ].map((stat, idx) => (
              <div key={idx} className="text-center space-y-1">
                <p className="text-3xl md:text-4xl font-black text-[#1e7a34] dark:text-emerald-400">
                  <CountUp from={stat.startFrom} to={stat.value} duration={2.5} />
                  <span>+</span>
                </p>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-24 px-6 max-w-3xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Frequently Asked Questions</h2>
          <p className="text-xs text-slate-600 font-semibold leading-relaxed">
            Everything you need to know about SANS security, workspaces, and features.
          </p>
        </div>

        <div className="space-y-4 pt-4">
          {faqItems.map((item, idx) => {
            const isOpen = faqOpen === idx;
            return (
              <div 
                key={idx} 
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-white/60 dark:border-slate-800/60 shadow-md rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setFaqOpen(isOpen ? null : idx)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left font-extrabold text-xs text-slate-900 dark:text-white cursor-pointer"
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
                      <p className="px-6 pb-5 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
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
        <div className="bg-gradient-to-tr from-[#1e7a34] to-[#3ea556] rounded-[3rem] p-12 text-center text-white relative overflow-hidden shadow-2xl space-y-6 border border-[#2b9b47]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight max-w-xl mx-auto">
            Ready to Experience Centralized Academic Communication?
          </h2>
          
          <p className="text-xs text-[#f0f7f2] font-semibold max-w-md mx-auto leading-relaxed">
            Create your account today, join your class workspaces, and access verified announcements, timetables, and learning resources in real time.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => navigate('/register')}
              className="px-8 py-4 bg-white hover:bg-slate-50 text-[#1e7a34] font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              Join Your Academic Community
            </button>

            {/* Rotating Lightning Border Button on CTA */}
            <div 
              onClick={() => navigate('/login')}
              className="relative p-[1.5px] rounded-2xl overflow-hidden flex items-center justify-center group active:scale-[0.98] transition-transform select-none shadow-md cursor-pointer"
            >
              <div className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_20%,#ffffff_40%,#86efac_60%,transparent_80%)] opacity-100 group-hover:animate-[spin_1.5s_linear_infinite]" />
              <div className="relative px-8 py-4 bg-[#145624] hover:bg-[#10441d] text-white font-black rounded-[14px] text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2">
                <span>Sign In to Portal</span>
                <Zap size={13} className="text-emerald-300 fill-emerald-300 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative border-t border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md pt-12 pb-8 px-6 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          
          {/* Logo & Description */}
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1e7a34] to-[#3ea556] text-white flex items-center justify-center font-black text-lg shadow-md shadow-emerald-600/20">
              S
            </div>
            <div>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="text-slate-900 dark:text-white font-extrabold text-base tracking-tight">SANS</span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Academic Portal</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-md font-medium leading-relaxed">
                Streamlining class rosters, verified notices, timetables, and academic resource distribution.
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-5 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-[#1e7a34] dark:hover:text-emerald-400 transition-colors">Features</a>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
            <a href="#how-it-works" className="hover:text-[#1e7a34] dark:hover:text-emerald-400 transition-colors">Workflows</a>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
            <a href="#roles" className="hover:text-[#1e7a34] dark:hover:text-emerald-400 transition-colors">Workspaces</a>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
            <a href="#platform-engine" className="hover:text-[#1e7a34] dark:hover:text-emerald-400 transition-colors">Platform Engine</a>
          </nav>

        </div>

        {/* Bottom copyright & status */}
        <div className="max-w-7xl mx-auto border-t border-slate-200/50 dark:border-slate-800/50 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
          <span>© 2026 Smart Academic Notification System. All rights reserved.</span>
          <span className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            System Operational
          </span>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
