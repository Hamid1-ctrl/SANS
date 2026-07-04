import React, { useState } from 'react';
import { Plus, Download, Folder, SlidersHorizontal, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

interface Resource {
  id: number;
  title: string;
  desc: string;
  course: string;
  fileType: string;
  fileSize: string;
  downloads: number;
  bannerGradient: string;
  updatedAt: string;
}

const ResourcesPage: React.FC = () => {
  const { user } = useAuth();
  const isStudent = user?.role === UserRole.Student;
  const [selectedFolder, setSelectedFolder] = useState('all');

  const resources: Resource[] = [
    {
      id: 1,
      title: 'Lecture Slides: Agentic Workflows',
      desc: 'Introductory slides covering autonomous workflows, tool integration, and planning-mode algorithms.',
      course: 'Artificial Intelligence',
      fileType: 'PDF',
      fileSize: '4.8 MB',
      downloads: 142,
      bannerGradient: 'from-[#85cd2a] to-[#a2e048]',
      updatedAt: '2 hours ago'
    },
    {
      id: 2,
      title: 'CSS & Tailwind v4 Custom Tokens Guide',
      desc: 'Reference cheat sheet explaining @theme definitions, nested styles, and custom variables inside Vite.',
      course: 'Frontend Engineering',
      fileType: 'ZIP',
      fileSize: '1.2 MB',
      downloads: 85,
      bannerGradient: 'from-emerald-500 to-teal-655',
      updatedAt: 'Yesterday'
    },
    {
      id: 3,
      title: 'Relational Database Cheat Sheet',
      desc: 'Formulas and normal forms review sheets, entity relation diagrams, and SQL JOIN instructions.',
      course: 'Database Systems',
      fileType: 'PDF',
      fileSize: '3.1 MB',
      downloads: 209,
      bannerGradient: 'from-purple-500 to-rose-500',
      updatedAt: '3 days ago'
    },
    {
      id: 4,
      title: 'C# Clean Architecture Template',
      desc: 'Full boilerplate containing Application, Domain, Infrastructure, WebAPI, and Tests folder models.',
      course: 'Software Engineering',
      fileType: 'ZIP',
      fileSize: '12.4 MB',
      downloads: 310,
      bannerGradient: 'from-orange-500 to-red-500',
      updatedAt: '1 week ago'
    },
    {
      id: 5,
      title: 'Syllabus - Fall Semester 2026',
      desc: 'Schedules, evaluation guidelines, course codes, textbooks list, and project milestones.',
      course: 'General Info',
      fileType: 'PDF',
      fileSize: '820 KB',
      downloads: 412,
      bannerGradient: 'from-slate-600 to-slate-900',
      updatedAt: '2 weeks ago'
    },
    {
      id: 6,
      title: 'Lab Manual - Basic Threat Detection',
      desc: 'Walkthrough rules on port scanning, security threat diagnostics, and firewall config audits.',
      course: 'Cybersecurity',
      fileType: 'DOCX',
      fileSize: '2.5 MB',
      downloads: 98,
      bannerGradient: 'from-rose-500 to-orange-500',
      updatedAt: '3 weeks ago'
    }
  ];

  return (
    <div className="p-8 space-y-6 h-[calc(100vh-64px)] overflow-y-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            Files
          </h1>
          <p className="text-slate-505 dark:text-slate-400 font-medium">
            Browse and download course textbooks, reference slides, guides, and templates.
          </p>
        </div>

        {!isStudent && (
          <button className="flex items-center gap-2 bg-brand-green text-white px-5 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-brand-green/25 hover:bg-brand-green/95 transition-all">
            <Plus size={16} />
            <span>Upload File</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* PANEL 1: Files Grid */}
        <div className="lg:col-span-3 bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2rem] shadow-soft p-8">
          {/* Header Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-150 dark:border-slate-800/40">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Folders:
              </span>
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="bg-transparent border-none text-xs font-extrabold text-slate-700 dark:text-slate-350 focus:outline-none cursor-pointer"
              >
                <option value="all">All Folders</option>
                <option value="ai">Artificial Intelligence</option>
                <option value="frontend">Frontend Engineering</option>
                <option value="db">Database Systems</option>
                <option value="se">Software Engineering</option>
              </select>
            </div>

            <button className="p-1.5 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-355 rounded-xl transition-all">
              <SlidersHorizontal size={14} />
            </button>
          </div>

          {/* Grid list */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((item) => (
              <div 
                key={item.id}
                className="group border border-slate-100 dark:border-slate-800/40 bg-slate-50/20 dark:bg-slate-900/5 rounded-3xl p-5 hover:shadow-medium hover:bg-white dark:hover:bg-[#1f1b2c] transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${item.bannerGradient} flex items-center justify-center text-white shadow-sm`}>
                      <Folder size={18} />
                    </div>
                    <span className="text-[9px] font-extrabold px-2 py-0.5 bg-[#f1edf7] dark:bg-slate-800 text-brand-green dark:text-brand-green-medium rounded-lg uppercase tracking-wider">
                      {item.fileType}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase text-brand-green dark:text-brand-green-medium tracking-wider">
                      {item.course}
                    </span>
                    <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-sm leading-snug group-hover:text-brand-green transition-colors cursor-pointer truncate">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-slate-455 dark:text-slate-400 leading-relaxed font-medium line-clamp-3">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/40 flex items-center justify-between">
                  <div className="text-[9px] text-slate-400 font-bold">
                    <p>{item.fileSize} • {item.downloads} dl</p>
                  </div>
                  <button className="p-2 border border-slate-200 dark:border-slate-850 text-slate-655 dark:text-slate-350 hover:bg-brand-green hover:text-white hover:border-brand-green rounded-xl transition-all shadow-sm flex items-center gap-1 text-[10px] font-extrabold active:scale-[0.96]">
                    <Download size={12} />
                    <span>Get File</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PANEL 2: Right upload dropzone info widget Column */}
        <aside className="space-y-6">
          {!isStudent && (
            <div className="bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2rem] shadow-soft p-6 space-y-4">
              <h3 className="font-extrabold text-slate-850 dark:text-slate-100 text-sm flex items-center gap-2">
                <Folder size={16} className="text-brand-green" />
                <span>Dropzone Upload</span>
              </h3>

              {/* Dotted border drag area */}
              <div className="border-2 border-dashed border-[#ece8f3] dark:border-slate-800/50 rounded-2xl p-6 text-center hover:border-brand-green transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-[#f1edf7] dark:bg-slate-850 flex items-center justify-center text-brand-green mx-auto mb-3">
                  <Plus size={18} />
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Drag files here</p>
                <p className="text-[10px] text-slate-400 mt-1">Maximum upload size: 25MB</p>
              </div>
            </div>
          )}

          {/* Quick links widget list */}
          <div className="bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2rem] shadow-soft p-6">
            <h4 className="text-[10px] font-bold text-slate-455 uppercase tracking-widest mb-3">
              Frequent Documents
            </h4>
            
            <div className="space-y-2">
              {['SE_Project_Spec.pdf', 'Database_ERD_Cheat.zip', 'Syllabus_2026.pdf'].map((docName, idx) => (
                <button 
                  key={idx}
                  className="w-full flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-800/40 hover:bg-[#fcfbfe] dark:hover:bg-slate-900/10 text-left transition-all"
                >
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[170px]">
                    {docName}
                  </span>
                  <ChevronRight size={14} className="text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
};

export default ResourcesPage;
