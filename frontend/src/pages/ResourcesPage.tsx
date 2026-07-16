import React, { useState, useRef, useCallback } from 'react';
import { Download, Folder, SlidersHorizontal, ChevronRight, UploadCloud, X, FileText, CheckCircle, AlertCircle, BookOpen, Trash2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useResources } from '../hooks/useResources';
import { UserRole } from '../types';
import api from '../lib/axios';
import { useQueryClient } from '@tanstack/react-query';

interface Resource {
  id: string;
  title: string;
  desc: string;
  course: string;
  fileType: string;
  fileSize: string;
  downloads: number;
  bannerGradient: string;
  updatedAt: string;
  fileUrl: string;
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
  const { classes, activeClass } = useWorkspace();
  const queryClient = useQueryClient();
  const isStudent = user?.role === UserRole.Student;
  const { data: apiResources, isLoading } = useResources(activeClass?.id);
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Map API resources to UI format
  const resources: Resource[] = apiResources?.map((res, index) => ({
    id: res.id,
    title: res.title,
    desc: res.description,
    course: activeClass?.name || 'General Info',
    fileType: res.fileType.toUpperCase(),
    fileSize: res.fileSize ? formatBytes(res.fileSize) : 'N/A',
    downloads: res.downloadCount || 0,
    bannerGradient: ['from-[#1e7a34] to-[#3ea556]', 'from-emerald-500 to-teal-500', 'from-purple-500 to-rose-500', 'from-orange-500 to-red-500', 'from-slate-600 to-slate-900', 'from-rose-500 to-orange-500'][index % 6],
    updatedAt: res.updatedAt ? new Date(res.updatedAt).toLocaleDateString() : new Date(res.createdAt).toLocaleDateString(),
    fileUrl: res.fileUrl
  })) || [];

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const uploadFileToServer = async (file: File, uploadId: string) => {
    const targetClassId = activeClass?.id || (classes.length > 0 ? classes[0].id : '');
    if (!targetClassId) {
      setUploadedFiles(prev => prev.map(f => f.id === uploadId ? { ...f, status: 'error' } : f));
      return;
    }

    try {
      // Build real multipart/form-data — axios will set the correct Content-Type boundary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name.substring(0, file.name.lastIndexOf('.')) || file.name);
      formData.append('description', 'Uploaded via SANS resources manager.');
      formData.append('category', 'Document');
      formData.append('classWorkspaceId', targetClassId);

      // Show upload progress while request is in flight
      setUploadedFiles(prev => prev.map(f => f.id === uploadId ? { ...f, progress: 30 } : f));

      await api.post('/resources/upload', formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadedFiles(prev => prev.map(f => f.id === uploadId ? { ...f, progress: Math.min(pct, 95) } : f));
          }
        },
      });

      setUploadedFiles(prev => prev.map(f => f.id === uploadId ? { ...f, progress: 100, status: 'done' } : f));
      setSuccessMsg('Success: Learning resource uploaded to Cloudflare R2!');
      setTimeout(() => setSuccessMsg(''), 4000);
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    } catch (err: any) {
      console.error('Upload failed:', err?.response?.data ?? err);
      setUploadedFiles(prev => prev.map(f => f.id === uploadId ? { ...f, status: 'error' } : f));
    }
  };

  const handleFiles = useCallback((files: FileList) => {
    Array.from(files).forEach(file => {
      const uploadId = Math.random().toString(36).substring(7);
      const newUpload: UploadedFile = {
        id: uploadId,
        name: file.name,
        size: formatBytes(file.size),
        type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
        progress: 0,
        status: 'uploading'
      };

      setUploadedFiles(prev => [newUpload, ...prev]);
      uploadFileToServer(file, uploadId);
    });
  }, [activeClass, classes]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this resource?")) return;
    try {
      await api.delete(`/resources/${id}`);
      setSuccessMsg('Success: Resource deleted successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 space-y-6 h-[calc(100vh-64px)] overflow-y-auto bg-[#f7f6fb] dark:bg-[#0F172A] transition-colors duration-300 relative">
      
      {/* Toast Feedback */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-large flex items-center gap-2 animate-bounce z-[9999]">
          <CheckCircle2 size={14} className="text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-805 dark:text-slate-100 tracking-tight">
            Learning Resources
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-xs md:text-sm">
            Access lecture slides, sample repositories, cheatsheets, and class files.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left grid of files */}
        <div className="lg:col-span-2 space-y-6">
          
          {isLoading ? (
            <p className="text-xs text-slate-400 font-semibold py-8 text-center">Loading resources...</p>
          ) : resources.length === 0 ? (
            <p className="text-xs text-slate-400 font-semibold py-8 text-center">No resource files shared in this workspace yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resources.map(item => (
                <div key={item.id} className="bg-white dark:bg-[#1E293B] border border-slate-105 dark:border-slate-800/40 rounded-[2rem] p-5 shadow-soft hover:shadow-medium transition-shadow relative group">
                  <div className={`w-full h-32 rounded-2xl bg-gradient-to-br ${item.bannerGradient} flex items-center justify-center text-white text-2xl font-black select-none relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                    <span>{item.fileType}</span>
                  </div>

                  <div className="mt-4 space-y-1 text-left">
                    <div className="flex justify-between items-start">
                      <span className="text-[8px] font-extrabold text-brand-primary bg-brand-primary-light/40 dark:bg-brand-primary/10 px-2 py-0.5 rounded uppercase">
                        {item.course}
                      </span>
                      {!isStudent && (
                        <button
                          onClick={() => handleDeleteResource(item.id)}
                          className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Delete File"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    <h4 className="font-extrabold text-slate-800 dark:text-white text-xs truncate pt-1">{item.title}</h4>
                    <p className="text-[10px] text-slate-455 dark:text-[#94A3B8] line-clamp-2 leading-relaxed">{item.desc}</p>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800/40 pt-3.5 mt-3.5 flex items-center justify-between text-[9px] text-slate-405 dark:text-[#94A3B8] font-bold">
                    <span>{item.fileSize} • {item.downloads} downloads</span>
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-[#f0f7f2] dark:bg-slate-900 border border-[#d6eedd] dark:border-slate-700/60 text-[#1e7a34] dark:text-[#3ea556] rounded-xl hover:bg-[#1e7a34] hover:text-white transition-all cursor-pointer"
                      title="Download Resource"
                    >
                      <Download size={11} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right side Drag & Drop Upload block - Lecturer/Rep only */}
        <div className="space-y-6">
          {!isStudent && (
            <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2.5rem] p-6 shadow-soft space-y-4">
              <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                <UploadCloud size={16} className="text-brand-primary" />
                <span>Upload Resources</span>
              </h3>
              
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                  isDragging 
                    ? 'border-brand-primary bg-brand-primary-light/10' 
                    : 'border-slate-200 dark:border-slate-800 hover:border-brand-primary'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple 
                  className="hidden" 
                />
                <UploadCloud size={28} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-xs font-bold text-slate-600 dark:text-[#CBD5E1]">Drag & drop files here</p>
                <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] font-medium mt-0.5">or click to browse local files</p>
              </div>

              {/* Uploading progress bars */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-3 pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Uploading Queue</span>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {uploadedFiles.map(file => (
                      <div key={file.id} className="p-3 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-105 dark:border-slate-800/40 rounded-xl text-left text-xs font-semibold relative">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[11px] font-bold truncate pr-3 text-slate-800 dark:text-[#CBD5E1]">{file.name}</span>
                          <span className="text-[9px] text-slate-405 shrink-0">{file.size}</span>
                        </div>
                        {file.status === 'uploading' ? (
                          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mt-1.5">
                            <div className="bg-[#1e7a34] h-1.5 rounded-full transition-all" style={{ width: `${file.progress}%` }}></div>
                          </div>
                        ) : file.status === 'done' ? (
                          <span className="text-[9px] text-[#1e7a34] font-extrabold flex items-center gap-0.5 mt-1">
                            <CheckCircle size={10} /> Finished Upload
                          </span>
                        ) : (
                          <span className="text-[9px] text-red-500 font-extrabold flex items-center gap-0.5 mt-1">
                            <AlertCircle size={10} /> Upload failed
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ResourcesPage;
