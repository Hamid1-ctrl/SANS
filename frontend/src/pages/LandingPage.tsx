import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  ShieldAlert, 
  GraduationCap, 
  Users,
  Compass
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-brand-green dark:bg-[#113a1a] flex flex-col font-sans transition-colors duration-300 overflow-x-hidden select-none animate-fade-in">
      
      {/* Premium Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-white text-brand-green flex items-center justify-center font-black text-sm shadow-md">
            S
          </div>
          <span className="text-white font-extrabold text-base tracking-tight">SANS</span>
        </div>
        
        <button 
          onClick={() => navigate('/login')}
          className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/20 backdrop-blur-md cursor-pointer"
        >
          Sign In
        </button>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 max-w-4xl mx-auto relative z-10 py-12">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/20 rounded-full text-white text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
            <Compass size={12} className="text-[#a2e048]" />
            <span>Smart Academic Notification System</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-[1.1] max-w-3xl mx-auto">
            A Cleaner, Faster Academic Workspace.
          </h1>

          <p className="text-sm md:text-base text-white/80 font-semibold max-w-xl mx-auto leading-relaxed">
            Consolidate schedules, review lecture notices, and manage representative logs. SANS delivers tailored workspaces for students, lecturers, and class reps.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => navigate('/login')}
              className="px-8 py-3.5 bg-[#85cd2a] hover:bg-[#92dc34] text-slate-900 font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-premium flex items-center justify-center gap-2 cursor-pointer transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>Enter Workspace</span>
              <ArrowRight size={14} strokeWidth={3} />
            </button>
            
            <button 
              onClick={() => navigate('/register')}
              className="px-8 py-3.5 bg-white/10 hover:bg-white/25 text-white font-bold rounded-2xl text-xs uppercase tracking-wider backdrop-blur-md border border-white/25 cursor-pointer transition-all"
            >
              Register Account
            </button>
          </div>
        </div>

        {/* Roles Teasers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full max-w-5xl">
          {/* Student */}
          <div className="bg-white/5 border border-white/15 rounded-[2rem] p-6 text-left backdrop-blur-md hover:bg-white/10 transition-all duration-300 group cursor-pointer" onClick={() => navigate('/login')}>
            <div className="w-10 h-10 rounded-2xl bg-[#85cd2a]/20 text-[#a2e048] flex items-center justify-center mb-4 font-black">
              <GraduationCap size={20} />
            </div>
            <h3 className="text-white font-extrabold text-sm uppercase tracking-wider">Student Feed</h3>
            <p className="text-[11px] text-white/70 font-semibold mt-2 leading-relaxed">
              Track assignments deadlines, check attendance ratios, and read class notices inside a focused timeline.
            </p>
          </div>

          {/* Lecturer */}
          <div className="bg-white/5 border border-white/15 rounded-[2rem] p-6 text-left backdrop-blur-md hover:bg-white/10 transition-all duration-300 group cursor-pointer" onClick={() => navigate('/login')}>
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center mb-4 font-black">
              <Users size={20} />
            </div>
            <h3 className="text-white font-extrabold text-sm uppercase tracking-wider">Faculty Console</h3>
            <p className="text-[11px] text-white/70 font-semibold mt-2 leading-relaxed">
              Coordinate multiple syllabus progress boards, schedule quizzes, and verify representative news items.
            </p>
          </div>

          {/* Representative */}
          <div className="bg-white/5 border border-white/15 rounded-[2rem] p-6 text-left backdrop-blur-md hover:bg-white/10 transition-all duration-300 group cursor-pointer" onClick={() => navigate('/login')}>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center mb-4 font-black">
              <ShieldAlert size={20} />
            </div>
            <h3 className="text-white font-extrabold text-sm uppercase tracking-wider">Liaison Deck</h3>
            <p className="text-[11px] text-white/70 font-semibold mt-2 leading-relaxed">
              Escalate student queries, log meeting minutes directly to dean portals, and manage class invitations.
            </p>
          </div>
        </div>
      </main>

      {/* Decorative Blur Spheres */}
      <div className="absolute top-1/4 -left-64 w-96 h-96 rounded-full bg-white/5 blur-[120px] select-none pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-64 w-96 h-96 rounded-full bg-[#85cd2a]/5 blur-[120px] select-none pointer-events-none"></div>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-white/60 text-[10px] font-bold uppercase tracking-wider z-20">
        <span>Smart Academic Notification System © 2026</span>
        <div className="flex gap-4">
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-white transition-colors">Documentation</a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
