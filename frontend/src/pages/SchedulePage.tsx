import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Calendar, 
  MapPin, 
  Clock, 
  Search, 
  X, 
  UserCheck, 
  CheckCircle,
  Upload,
  Eye,
  FileText,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { 
  useSchedules, 
  useMasterTimetable, 
  useTodaySummary, 
  useCreateSchedule, 
  useImportMasterSchedule, 
  useUploadMasterTimetable,
  useDeleteSchedule 
} from '../hooks/useSchedules';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { UserRole } from '../types';

const LECTURE_TYPES = ['All', 'Lecture', 'Laboratory', 'Tutorial', 'Seminar', 'Examination'];
const DAYS_OF_WEEK = [
  { id: 1, name: 'Monday', short: 'MON' },
  { id: 2, name: 'Tuesday', short: 'TUE' },
  { id: 3, name: 'Wednesday', short: 'WED' },
  { id: 4, name: 'Thursday', short: 'THU' },
  { id: 5, name: 'Friday', short: 'FRI' },
  { id: 6, name: 'Saturday', short: 'SAT' },
  { id: 7, name: 'Sunday', short: 'SUN' },
];

const SchedulePage: React.FC = () => {
  const { user } = useAuth();
  const { activeClass } = useWorkspace();

  // Mode & Filter States
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [timetableSource, setTimetableSource] = useState<'class' | 'master'>('class');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Modal & Toast States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importModalTab, setImportModalTab] = useState<'upload' | 'import'>('upload');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // File Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCourseCode, setUploadCourseCode] = useState(activeClass?.code || 'CE300');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Current day of week (1=Mon ... 7=Sun)
  const currentDayOfWeekNum = new Date().getDay() === 0 ? 7 : new Date().getDay();

  // Form State for New Class Entry
  const [formData, setFormData] = useState({
    courseCode: activeClass ? activeClass.code : 'CE300',
    courseTitle: activeClass ? activeClass.name : 'Database Systems',
    dayOfWeek: currentDayOfWeekNum,
    startTime: '09:00',
    endTime: '11:00',
    building: 'Engineering Block',
    room: 'SR2',
    lectureType: 'Lecture',
    lecturerName: user ? `${user.firstName} ${user.lastName}` : 'Dr. Mensah',
    notes: 'Regular weekly session.',
    academicLevel: 'Level 300',
    semester: 'Semester 1'
  });

  // Data Hooks
  const { data: classSchedules = [], refetch: refetchClassSchedules } = useSchedules(activeClass?.id, {
    course: searchTerm,
    day: selectedDay || undefined,
    lectureType: selectedCategory !== 'All' ? selectedCategory : undefined
  });

  const { data: masterSchedules = [], refetch: refetchMasterSchedules } = useMasterTimetable();
  const { data: todaySummary, refetch: refetchTodaySummary } = useTodaySummary(activeClass?.id);

  const createScheduleMutation = useCreateSchedule();
  const importMasterMutation = useImportMasterSchedule();
  const uploadMasterMutation = useUploadMasterTimetable();
  const deleteScheduleMutation = useDeleteSchedule();

  const { classes } = useWorkspace();

  const isCourseRepOrStaff = 
    user?.role === UserRole.ClassRepresentative || 
    user?.role === UserRole.Lecturer || 
    user?.role === UserRole.Administrator || 
    String(user?.role).toLowerCase().includes('rep') ||
    String(user?.role).toLowerCase().includes('lecturer') ||
    String(user?.role).toLowerCase().includes('admin') ||
    String(user?.role) === '2' || String(user?.role) === '1' || String(user?.role) === '3';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const getLectureTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'laboratory':
      case 'lab':
        return 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300';
      case 'tutorial':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300';
      case 'seminar':
        return 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300';
      case 'examination':
      case 'exam':
        return 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300';
      case 'master document':
        return 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300';
      default:
        return 'border-[#1e7a34] bg-emerald-50 dark:bg-emerald-950/40 text-[#1e7a34] dark:text-emerald-300';
    }
  };

  // Helper to calculate exact date for target day of week
  const getExactDateForDayOfWeek = (targetDayOfWeek: number, timeString: string) => {
    const now = new Date();
    const currentDay = now.getDay() === 0 ? 7 : now.getDay();
    const diffDays = targetDayOfWeek - currentDay;
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + diffDays);
    const [h, m] = timeString.split(':').map(Number);
    targetDate.setHours(h || 9, m || 0, 0, 0);
    return targetDate;
  };

  // ─── Publish Class Timetable Slot ──────────────────────────────────────────
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedDayNum = Number(formData.dayOfWeek);
      const startDate = getExactDateForDayOfWeek(selectedDayNum, formData.startTime);
      const endDate = getExactDateForDayOfWeek(selectedDayNum, formData.endTime);

      const targetWorkspaceId = activeClass?.id || (classes.length > 0 ? classes[0].id : undefined);

      await createScheduleMutation.mutateAsync({
        title: `${formData.courseCode} ${formData.lectureType}`,
        courseCode: formData.courseCode,
        courseTitle: formData.courseTitle,
        dayOfWeek: selectedDayNum,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        building: formData.building,
        room: formData.room,
        location: `${formData.building} - ${formData.room}`,
        lectureType: formData.lectureType,
        lecturerName: formData.lecturerName,
        notes: formData.notes,
        academicLevel: formData.academicLevel,
        semester: formData.semester,
        isRecurring: true,
        classWorkspaceId: targetWorkspaceId
      });

      await refetchClassSchedules();
      await refetchTodaySummary();
      setIsModalOpen(false);
      showToast('Timetable entry published successfully!');
    } catch (err: any) {
      console.error('Publish error:', err?.response?.data || err);
      const msg = err?.response?.data?.Error || err?.response?.data?.Message || 'Failed to publish timetable entry.';
      showToast(msg);
    }
  };

  // ─── Upload Master Timetable File ─────────────────────────────────────────
  const handleMasterFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      alert('Please select a file to upload!');
      return;
    }

    setIsUploading(true);
    try {
      const payload = new FormData();
      payload.append('File', uploadFile);
      payload.append('CourseCode', uploadCourseCode || 'ALL');
      payload.append('Title', uploadTitle || uploadFile.name);
      payload.append('Description', 'Official Master University Timetable Document');

      await uploadMasterMutation.mutateAsync(payload);
      await refetchMasterSchedules();
      await refetchTodaySummary();
      setTimetableSource('master');
      setIsImportModalOpen(false);
      setUploadFile(null);
      setUploadTitle('');
      showToast('Official Master Timetable document published successfully!');
    } catch (err) {
      console.error(err);
      showToast('Error uploading Master Timetable document.');
    } finally {
      setIsUploading(false);
    }
  };

  // ─── Import Master Reference Entry ────────────────────────────────────────
  const handleImportMaster = async (masterId: string) => {
    try {
      await importMasterMutation.mutateAsync({
        masterScheduleId: masterId,
        classWorkspaceId: activeClass?.id || ''
      });
      refetchClassSchedules();
      refetchTodaySummary();
      setIsImportModalOpen(false);
      showToast('Master timetable entry imported to class schedule!');
    } catch (err) {
      console.error(err);
      showToast('Failed to import master entry.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this timetable entry?')) return;
    try {
      await deleteScheduleMutation.mutateAsync(id);
      refetchClassSchedules();
      refetchMasterSchedules();
      showToast('Timetable entry deleted.');
    } catch (err) {
      console.error(err);
    }
  };

  const activeSchedules = timetableSource === 'master' ? masterSchedules : classSchedules;

  // Filter master file documents vs schedule entries
  const masterFileDocuments = masterSchedules.filter(s => s.fileUrl || s.fileName || s.lectureType === 'Master Document' || s.isMaster);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'File Document';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-8 space-y-6 h-[calc(100vh-64px)] overflow-y-auto bg-[#f7f6fb] dark:bg-[#0F172A] relative">
      
      {/* High Visibility Toast Notification */}
      {toastMessage && (
        <div className="fixed top-8 right-8 z-[999999] bg-[#1e7a34] text-white px-6 py-4 rounded-2xl text-xs font-black shadow-2xl flex items-center gap-3 border-2 border-emerald-300 ring-4 ring-[#1e7a34]/30 animate-bounce">
          <CheckCircle size={18} className="text-emerald-200 shrink-0" />
          <span className="tracking-wide text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
              Timetable & Academic Schedule
            </h1>
            <span className="px-2.5 py-0.5 bg-emerald-500/10 dark:bg-emerald-950/50 text-[#1e7a34] dark:text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">
              {activeClass ? activeClass.code : 'Official'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Monitor course lecture slots, final examinations, and laboratory sessions for {activeClass ? activeClass.name : 'your active classes'}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isCourseRepOrStaff ? (
            <button 
              onClick={() => { setTimetableSource('master'); setImportModalTab('upload'); setIsImportModalOpen(true); }}
              className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-2xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs"
            >
              <Upload size={14} />
              <span>Upload / View Master Timetable File</span>
            </button>
          ) : (
            <button 
              onClick={() => { setTimetableSource('master'); }}
              className="flex items-center gap-1.5 bg-emerald-500/10 dark:bg-emerald-950/50 text-[#1e7a34] dark:text-emerald-300 px-4 py-2.5 rounded-2xl text-xs font-bold hover:bg-emerald-500/20 transition-all cursor-pointer border border-emerald-500/20 shadow-xs"
            >
              <Eye size={14} />
              <span>View Master Timetable File</span>
            </button>
          )}

          {isCourseRepOrStaff && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-[#1e7a34] text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-lg shadow-[#1e7a34]/25 hover:bg-[#1e7a34]/95 transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Publish Class Slot</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Source Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/80 rounded-2xl p-4 shadow-soft">
        
        {/* Source Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold shrink-0">
          <button 
            onClick={() => setTimetableSource('class')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${timetableSource === 'class' ? 'bg-white dark:bg-[#1E293B] text-slate-800 dark:text-white shadow-xs font-extrabold' : 'text-slate-500'}`}
          >
            Class Timetable ({activeClass ? activeClass.code : 'Joined'})
          </button>
          <button 
            onClick={() => setTimetableSource('master')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${timetableSource === 'master' ? 'bg-white dark:bg-[#1E293B] text-slate-800 dark:text-white shadow-xs font-extrabold' : 'text-slate-500'}`}
          >
            University Master Timetable
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by course code, title, lecturer, or venue..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#1e7a34]"
          />
        </div>

        {/* Category Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {LECTURE_TYPES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat 
                  ? 'bg-[#1e7a34] text-white shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-900/50 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* MASTER FILE DOCUMENTS DECK (Show when in Master source mode or when documents exist) */}
      {timetableSource === 'master' && (
        <div className="bg-gradient-to-r from-emerald-900/10 via-slate-900/10 to-teal-900/10 dark:from-emerald-950/40 dark:to-slate-900/40 border border-emerald-500/20 dark:border-slate-800 rounded-[2rem] p-6 space-y-4 shadow-soft">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-[#1e7a34]" />
              <h3 className="text-sm font-black text-slate-800 dark:text-white">Official Published Master Timetable Documents</h3>
            </div>
            <button
              onClick={() => { setImportModalTab('upload'); setIsImportModalOpen(true); }}
              className="text-xs font-bold text-[#1e7a34] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Upload size={12} /> Upload New Master File
            </button>
          </div>

          {masterFileDocuments.length === 0 ? (
            <div className="p-4 bg-white/60 dark:bg-slate-900/40 rounded-2xl text-center space-y-1">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">No Master Timetable Document Uploaded Yet</p>
              <p className="text-[10px] text-slate-400">Click "Upload New Master File" to attach your department's official PDF or Excel timetable.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {masterFileDocuments.map((doc) => (
                <div key={doc.id} className="p-4 bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-3 shadow-xs flex flex-col justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-black uppercase text-[#1e7a34] tracking-wider">{doc.courseCode || 'MASTER'}</span>
                      <h4 className="text-xs font-black text-slate-800 dark:text-white truncate">{doc.title}</h4>
                      <p className="text-[10px] text-slate-400 font-medium">{doc.fileName} • {formatFileSize(doc.fileSize)}</p>
                    </div>
                  </div>
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 bg-[#1e7a34] hover:bg-[#1e7a34]/90 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs"
                  >
                    <ExternalLink size={14} />
                    <span>View / Download Document</span>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* MAIN PANEL: Timetable Grid Card */}
        <div className="lg:col-span-3 bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/80 rounded-[2rem] shadow-soft p-6 md:p-8">
          
          {/* Header Controls (Week / Month view switcher) */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-100 dark:border-slate-800/40">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
                {timetableSource === 'master' ? 'University Master Reference Slots' : `Class Schedule (${activeClass ? activeClass.code : 'CE300'})`}
              </h2>
              {selectedDay && (
                <button 
                  onClick={() => setSelectedDay(null)}
                  className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full text-[10px] font-bold flex items-center gap-1 hover:text-slate-800 cursor-pointer"
                >
                  Clear Day Filter <X size={10} />
                </button>
              )}
            </div>

            {/* View Switcher: Week (Default) / Month */}
            <div className="bg-[#f1edf7] dark:bg-slate-900 rounded-xl p-1 flex text-xs font-bold text-slate-500">
              <button 
                onClick={() => setViewMode('week')}
                className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'week' 
                    ? 'bg-white dark:bg-[#1E293B] text-slate-800 dark:text-slate-100 shadow-sm font-extrabold' 
                    : 'hover:text-slate-700'
                }`}
              >
                Week View
              </button>
              <button 
                onClick={() => setViewMode('month')}
                className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'month' 
                    ? 'bg-white dark:bg-[#1E293B] text-slate-800 dark:text-slate-100 shadow-sm font-extrabold' 
                    : 'hover:text-slate-700'
                }`}
              >
                Month View
              </button>
            </div>
          </div>

          {/* WEEK VIEW (DEFAULT) */}
          {viewMode === 'week' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3 select-none">
                {DAYS_OF_WEEK.map((d) => {
                  const dayEntries = activeSchedules.filter(s => s.dayOfWeek === d.id && !s.fileUrl);
                  const isFilterActive = selectedDay === d.id;

                  return (
                    <div 
                      key={d.id} 
                      onClick={() => setSelectedDay(selectedDay === d.id ? null : d.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer min-h-[140px] flex flex-col justify-between ${
                        isFilterActive 
                          ? 'border-[#1e7a34] bg-[#1e7a34]/5 ring-2 ring-[#1e7a34]/20' 
                          : 'border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/20 hover:border-slate-200 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/40 pb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          {d.name}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {dayEntries.length}
                        </span>
                      </div>

                      <div className="mt-2 flex-1 space-y-1.5 overflow-y-auto max-h-[180px]">
                        {dayEntries.length === 0 ? (
                          <p className="text-[10px] text-slate-400 italic pt-2">No classes</p>
                        ) : (
                          dayEntries.map((sch) => {
                            const timeStr = new Date(sch.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            return (
                              <div
                                key={sch.id}
                                className={`p-2 rounded-xl border-l-3 ${getLectureTypeBadge(sch.lectureType)} shadow-xs group relative`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-black uppercase">{sch.lectureType}</span>
                                  {isCourseRepOrStaff && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleDelete(sch.id); }}
                                      title="Delete entry"
                                      className="text-slate-400 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                    >
                                      <X size={10} />
                                    </button>
                                  )}
                                </div>
                                <h4 className="text-[11px] font-bold truncate mt-0.5">{sch.courseCode || sch.title}</h4>
                                <p className="text-[9px] opacity-80 font-medium">{timeStr} • {sch.room || sch.location}</p>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* MONTH VIEW ALTERNATIVE */
            <div className="space-y-4">
              <div className="grid grid-cols-7 gap-3 mb-2 text-center select-none">
                {DAYS_OF_WEEK.map((d) => (
                  <div key={d.id} className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    {d.short}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-3">
                {Array.from({ length: 35 }).map((_, i) => {
                  const dayNum = i - 2 + 1;
                  const isCurrent = dayNum > 0 && dayNum <= 31;
                  const dayOfWeekIdx = ((i) % 7) + 1;
                  const dayEvents = isCurrent ? activeSchedules.filter(s => s.dayOfWeek === dayOfWeekIdx && !s.fileUrl) : [];

                  return (
                    <div
                      key={i}
                      className={`min-h-[95px] border border-slate-100 dark:border-slate-800/40 rounded-2xl p-2.5 flex flex-col justify-between ${
                        !isCurrent ? 'opacity-30 bg-slate-50/50 dark:bg-slate-900/10' : 'bg-slate-50/20 dark:bg-slate-900/5'
                      }`}
                    >
                      <span className="text-[11px] font-bold text-slate-500">{isCurrent ? dayNum : ''}</span>
                      <div className="flex-1 mt-1 space-y-1 overflow-hidden">
                        {dayEvents.slice(0, 2).map((evt) => (
                          <div
                            key={evt.id}
                            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border-l-2 ${getLectureTypeBadge(evt.lectureType)} truncate`}
                          >
                            {evt.courseCode || evt.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR: Today's Schedule & Next Class Widget */}
        <aside className="space-y-6">
          
          {/* NEXT CLASS COUNTDOWN CARD */}
          <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/80 rounded-[2rem] p-6 shadow-soft relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#1e7a34] dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-500/20">
                Next Upcoming Class
              </span>
              <Clock size={14} className="text-[#1e7a34] dark:text-emerald-400" />
            </div>

            {todaySummary?.nextClass ? (
              <div className="space-y-2">
                <h3 className="text-base font-black text-slate-800 dark:text-white tracking-tight">
                  {todaySummary.nextClass.courseCode} - {todaySummary.nextClass.courseTitle || todaySummary.nextClass.title}
                </h3>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-[#1e7a34] dark:text-emerald-400 font-bold">
                    <Clock size={12} />
                    <span>{todaySummary.startsIn || 'Starting soon'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                    <MapPin size={12} />
                    <span>Venue: {todaySummary.nextClass.room || todaySummary.nextClass.location} ({todaySummary.nextClass.building})</span>
                  </div>
                  {todaySummary.nextClass.lecturerName && (
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                      <UserCheck size={12} />
                      <span>Lecturer: {todaySummary.nextClass.lecturerName}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-3 text-center space-y-1">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Upcoming Lectures Today</p>
                <p className="text-[10px] text-slate-400">All lectures for today are finished or not scheduled.</p>
              </div>
            )}
          </div>

          {/* TODAY'S TIMETABLE CARD */}
          <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/80 rounded-[2rem] shadow-soft p-6">
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar size={16} className="text-[#1e7a34] dark:text-emerald-400" />
                <span>Today's Timetable</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{todaySummary?.todayDate || 'Today'}</span>
            </h3>

            {(!todaySummary?.todayClasses || todaySummary.todayClasses.length === 0) ? (
              <div className="p-6 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle size={20} />
                </div>
                <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300">No Scheduled Classes Today</h4>
                <p className="text-[10px] text-slate-400">You have no scheduled lectures or sessions today. Enjoy your day!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaySummary.todayClasses.map((cls) => {
                  const startTimeStr = new Date(cls.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const endTimeStr = new Date(cls.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div 
                      key={cls.id} 
                      className={`p-3.5 rounded-2xl border-l-4 ${getLectureTypeBadge(cls.lectureType)} border border-slate-100 dark:border-slate-800/60 shadow-xs space-y-1.5`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#1e7a34] dark:text-emerald-300">
                          {startTimeStr} - {endTimeStr}
                        </span>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {cls.lectureType}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-slate-800 dark:text-white text-xs">
                        {cls.courseCode} {cls.courseTitle || cls.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                        <MapPin size={10} />
                        <span>{cls.room || cls.location}</span>
                        <span>•</span>
                        <span>{cls.lecturerName || 'Lecturer'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SEMESTER TIMELINE */}
          <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/80 rounded-[2rem] p-6 shadow-soft relative overflow-hidden">
            <h3 className="font-extrabold text-[10px] uppercase tracking-widest text-slate-400 mb-1">
              Semester Timeline
            </h3>
            <p className="text-xl font-black text-slate-800 dark:text-slate-100 mb-3">Semester 1 (Week 12 of 16)</p>
            <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-1.5">
              <div className="bg-[#1e7a34] h-1.5 rounded-full" style={{ width: '75%' }}></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wider flex items-center gap-1">
              <Clock size={11} />
              <span>Final examinations begin in 9 days.</span>
            </p>
          </div>
        </aside>

      </div>

      {/* MODAL 1: PUBLISH / CREATE CLASS TIMETABLE SLOT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#1e7a34]/10 text-[#1e7a34] flex items-center justify-center">
                  <Calendar size={16} />
                </div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Publish Class Timetable Entry</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Course Code</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.courseCode}
                    onChange={(e) => setFormData({ ...formData, courseCode: e.target.value })}
                    placeholder="e.g. CE300"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl font-bold focus:outline-none focus:border-[#1e7a34]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Lecture Type</label>
                  <select 
                    value={formData.lectureType}
                    onChange={(e) => setFormData({ ...formData, lectureType: e.target.value })}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl font-bold focus:outline-none focus:border-[#1e7a34]"
                  >
                    <option value="Lecture" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium">Lecture</option>
                    <option value="Laboratory" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium">Laboratory</option>
                    <option value="Tutorial" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium">Tutorial</option>
                    <option value="Seminar" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium">Seminar</option>
                    <option value="Examination" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium">Examination</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Course Title</label>
                <input 
                  type="text" 
                  required 
                  value={formData.courseTitle}
                  onChange={(e) => setFormData({ ...formData, courseTitle: e.target.value })}
                  placeholder="e.g. Database Systems"
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl font-medium focus:outline-none focus:border-[#1e7a34]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Day of Week</label>
                  <select 
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData({ ...formData, dayOfWeek: Number(e.target.value) })}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl font-bold focus:outline-none focus:border-[#1e7a34]"
                  >
                    {DAYS_OF_WEEK.map(d => (
                      <option key={d.id} value={d.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium">{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Start Time</label>
                  <input 
                    type="time" 
                    required 
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl font-bold focus:outline-none focus:border-[#1e7a34] dark:[color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">End Time</label>
                  <input 
                    type="time" 
                    required 
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl font-bold focus:outline-none focus:border-[#1e7a34] dark:[color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Building</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.building}
                    onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                    placeholder="e.g. Engineering Block"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl font-medium focus:outline-none focus:border-[#1e7a34]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Venue / Room Number</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    placeholder="e.g. SR1, SR2, Lab 2"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl font-medium focus:outline-none focus:border-[#1e7a34]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Assigned Lecturer</label>
                <input 
                  type="text" 
                  value={formData.lecturerName}
                  onChange={(e) => setFormData({ ...formData, lecturerName: e.target.value })}
                  placeholder="e.g. Dr. Mensah"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl font-medium focus:outline-none focus:border-[#1e7a34]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-xl font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={createScheduleMutation.isPending}
                  className="px-5 py-2 bg-[#1e7a34] text-white rounded-xl font-bold shadow-md hover:bg-[#1e7a34]/90 cursor-pointer"
                >
                  {createScheduleMutation.isPending ? 'Publishing...' : 'Publish Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: UPLOAD & IMPORT MASTER TIMETABLE FILE */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Upload size={16} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-white">University Master Timetable Options</h3>
                  <p className="text-[10px] text-slate-400">Upload official PDF/Excel file or import reference course slots.</p>
                </div>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Sub-tab Navigation */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
              <button 
                onClick={() => setImportModalTab('upload')}
                className={`flex-1 py-2 rounded-lg transition-all cursor-pointer text-center ${importModalTab === 'upload' ? 'bg-white dark:bg-[#1E293B] text-[#1e7a34] dark:text-[#3ea556] shadow-xs font-extrabold' : 'text-slate-500'}`}
              >
                Upload Master Timetable Document
              </button>
              <button 
                onClick={() => setImportModalTab('import')}
                className={`flex-1 py-2 rounded-lg transition-all cursor-pointer text-center ${importModalTab === 'import' ? 'bg-white dark:bg-[#1E293B] text-[#1e7a34] dark:text-[#3ea556] shadow-xs font-extrabold' : 'text-slate-500'}`}
              >
                One-Click Import Course Slots
              </button>
            </div>

            {/* TAB A: FILE UPLOADER */}
            {importModalTab === 'upload' ? (
              <form onSubmit={handleMasterFileUpload} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Select Master Timetable Document (PDF, Excel, Word, Image)</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-[#1e7a34] rounded-2xl text-center bg-slate-50 dark:bg-slate-900/40 cursor-pointer transition-all space-y-2"
                  >
                    <Upload size={24} className="mx-auto text-[#1e7a34]" />
                    {uploadFile ? (
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-[#1e7a34]">{uploadFile.name}</p>
                        <p className="text-[10px] text-slate-400">{formatFileSize(uploadFile.size)}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-bold text-slate-700 dark:text-slate-300">Click to choose a file from your computer</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Supports PDF, XLSX, DOCX, PNG, JPG (Max 25MB)</p>
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="hidden" 
                    accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Document Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Official Semester 1 Master Timetable"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-medium focus:outline-none focus:border-[#1e7a34]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Course / Dept Code</label>
                    <input 
                      type="text" 
                      placeholder="e.g. CE300 or ALL"
                      value={uploadCourseCode}
                      onChange={(e) => setUploadCourseCode(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold focus:outline-none focus:border-[#1e7a34]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button 
                    type="button" 
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-xl font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isUploading}
                    className="px-5 py-2 bg-[#1e7a34] text-white rounded-xl font-bold shadow-md hover:bg-[#1e7a34]/90 cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload size={14} />
                    <span>{isUploading ? 'Uploading...' : 'Publish Master Timetable File'}</span>
                  </button>
                </div>
              </form>
            ) : (
              /* TAB B: IMPORT COURSE SLOTS */
              <div className="space-y-3">
                {masterSchedules.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">No master reference slots available.</p>
                ) : (
                  masterSchedules.map((m) => {
                    const dayName = DAYS_OF_WEEK.find(d => d.id === m.dayOfWeek)?.name || 'Monday';
                    return (
                      <div 
                        key={m.id} 
                        className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-slate-800 dark:text-white">{m.courseCode} - {m.title}</span>
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-[#1e7a34]/10 text-[#1e7a34] rounded-full">{m.lectureType}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {dayName} • {m.room || m.location} ({m.building}) • {m.lecturerName}
                          </p>
                        </div>
                        <button
                          onClick={() => handleImportMaster(m.id)}
                          disabled={importMasterMutation.isPending}
                          className="px-3 py-1.5 bg-[#1e7a34] text-white rounded-xl text-xs font-bold hover:bg-[#1e7a34]/90 shrink-0 cursor-pointer shadow-xs"
                        >
                          Import Slot
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default SchedulePage;
