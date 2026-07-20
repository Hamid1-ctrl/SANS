import React, { useState, useRef } from 'react';
import { Search, Plus, Trash2, CheckSquare, CheckCircle2, X, Eye, Download, FileText, Image, File, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAssignments, useCreateAssignment, useDeleteAssignment, useSubmitAssignment } from '../hooks/useAssignments';
import { useUploadAssignmentFile, formatFileSize, getFileTypeInfo } from '../hooks/useStorage';
import { UserRole } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// File Type Icon Component
// ─────────────────────────────────────────────────────────────────────────────
const FileIcon: React.FC<{ ext: string; size?: number }> = ({ ext, size = 20 }) => {
  const info = getFileTypeInfo(undefined, `file.${ext}`);
  const iconMap: Record<string, React.ReactNode> = {
    pdf: <FileText size={size} />,
    img: <Image size={size} />,
    doc: <FileText size={size} />,
    txt: <FileText size={size} />,
    default: <File size={size} />
  };
  return (
    <span style={{ color: info.color }}>
      {iconMap[info.icon] || iconMap.default}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// File Preview Modal
// ─────────────────────────────────────────────────────────────────────────────
interface PreviewModalProps {
  url: string;
  fileName?: string;
  fileSize?: number;
  onClose: () => void;
}

const FilePreviewModal: React.FC<PreviewModalProps> = ({ url, fileName, fileSize, onClose }) => {
  const info = getFileTypeInfo(url, fileName);
  const ext = (fileName || url).split('.').pop()?.toLowerCase() || '';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
  const isPdf = ext === 'pdf';
  const isText = ['txt', 'md'].includes(ext);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex flex-col"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-900/95 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${info.color}20` }}>
            <FileIcon ext={ext} size={16} />
          </div>
          <div>
            <p className="text-sm font-bold text-white truncate max-w-md">{fileName || 'Attachment'}</p>
            <p className="text-[10px] text-slate-400 font-semibold">
              {info.label}{fileSize ? ` • ${formatFileSize(fileSize)}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={url}
            download={fileName}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1e7a34] text-white rounded-xl text-xs font-bold hover:bg-[#258d3f] transition-all"
          >
            <Download size={12} /> Download
          </a>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-hidden flex items-center justify-center p-6 bg-slate-950/80">
        {isPdf && (
          <iframe
            src={`${url}#toolbar=1&view=FitH`}
            className="w-full h-full rounded-2xl border-0 bg-white"
            title="PDF Preview"
          />
        )}
        {isImage && (
          <img
            src={url}
            alt={fileName || 'Preview'}
            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
          />
        )}
        {isText && (
          <iframe
            src={url}
            className="w-full h-full rounded-2xl border-0 bg-white font-mono text-sm"
            title="Text Preview"
          />
        )}
        {!isPdf && !isImage && !isText && (
          <div className="text-center space-y-4">
            <div className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center" style={{ backgroundColor: `${info.color}20` }}>
              <FileIcon ext={ext} size={40} />
            </div>
            <div>
              <p className="text-white font-bold text-base">{fileName || 'Attachment'}</p>
              <p className="text-slate-400 text-sm mt-1">{info.label} — preview not available</p>
            </div>
            <a
              href={url}
              download={fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1e7a34] text-white rounded-2xl font-bold hover:bg-[#258d3f] transition-all"
            >
              <Download size={16} /> Download File
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const AssignmentsPage: React.FC = () => {
  const { user } = useAuth();
  const { classes, activeClass } = useWorkspace();
  const { data: apiAssignments, isLoading, error } = useAssignments(activeClass?.id);
  const createAssignment = useCreateAssignment();
  const deleteAssignment = useDeleteAssignment();
  const submitAssignment = useSubmitAssignment();
  const uploadFile = useUploadAssignmentFile();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [submittingLink, setSubmittingLink] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Inline create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createMode, setCreateMode] = useState<'typed' | 'file'>('typed');
  const [newTitle, setNewTitle] = useState('');
  const [newDue, setNewDue] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [createError, setCreateError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview modal state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | undefined>();
  const [previewFileSize, setPreviewFileSize] = useState<number | undefined>();

  const openPreview = (url: string, name?: string, size?: number) => {
    setPreviewUrl(url);
    setPreviewFileName(name);
    setPreviewFileSize(size);
  };

  const mappedAssignments = apiAssignments?.map((assign) => ({
    id: assign.id,
    title: assign.title,
    desc: assign.description,
    course: activeClass?.name || 'General',
    dueDate: assign.dueDate
      ? new Date(assign.dueDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
      : 'TBD',
    daysLeft: assign.dueDate
      ? Math.ceil((new Date(assign.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0,
    status: assign.status === 0 ? 'Pending' : assign.status === 1 ? 'In Progress' : 'Submitted',
    avatarText: assign.title.substring(0, 2).toUpperCase(),
    instructions: assign.instructions,
    attachmentUrl: assign.attachmentUrl,
    attachmentFileName: assign.attachmentFileName,
    attachmentFileSize: assign.attachmentFileSize,
    createdBy: assign.createdBy,
  })) || [];

  const activeAssignment = mappedAssignments.find(a => a.id === selectedItemId) || mappedAssignments[0];

  // ── Create Assignment Handler ──────────────────────────────────────────────
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDue) return;
    const targetClassId = activeClass?.id || (classes.length > 0 ? classes[0].id : '');
    if (!targetClassId) {
      setCreateError('Please select a class workspace first.');
      return;
    }
    setCreateError('');
    setIsUploading(true);
    try {
      let attachmentUrl: string | undefined;
      let attachmentFileName: string | undefined;
      let attachmentFileSize: number | undefined;

      if (createMode === 'file') {
        if (!newFile) {
          setCreateError('Please select a file to upload.');
          setIsUploading(false);
          return;
        }
        // Use dedicated storage endpoint — does NOT create a LearningResource
        const result = await uploadFile.mutateAsync(newFile);
        attachmentUrl = result.fileUrl;
        attachmentFileName = result.fileName;
        attachmentFileSize = result.fileSize;
      }

      await createAssignment.mutateAsync({
        title: newTitle,
        description: createMode === 'typed'
          ? newDesc || 'No written description provided.'
          : 'Please download and review the guidelines in the attached file.',
        instructions: createMode === 'typed'
          ? newDesc || 'No written instructions provided.'
          : 'Please download and review the guidelines in the attached file.',
        dueDate: newDue,
        classWorkspaceId: targetClassId,
        maxPoints: 100,
        allowLateSubmission: true,
        attachmentUrl,
        attachmentFileName,
        attachmentFileSize,
      });

      setNewTitle('');
      setNewDue('');
      setNewDesc('');
      setNewFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowCreateForm(false);
      setSuccessMsg('Assignment posted successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Failed to post assignment.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAssignment = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;
    deleteAssignment.mutate(id, {
      onSuccess: () => {
        setSuccessMsg('Assignment deleted successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingLink.trim() || !activeAssignment) return;
    submitAssignment.mutate(
      { id: activeAssignment.id, data: { attachmentUrl: submittingLink, content: 'Submitted via SANS.' } },
      {
        onSuccess: () => {
          setSuccessMsg('Assignment submitted successfully!');
          setTimeout(() => setSuccessMsg(''), 3000);
        }
      }
    );
    setSubmittingLink('');
  };

  // ── Loading / Error States ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[#1e7a34] border-t-transparent animate-spin" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Loading assignments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center max-w-xs">
          <AlertCircle size={32} className="text-red-400" />
          <p className="text-sm font-bold text-slate-800 dark:text-white">Failed to load assignments</p>
          <p className="text-xs text-slate-500">Please check your connection and try again.</p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#f7f6fb] dark:bg-[#0F172A] transition-colors duration-300 relative">

      {/* File Preview Modal */}
      {previewUrl && (
        <FilePreviewModal
          url={previewUrl}
          fileName={previewFileName}
          fileSize={previewFileSize}
          onClose={() => setPreviewUrl(null)}
        />
      )}

      {/* Toast Feedback */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-lg flex items-center gap-2 animate-bounce z-[9999]">
          <CheckCircle2 size={14} className="text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* PANEL 1: Left List */}
      <aside className="w-80 bg-white dark:bg-[#1E293B] border-r border-[#ece8f3] dark:border-slate-800/40 p-5 flex flex-col shrink-0 h-full overflow-y-auto">
        <div className="mb-4 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#1e7a34]/10 flex items-center justify-center text-[#1e7a34]">
                <CheckSquare size={12} />
              </div>
              <h2 className="font-extrabold text-slate-800 dark:text-white text-sm">Assignments</h2>
            </div>

            {user?.role === UserRole.Lecturer && (
              <button
                onClick={() => { setShowCreateForm(v => !v); setCreateError(''); }}
                className="w-7 h-7 rounded-full bg-[#1e7a34] text-white flex items-center justify-center shadow hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title={showCreateForm ? 'Close' : 'New Assignment'}
              >
                {showCreateForm ? <X size={14} /> : <Plus size={14} />}
              </button>
            )}
          </div>

          {/* Create Form — Lecturer only */}
          {user?.role === UserRole.Lecturer && showCreateForm && (
            <form onSubmit={handleCreateAssignment} className="mt-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/40 rounded-2xl p-4 space-y-3">
              {/* Mode Switcher */}
              <div className="flex gap-1.5 p-0.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800/40">
                <button type="button"
                  onClick={() => { setCreateMode('typed'); setCreateError(''); }}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${createMode === 'typed' ? 'bg-[#1e7a34] text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                  ✍ Typed
                </button>
                <button type="button"
                  onClick={() => { setCreateMode('file'); setCreateError(''); }}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${createMode === 'file' ? 'bg-[#1e7a34] text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                  📁 File Upload
                </button>
              </div>

              <input type="text" placeholder="Assignment title..." value={newTitle} onChange={e => setNewTitle(e.target.value)} required
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-[11px] rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800/40 font-semibold text-slate-800 dark:text-white" />

              <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} required
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-[11px] rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800/40 font-semibold text-slate-800 dark:text-white" />

              {createMode === 'typed' ? (
                <textarea placeholder="Write instructions / requirements here..." value={newDesc} onChange={e => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-[11px] rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800/40 font-semibold text-slate-800 dark:text-white h-20 resize-none" />
              ) : (
                <div className="space-y-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.png,.jpg,.jpeg"
                    onChange={e => setNewFile(e.target.files?.[0] || null)}
                    disabled={isUploading}
                    className="w-full text-[11px] text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-[#1e7a34]/10 file:text-[#1e7a34] hover:file:bg-[#1e7a34]/20 cursor-pointer disabled:opacity-50"
                  />
                  {newFile && (
                    <p className="text-[9px] text-slate-400 font-semibold">{newFile.name} • {formatFileSize(newFile.size)}</p>
                  )}
                </div>
              )}

              {createError && <p className="text-[10px] text-red-500 font-bold">{createError}</p>}
              <button type="submit" disabled={isUploading}
                className="w-full py-2 bg-[#1e7a34] text-white text-[11px] font-bold rounded-xl hover:bg-[#258d3f] transition-all disabled:opacity-50 cursor-pointer">
                {isUploading ? 'Uploading...' : 'Publish Assignment'}
              </button>
            </form>
          )}

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search assignments..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/40 text-xs rounded-xl focus:outline-none focus:border-[#1e7a34] font-semibold text-slate-700 dark:text-slate-200"
            />
            <Search size={13} className="absolute right-3.5 top-3 text-slate-400" />
          </div>
        </div>

        {/* Assignment List */}
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {mappedAssignments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <CheckSquare size={20} className="text-slate-400" />
              </div>
              <p className="text-xs text-slate-400 font-semibold">No assignments yet</p>
              {user?.role === UserRole.Lecturer && (
                <p className="text-[10px] text-slate-400">Click + above to create one</p>
              )}
            </div>
          ) : (
            mappedAssignments
              .filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.desc.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(item => {
                const isSelected = item.id === activeAssignment?.id;
                const isOverdue = item.daysLeft < 0;
                const isUrgent = item.daysLeft >= 0 && item.daysLeft <= 3;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={`p-4 rounded-[1.5rem] cursor-pointer transition-all duration-200 border ${
                      isSelected
                        ? 'bg-slate-50 dark:bg-slate-800/60 border-[#1e7a34]/30 shadow-sm'
                        : 'border-transparent bg-transparent hover:bg-white/60 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center border ${
                        isOverdue ? 'bg-red-50 dark:bg-red-950/40 text-red-500 border-red-200'
                        : isUrgent ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-200'
                        : 'bg-[#f0f7f2] dark:bg-[#1e7a34]/10 text-[#1e7a34] border-[#d6eedd]'
                      }`}>
                        <CheckSquare size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{item.title}</h4>
                          {item.attachmentUrl && (
                            <span title="Has attachment" className="shrink-0 w-3 h-3 rounded-full bg-[#1e7a34]/30 flex items-center justify-center">
                              <FileText size={7} className="text-[#1e7a34]" />
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{item.desc}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className={`text-[9px] font-bold ${isOverdue ? 'text-red-500' : isUrgent ? 'text-amber-600' : 'text-slate-400'}`}>
                            {isOverdue ? `${Math.abs(item.daysLeft)}d overdue` : item.daysLeft === 0 ? 'Due today' : `${item.daysLeft}d left`}
                          </span>
                          <span className="text-[9px] text-slate-400">{item.dueDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </aside>

      {/* PANEL 2: Detail View */}
      <section className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white/45 dark:bg-[#1F2937]/10">
        {activeAssignment ? (
          <div className="flex flex-col h-full overflow-hidden">

            {/* Header */}
            <div className="px-8 py-5 border-b border-[#ece8f3]/80 dark:border-slate-800/40 flex items-center justify-between shrink-0 bg-white dark:bg-[#1E293B]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1e7a34] text-white font-extrabold flex items-center justify-center text-sm shadow select-none">
                  {activeAssignment.avatarText}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-sm">{activeAssignment.title}</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                    {activeAssignment.course}
                    {activeAssignment.createdBy && ` • ${activeAssignment.createdBy}`}
                  </p>
                </div>
              </div>
              {user?.role === UserRole.Lecturer && (
                <button
                  onClick={() => handleDeleteAssignment(activeAssignment.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all cursor-pointer"
                  title="Delete Assignment"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">

              {/* Main Details Card */}
              <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3]/80 dark:border-slate-800/40 rounded-3xl p-7 shadow-sm space-y-5">
                
                {/* Due Date + Status Row */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[8px] font-extrabold px-2.5 py-1 border rounded-md uppercase tracking-wider bg-[#f0f7f2] dark:bg-[#1e7a34]/10 text-[#1e7a34] border-[#d6eedd] dark:border-[#1e7a34]/20">
                    📝 Assignment
                  </span>
                  <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    Due: <strong className="text-slate-800 dark:text-white ml-1">{activeAssignment.dueDate}</strong>
                  </span>
                  <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${
                    activeAssignment.daysLeft < 0 ? 'bg-red-100 text-red-600 dark:bg-red-950/40'
                    : activeAssignment.daysLeft <= 3 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                  }`}>
                    {activeAssignment.daysLeft < 0 ? `${Math.abs(activeAssignment.daysLeft)}d overdue`
                      : activeAssignment.daysLeft === 0 ? 'Due today'
                      : `${activeAssignment.daysLeft} days left`}
                  </span>
                </div>

                {/* Description */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Description</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-line">
                    {activeAssignment.desc}
                  </p>
                </div>

                {/* Instructions (if different from description) */}
                {activeAssignment.instructions && activeAssignment.instructions !== activeAssignment.desc && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/40">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Instructions</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-line">
                      {activeAssignment.instructions}
                    </p>
                  </div>
                )}
              </div>

              {/* Attachment Card — with Preview + Download */}
              {activeAssignment.attachmentUrl && (() => {
                const fileInfo = getFileTypeInfo(activeAssignment.attachmentUrl, activeAssignment.attachmentFileName);
                const ext = (activeAssignment.attachmentFileName || activeAssignment.attachmentUrl).split('.').pop()?.toLowerCase() || '';
                return (
                  <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3]/80 dark:border-slate-800/40 rounded-3xl p-6 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Assignment File</p>
                    <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${fileInfo.color}15` }}>
                        <FileIcon ext={ext} size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                          {activeAssignment.attachmentFileName || 'Assignment Attachment'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          {fileInfo.label}
                          {activeAssignment.attachmentFileSize && ` • ${formatFileSize(activeAssignment.attachmentFileSize)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {fileInfo.previewable && (
                          <button
                            onClick={() => openPreview(activeAssignment.attachmentUrl!, activeAssignment.attachmentFileName, activeAssignment.attachmentFileSize)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                          >
                            <Eye size={11} /> Preview
                          </button>
                        )}
                        <a
                          href={activeAssignment.attachmentUrl}
                          download={activeAssignment.attachmentFileName}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 bg-[#1e7a34] text-white hover:bg-[#258d3f] rounded-xl text-[10px] font-bold transition-all"
                        >
                          <Download size={11} /> Download
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Submission Panel — Students only */}
              {user?.role === UserRole.Student && (
                <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3]/80 dark:border-slate-800/40 rounded-3xl p-6 shadow-sm space-y-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Submission Portal</p>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                      type="url"
                      placeholder="Paste your submission link (GitHub, Drive, etc.)"
                      value={submittingLink}
                      onChange={e => setSubmittingLink(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800/40 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#1e7a34]"
                    />
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#1e7a34] text-white text-xs font-bold rounded-xl hover:bg-[#258d3f] transition-all shadow cursor-pointer"
                    >
                      Submit Assignment
                    </button>
                  </form>
                </div>
              )}

            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <CheckSquare size={28} className="text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">No assignment selected</p>
              <p className="text-xs text-slate-400 mt-1">Select an assignment from the list to view details</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default AssignmentsPage;
