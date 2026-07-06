import React, { useState, useRef, useCallback } from 'react';
import { Plus, Download, Folder, SlidersHorizontal, ChevronRight, UploadCloud, X, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useResources } from '../hooks/useResources';
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

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  type: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const ResourcesPage: React.FC = () => {
  const { user } = useAuth();
  const isStudent = user?.role === UserRole.Student;
  const { data: apiResources } = useResources();
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Map API resources to UI format, fallback to static data if API not available
  const resources: Resource[] = (apiResources && apiResources.length > 0
    ? apiResources.map((res, index) => ({
        id: index + 1,
        title: res.title,
        desc: res.description,
        course: res.category || 'General',
        fileType: res.fileType.toUpperCase(),
        fileSize: res.fileSize ? `${(res.fileSize / (1024 * 1024)).toFixed(1)} MB` : 'N/A',
        downloads: res.downloadCount || 0,
        bannerGradient: ['from-[#85cd2a] to-[#a2e048]', 'from-emerald-500 to-teal-500', 'from-purple-500 to-rose-500', 'from-orange-500 to-red-500', 'from-slate-600 to-slate-900', 'from-rose-500 to-orange-500'][index % 6],
        updatedAt: res.updatedAt ? new Date(res.updatedAt).toLocaleDateString() : new Date(res.createdAt).toLocaleDateString()
      }))
    : []
  );

  // Static fallback resources when no API data
  const fallbackResources: Resource[] = [
    {
      id: 1,
      title: 'Lecture Slides: Agentic Workflows',
      desc: 'Introductory slides covering autonomous workflows, tool integration, and planning-mode algorithms.',
      course: 'Artificial Intelligence',
      fileType: 'PDF',
      fileSize: '4.8 MB',
      downloads: 142,
      bannerGradient: 'from-[#1e7a34] to-[#3ea556]',
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
      bannerGradient: 'from-emerald-500 to-teal-500',
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

  // Use API data if available, otherwise fallback to static
  const displayResources = resources.length > 0 ? resources : fallbackResources;

  // === UPLOAD HANDLERS ===

  const simulateUpload = (file: File) => {
    const newFile: UploadedFile = {
      id: `${Date.now()}-${file.name}`,
      name: file.name,
      size: formatBytes(file.size),
      type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
      progress: 0,
      status: 'uploading'
    };

    setUploadedFiles(prev => [newFile, ...prev]);

    // Simulate progressive upload
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 8;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setUploadedFiles(prev =>
          prev.map(f => f.id === newFile.id ? { ...f, progress: 100, status: 'done' } : f)
        );
      } else {
        setUploadedFiles(prev =>
          prev.map(f => f.id === newFile.id ? { ...f, progress } : f)
        );
      }
    }, 200);
  };

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (file.size > 25 * 1024 * 1024) {
        alert(`"${file.name}" exceeds the 25 MB limit.`);
        return;
      }
      simulateUpload(file);
    });
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const removeUploadedFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="p-8 space-y-6 h-[calc(100vh-64px)] overflow-y-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-[#F8FAFC] tracking-tight">
            Files
          </h1>
          <p className="text-slate-500 dark:text-[#94A3B8] font-medium">
            Browse and download course textbooks, reference slides, guides, and templates.
          </p>
        </div>

        {!isStudent && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-brand-green text-white px-5 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-brand-green/25 hover:bg-brand-green/95 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <UploadCloud size={16} />
            <span>Upload File</span>
          </button>
        )}

        {/* Hidden native file input */}
        {!isStudent && (
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.rar,.txt,.xlsx,.csv,.png,.jpg,.jpeg"
            onChange={handleFileInputChange}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* PANEL 1: Files Grid */}
        <div className="lg:col-span-3 bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-[rgba(255,255,255,0.18)] rounded-[2rem] shadow-soft p-8">
          {/* Header Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-150 dark:border-[rgba(255,255,255,0.18)]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#94A3B8]">
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

            <button className="p-1.5 border border-slate-200 dark:border-[rgba(255,255,255,0.18)] text-slate-500 hover:text-slate-700 dark:hover:text-slate-355 rounded-xl transition-all">
              <SlidersHorizontal size={14} />
            </button>
          </div>

          {/* Grid list */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayResources.map((item) => (
              <div 
                key={item.id}
                className="group border border-slate-100 dark:border-[rgba(255,255,255,0.18)] bg-slate-50/20 dark:bg-[#1F2937]/5 rounded-3xl p-5 hover:shadow-medium hover:bg-white dark:hover:bg-[#374151] transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${item.bannerGradient} flex items-center justify-center text-white shadow-sm`}>
                      <Folder size={18} />
                    </div>
                    <span className="text-[9px] font-extrabold px-2 py-0.5 bg-[#f0f7f2] dark:bg-slate-800 text-brand-green dark:text-brand-green-medium rounded-lg uppercase tracking-wider">
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
                    <p className="text-[11px] text-slate-455 dark:text-[#94A3B8] leading-relaxed font-medium line-clamp-3">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[rgba(255,255,255,0.18)] flex items-center justify-between">
                  <div className="text-[9px] text-slate-400 font-bold">
                    <p>{item.fileSize} • {item.downloads} dl</p>
                  </div>
                  <button className="p-2 border border-slate-200 dark:border-[rgba(255,255,255,0.18)] text-slate-655 dark:text-slate-350 hover:bg-brand-green hover:text-white hover:border-brand-green rounded-xl transition-all shadow-sm flex items-center gap-1 text-[10px] font-extrabold active:scale-[0.96] cursor-pointer">
                    <Download size={12} />
                    <span>Get File</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PANEL 2: Right sidebar */}
        <aside className="space-y-6">

          {/* === UPLOAD DROPZONE (Lecturer & Rep only) === */}
          {!isStudent && (
            <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-[rgba(255,255,255,0.18)] rounded-[2rem] shadow-soft p-6 space-y-4">
              <h3 className="font-extrabold text-slate-850 dark:text-[#F8FAFC] text-sm flex items-center gap-2">
                <UploadCloud size={16} className="text-brand-green" />
                <span>Upload Files</span>
              </h3>

              {/* Drag & drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 select-none ${
                  isDragging
                    ? 'border-brand-green bg-brand-green-light dark:bg-brand-green/10 scale-[1.01]'
                    : 'border-[#d6eedd] dark:border-slate-700 hover:border-brand-green hover:bg-brand-green-light dark:hover:bg-brand-green/5'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors ${
                  isDragging ? 'bg-brand-green text-white' : 'bg-brand-green-light text-brand-green'
                }`}>
                  <UploadCloud size={22} />
                </div>
                {isDragging ? (
                  <p className="text-sm font-bold text-brand-green">Drop files to upload!</p>
                ) : (
                  <>
                    <p className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">
                      Drag & drop files here
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      or <span className="text-brand-green font-bold underline underline-offset-2">browse to choose</span>
                    </p>
                    <p className="text-[9px] text-slate-400 mt-2 font-semibold">
                      PDF, DOC, ZIP, PNG, JPG • Max 25 MB
                    </p>
                  </>
                )}
              </div>

              {/* Upload progress list */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {uploadedFiles.map(file => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#1F2937]/30 rounded-xl border border-slate-100 dark:border-[rgba(255,255,255,0.18)]"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white text-[9px] font-black ${
                        file.status === 'done' ? 'bg-brand-green' : 
                        file.status === 'error' ? 'bg-red-500' : 'bg-slate-400'
                      }`}>
                        {file.status === 'done' ? (
                          <CheckCircle size={14} />
                        ) : file.status === 'error' ? (
                          <AlertCircle size={14} />
                        ) : (
                          <FileText size={14} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-slate-800 dark:text-[#CBD5E1] truncate">{file.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {file.status === 'uploading' ? (
                            <>
                              <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1">
                                <div
                                  className="bg-brand-green h-1 rounded-full transition-all duration-200"
                                  style={{ width: `${file.progress}%` }}
                                />
                              </div>
                              <span className="text-[9px] text-slate-400 font-bold shrink-0">{file.progress}%</span>
                            </>
                          ) : file.status === 'done' ? (
                            <span className="text-[9px] text-brand-green font-bold">Uploaded • {file.size}</span>
                          ) : (
                            <span className="text-[9px] text-red-500 font-bold">Upload failed</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeUploadedFile(file.id); }}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors shrink-0 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick links widget */}
          <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-[rgba(255,255,255,0.18)] rounded-[2rem] shadow-soft p-6">
            <h4 className="text-[10px] font-bold text-slate-455 uppercase tracking-widest mb-3">
              Frequent Documents
            </h4>
            
            <div className="space-y-2">
              {['SE_Project_Spec.pdf', 'Database_ERD_Cheat.zip', 'Syllabus_2026.pdf'].map((docName, idx) => (
                <button 
                  key={idx}
                  className="w-full flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-[rgba(255,255,255,0.18)] hover:bg-[#f0f7f2] dark:hover:bg-slate-900/10 hover:border-brand-green/20 text-left transition-all cursor-pointer"
                >
                  <span className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1] truncate max-w-[170px]">
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
