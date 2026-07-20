import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { UserRole } from '../types';
import api from '../lib/axios';
import { 
  School, 
  UserPlus, 
  BookOpen, 
  Award,
  CheckCircle,
  PlusCircle,
  Mail,
  Layers,
  Edit,
  Trash2
} from 'lucide-react';

const MyClassesPage: React.FC = () => {
  const { user } = useAuth();
  const { classes, activeClass, setActiveClass, refreshClasses } = useWorkspace();
  const [activeClassId, setActiveClassId] = useState<string>('');
  const navigate = useNavigate();
  
  // Class creation form state (shared by Lecturer / Rep)
  const [className, setClassName] = useState('');
  const [classCode, setClassCode] = useState('');
  const [courseCodeVal, setCourseCodeVal] = useState('');
  const [departmentVal, setDepartmentVal] = useState('');
  const [academicLevelVal, setAcademicLevelVal] = useState('100');
  const [semesterVal, setSemesterVal] = useState('First');
  const [classDesc, setClassDesc] = useState('');
  const [createError, setCreateError] = useState('');
  
  // Class editing states
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [editClassCode, setEditClassCode] = useState('');
  const [editCourseCode, setEditCourseCode] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editLevel, setEditLevel] = useState('100');
  const [editSemester, setEditSemester] = useState('First');
  const [editClassDesc, setEditClassDesc] = useState('');
  const [editError, setEditError] = useState('');
  
  // Join Form
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  // Invite Form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');

  // Available classes for lecturers to claim
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);

  const [successMsg, setSuccessMsg] = useState('');

  // Bulk Actions State
  const [selectedBulkClasses, setSelectedBulkClasses] = useState<string[]>([]);
  const [bulkActionType, setBulkActionType] = useState<'announcement' | 'resource' | 'message'>('announcement');
  
  // Bulk Announcement
  const [bulkAnnTitle, setBulkAnnTitle] = useState('');
  const [bulkAnnContent, setBulkAnnContent] = useState('');
  
  // Bulk Resource
  const [bulkResFile, setBulkResFile] = useState<File | null>(null);
  const [bulkResTitle, setBulkResTitle] = useState('');
  const [bulkResCategory, setBulkResCategory] = useState('Document');
  
  // Bulk Message
  const [bulkMsgContent, setBulkMsgContent] = useState('');
  
  // Bulk Errors / Loading
  const [bulkError, setBulkError] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  // Fetch available classes for claim
  const fetchAvailableClasses = async () => {
    if (user?.role !== UserRole.Lecturer) return;
    setLoadingAvailable(true);
    try {
      const response = await api.get('/classworkspaces/available');
      setAvailableClasses(response.data);
    } catch (err) {
      console.error('Failed to load unclaimed classes', err);
    } finally {
      setLoadingAvailable(false);
    }
  };

  useEffect(() => {
    fetchAvailableClasses();
  }, [user]);

  const handleBulkActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBulkClasses.length === 0) {
      setBulkError('Please select at least one target class.');
      return;
    }
    setBulkError('');
    setBulkLoading(true);

    try {
      if (bulkActionType === 'announcement') {
        if (!bulkAnnTitle.trim() || !bulkAnnContent.trim()) {
          setBulkError('Title and Content are required.');
          setBulkLoading(false);
          return;
        }
        await api.post('/announcements', {
          title: bulkAnnTitle,
          content: bulkAnnContent,
          classWorkspaceIds: selectedBulkClasses,
          isGlobal: false
        });
        setSuccessMsg('Bulk Announcement posted successfully!');
        setBulkAnnTitle('');
        setBulkAnnContent('');
      } else if (bulkActionType === 'resource') {
        if (!bulkResFile) {
          setBulkError('Please choose a file to upload.');
          setBulkLoading(false);
          return;
        }
        const formData = new FormData();
        formData.append('file', bulkResFile);
        formData.append('title', bulkResTitle || bulkResFile.name.substring(0, bulkResFile.name.lastIndexOf('.')) || bulkResFile.name);
        formData.append('description', 'Uploaded via SANS bulk resources manager.');
        formData.append('category', bulkResCategory);
        selectedBulkClasses.forEach(id => {
          formData.append('classWorkspaceIds', id);
        });

        await api.post('/resources/upload', formData);
        setSuccessMsg('Bulk Learning Resource uploaded successfully!');
        setBulkResFile(null);
        setBulkResTitle('');
      } else if (bulkActionType === 'message') {
        if (!bulkMsgContent.trim()) {
          setBulkError('Message content cannot be empty.');
          setBulkLoading(false);
          return;
        }
        await api.post('/messages/class/bulk', {
          content: bulkMsgContent,
          classWorkspaceIds: selectedBulkClasses
        });
        setSuccessMsg('Bulk Message sent successfully!');
        setBulkMsgContent('');
      }
      setSelectedBulkClasses([]);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setBulkError(err.response?.data?.message || 'Bulk action execution failed.');
    } finally {
      setBulkLoading(false);
    }
  };

  useEffect(() => {
    if (classes.length > 0) {
      if (!activeClassId) {
        setActiveClassId(classes[0].id);
      }
    }
  }, [classes, activeClassId]);

  const selectedClass = classes.find(c => c.id === activeClassId) || classes[0];

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim() || !classCode.trim()) {
      setCreateError('Class Name and Enrollment Join Code are required.');
      return;
    }
    setCreateError('');
    try {
      await api.post('/classworkspaces', {
        name: className,
        code: classCode,
        description: classDesc,
        courseCode: courseCodeVal,
        department: departmentVal,
        academicLevel: academicLevelVal,
        semester: semesterVal
      });
      setSuccessMsg(`Class "${className}" created successfully!`);
      setClassName('');
      setClassCode('');
      setCourseCodeVal('');
      setDepartmentVal('');
      setAcademicLevelVal('100');
      setSemesterVal('First');
      setClassDesc('');
      await refreshClasses();
      fetchAvailableClasses();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Failed to create class.');
    }
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setJoinError('Please enter a class code.');
      return;
    }
    setJoinError('');
    try {
      const response = await api.post('/classworkspaces/join', {
        code: joinCode
      });
      setSuccessMsg(`Enrolled in ${response.data.name}!`);
      setJoinCode('');
      await refreshClasses();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setJoinError(err.response?.data?.message || 'Invalid code or already joined.');
    }
  };

  const handleClaimClass = async (classId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to teach "${name}"?`)) return;
    try {
      await api.post(`/classworkspaces/${classId}/claim`);
      setSuccessMsg(`You have successfully claimed class "${name}"!`);
      await refreshClasses();
      await fetchAvailableClasses();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Claiming class failed.');
    }
  };

  const handleInviteStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !selectedClass) {
      setInviteError('Please enter a student email.');
      return;
    }
    setInviteError('');
    try {
      await api.post(`/classworkspaces/${selectedClass.id}/invite`, {
        email: inviteEmail
      });
      setSuccessMsg(`Invitation sent to ${inviteEmail}!`);
      setInviteEmail('');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setInviteError(err.response?.data?.message || 'Student not found.');
    }
  };

  const handleStartEditClass = (cls: any) => {
    setEditingClassId(cls.id);
    setEditClassName(cls.name || '');
    setEditClassCode(cls.code || '');
    setEditCourseCode(cls.courseCode || '');
    setEditDepartment(cls.departmentText || '');
    setEditLevel(cls.academicLevel?.toString() || '100');
    setEditSemester(cls.semester || 'First');
    setEditClassDesc(cls.description || '');
    setEditError('');
  };

  const handleCancelEditClass = () => {
    setEditingClassId(null);
  };

  const handleSaveEditClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClassName.trim() || !editClassCode.trim()) {
      setEditError('Name and workspace code are required.');
      return;
    }
    try {
      await api.put(`/classworkspaces/${editingClassId}`, {
        name: editClassName,
        code: editClassCode,
        courseCode: editCourseCode,
        departmentText: editDepartment,
        academicLevel: parseInt(editLevel),
        semester: editSemester,
        description: editClassDesc
      });
      setSuccessMsg('Class workspace updated successfully!');
      setEditingClassId(null);
      await refreshClasses();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Failed to update class workspace.');
    }
  };

  const handleDeleteClass = async (classId: string, name: string) => {
    if (!window.confirm(`Are you absolutely sure you want to end and delete class "${name}"? This action is permanent and deletes all class resources/schedules.`)) return;
    try {
      await api.delete(`/classworkspaces/${classId}`);
      setSuccessMsg(`Class workspace "${name}" deleted.`);
      if (activeClass?.id === classId) {
        setActiveClass(null);
      }
      await refreshClasses();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Deleting class workspace failed.');
    }
  };

  // ==========================================
  // RENDER STUDENT VIEW
  // ==========================================
  const renderStudentView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left side list */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2rem] p-6 shadow-soft space-y-4">
          <h2 className="text-base font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <School className="text-brand-primary" size={18} />
            <span>Enrolled Courses</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classes.length === 0 ? (
              <div className="col-span-2 py-12 text-center space-y-3">
                <School size={32} className="mx-auto text-slate-300" />
                <p className="text-xs font-semibold text-slate-400 dark:text-[#94A3B8]">
                  You are not enrolled in any classes yet. Join one using the code on the right!
                </p>
              </div>
            ) : (
              classes.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => {
                    setActiveClassId(item.id);
                    setActiveClass(item);
                    navigate('/dashboard');
                  }}
                  className={`border rounded-2xl p-5 flex flex-col justify-between hover:scale-[1.02] hover:shadow-md transition-all duration-300 cursor-pointer ${
                    item.id === activeClass?.id 
                      ? 'border-2 border-[#1e7a34] dark:border-[#3ea556] bg-emerald-50/30 dark:bg-emerald-950/20 shadow-md' 
                      : 'border-[#ece8f3] dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-extrabold text-brand-primary bg-brand-primary-light/40 dark:bg-brand-primary/10 px-2 py-0.5 rounded uppercase">
                        {item.code}
                      </span>
                      {item.id === activeClass?.id && (
                        <span className="text-[9px] font-extrabold bg-[#1e7a34] text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider select-none animate-pulse">
                          ● Active Workspace
                        </span>
                      )}
                    </div>
                    <h3 className="font-extrabold text-slate-800 dark:text-[#F8FAFC] text-sm mt-3">{item.name}</h3>
                    {item.courseCode && (
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-1">Course Code: {item.courseCode}</p>
                    )}
                    <p className="text-[11px] text-slate-500 dark:text-[#CBD5E1] font-medium mt-1">Lecturer: {item.lecturerName}</p>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-4 flex items-center justify-between text-[10px] text-slate-405 dark:text-[#94A3B8] font-bold">
                    <span>{item.academicLevel ? `L${item.academicLevel}` : 'Academic Class'}</span>
                    <span>{item.studentsCount} Classmates</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right side Join Code Form */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2rem] p-6 shadow-soft space-y-4">
          <h2 className="text-base font-black text-slate-800 dark:text-white mb-3 flex items-center gap-1.5">
            <UserPlus size={18} className="text-brand-primary" />
            <span>Join Class via Code</span>
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-medium leading-relaxed">
            Enter the enrollment token provided by your lecturer or class representative to instantly unlock resource items.
          </p>

          <form onSubmit={handleJoinClass} className="space-y-3 pt-2">
            <input
              type="text"
              placeholder="e.g. CS101"
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value);
                if (joinError) setJoinError('');
              }}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-850 rounded-xl text-xs focus:outline-none focus:border-brand-primary font-semibold text-center uppercase shadow-sm dark:text-white"
            />
            {joinError && (
              <p className="text-[10px] text-red-500 font-bold pl-1 select-none animate-pulse">{joinError}</p>
            )}
            
            <button
              type="submit"
              className="w-full py-3 bg-brand-primary text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-premium cursor-pointer"
            >
              Enroll Course
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // RENDER COURSE REPRESENTATIVE VIEW (Creates Class)
  // ==========================================
  const renderRepView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left side list of enrolled classes */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2rem] p-6 shadow-soft space-y-4">
          <h2 className="text-base font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <School className="text-brand-primary" size={18} />
            <span>Enrolled Courses</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classes.length === 0 ? (
              <div className="col-span-2 py-12 text-center space-y-3">
                <School size={32} className="mx-auto text-slate-350" />
                <p className="text-xs font-semibold text-slate-400 dark:text-[#94A3B8]">
                  You are not enrolled in any classes yet. Create or join a class!
                </p>
              </div>
            ) : (
              classes.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => {
                    setActiveClassId(item.id);
                    setActiveClass(item);
                    navigate('/dashboard');
                  }}
                  className={`border rounded-2xl p-5 flex flex-col justify-between hover:scale-[1.02] hover:shadow-md transition-all duration-300 cursor-pointer ${
                    item.id === activeClass?.id 
                      ? 'border-2 border-[#1e7a34] dark:border-[#3ea556] bg-emerald-50/30 dark:bg-emerald-950/20 shadow-md' 
                      : 'border-[#ece8f3] dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-extrabold text-brand-primary bg-brand-primary-light/40 dark:bg-brand-primary/10 px-2 py-0.5 rounded uppercase">
                        {item.code}
                      </span>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleStartEditClass(item)}
                          className="p-1 text-slate-400 hover:text-[#1e7a34] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                          title="Edit Class Settings"
                        >
                          <Edit size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteClass(item.id, item.name)}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all cursor-pointer"
                          title="Delete Class"
                        >
                          <Trash2 size={12} />
                        </button>
                        {item.id === activeClass?.id && (
                          <span className="text-[9px] font-extrabold bg-[#1e7a34] text-white px-2 py-0.5 rounded-full uppercase tracking-wider select-none animate-pulse">
                            ● Active
                          </span>
                        )}
                      </div>
                    </div>
                    <h3 className="font-extrabold text-slate-800 dark:text-[#F8FAFC] text-sm mt-3">{item.name}</h3>
                    {item.courseCode && (
                      <p className="text-[10px] font-bold text-slate-405 dark:text-slate-500 uppercase mt-1">Course Code: {item.courseCode}</p>
                    )}
                    <p className="text-[11px] text-slate-500 dark:text-[#CBD5E1] font-medium mt-1">
                      Lecturer: {item.hasLecturer ? item.lecturerName : '⚠️ Awaiting Faculty Claim'}
                    </p>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-4 flex items-center justify-between text-[10px] text-slate-400 dark:text-[#94A3B8] font-bold">
                    <span>{item.academicLevel ? `Level ${item.academicLevel}` : 'Representative'}</span>
                    <span>{item.studentsCount} Classmates</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right side Creation & Join Forms */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2rem] p-6 shadow-soft space-y-4">
          <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
            <PlusCircle size={16} className="text-[#1e7a34]" />
            <span>Create New Academic Class</span>
          </h3>

          <form onSubmit={handleCreateClass} className="space-y-3 pt-2">
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase pl-1 block mb-1">Class Title</label>
              <input
                type="text"
                placeholder="e.g. Algorithms & Data Structures"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-[#1e7a34] font-semibold dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase pl-1 block mb-1">Course Code</label>
                <input
                  type="text"
                  placeholder="e.g. CS204"
                  value={courseCodeVal}
                  onChange={(e) => setCourseCodeVal(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-[#1e7a34] font-semibold uppercase dark:text-white"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase pl-1 block mb-1">Join Code</label>
                <input
                  type="text"
                  placeholder="e.g. ALGO2"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-[#1e7a34] font-semibold uppercase dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase pl-1 block mb-1">Academic Level</label>
                <select
                  value={academicLevelVal}
                  onChange={(e) => setAcademicLevelVal(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-850 rounded-xl text-xs focus:outline-none focus:border-[#1e7a34] font-semibold dark:text-slate-300"
                >
                  <option value="100">100 Level</option>
                  <option value="200">200 Level</option>
                  <option value="300">300 Level</option>
                  <option value="400">400 Level</option>
                  <option value="Postgraduate">Postgraduate</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase pl-1 block mb-1">Semester</label>
                <select
                  value={semesterVal}
                  onChange={(e) => setSemesterVal(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-850 rounded-xl text-xs focus:outline-none focus:border-[#1e7a34] font-semibold dark:text-slate-300"
                >
                  <option value="First">First Semester</option>
                  <option value="Second">Second Semester</option>
                  <option value="Third">Third Semester</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase pl-1 block mb-1">Department</label>
              <input
                type="text"
                placeholder="e.g. Computer Science"
                value={departmentVal}
                onChange={(e) => setDepartmentVal(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-[#1e7a34] font-semibold dark:text-white"
              />
            </div>

            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase pl-1 block mb-1">Short Description</label>
              <textarea
                placeholder="Topic outlines..."
                value={classDesc}
                onChange={(e) => setClassDesc(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-[#1e7a34] font-semibold dark:text-white h-16 resize-none"
              />
            </div>

            {createError && (
              <p className="text-[10px] text-red-500 font-bold pl-1 animate-pulse">{createError}</p>
            )}
            
            <button
              type="submit"
              className="w-full py-2.5 bg-[#1e7a34] text-white font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-[#258d3f] transition-all cursor-pointer"
            >
              Publish Class Workspace
            </button>
          </form>
        </div>

        {/* Join Class */}
        <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2rem] p-6 shadow-soft space-y-4">
          <h2 className="text-base font-black text-slate-800 dark:text-white mb-3 flex items-center gap-1.5">
            <UserPlus size={18} className="text-brand-primary" />
            <span>Join Class via Code</span>
          </h2>
          <form onSubmit={handleJoinClass} className="space-y-3 pt-1">
            <input
              type="text"
              placeholder="e.g. CS101"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-850 rounded-xl text-xs focus:outline-none focus:border-brand-primary font-semibold text-center uppercase dark:text-white"
            />
            {joinError && <p className="text-[10px] text-red-500 font-bold pl-1 animate-pulse">{joinError}</p>}
            <button type="submit" className="w-full py-3 bg-brand-primary text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer">
              Enroll Course
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // RENDER LECTURER VIEW ( teaching + claiming )
  // ==========================================
  const renderLecturerView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left teaching portfolio list */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2rem] p-6 shadow-soft space-y-4">
          <h2 className="text-base font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Award className="text-brand-primary" size={18} />
            <span>My Teaching Classes</span>
          </h2>

          <div className="space-y-3">
            {classes.length === 0 ? (
              <p className="text-xs font-semibold text-slate-400 dark:text-[#94A3B8] p-4 text-center">
                No classes claimed or created yet. Claim classes created by Reps below or create a new workspace!
              </p>
            ) : (
              classes.map(item => (
                <div 
                  key={item.id}
                  onClick={() => {
                    setActiveClassId(item.id);
                    setActiveClass(item);
                    navigate('/dashboard');
                  }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-md ${
                    item.id === activeClass?.id 
                      ? 'border-2 border-[#1e7a34] dark:border-[#3ea556] bg-emerald-50/30 dark:bg-emerald-950/20 shadow-md' 
                      : 'border-[#ece8f3] dark:border-slate-800 bg-transparent hover:bg-slate-50/50 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-primary-light/40 dark:bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0">
                        <BookOpen size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-black text-slate-800 dark:text-white">{item.name}</h3>
                          {item.id === activeClass?.id && (
                            <span className="text-[8px] font-extrabold bg-[#1e7a34] text-white px-2 py-0.5 rounded-full uppercase tracking-wider select-none animate-pulse">
                              ● Active Workspace
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-[#CBD5E1] font-bold uppercase mt-0.5">
                          {item.courseCode || item.code} • {item.studentsCount} Students • {item.academicLevel ? `${item.academicLevel} Level` : 'Active'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right shrink-0">
                      <div>
                        <p className="text-[9px] text-slate-400 dark:text-[#94A3B8] font-bold uppercase">Department</p>
                        <p className="text-xs font-extrabold text-brand-primary mt-0.5">{item.departmentText || 'General'}</p>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleStartEditClass(item)}
                          className="p-1.5 text-slate-400 hover:text-[#1e7a34] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                          title="Edit Class Settings"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteClass(item.id, item.name)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-55/20 dark:hover:bg-red-950/20 rounded-lg transition-all cursor-pointer"
                          title="Delete Class"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Unclaimed Rep-Created Classes (Claim section) */}
        <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2rem] p-6 shadow-soft space-y-4">
          <h2 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
            <School className="text-amber-500" size={18} />
            <span>Claim Available Classes (Rep Created)</span>
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-medium leading-relaxed">
            These are academic classes defined and initialized by class representatives that currently require a faculty lecturer.
          </p>

          <div className="space-y-3">
            {loadingAvailable ? (
              <p className="text-xs text-slate-400 text-center py-4 font-semibold">Loading unclaimed classes...</p>
            ) : availableClasses.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-[#94A3B8] font-semibold text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                No unclaimed class workspaces available at this time.
              </p>
            ) : (
              availableClasses.map(cls => (
                <div key={cls.id} className="p-4 bg-amber-50/20 dark:bg-slate-900/30 border border-amber-200/50 dark:border-slate-800 rounded-2xl flex items-center justify-between transition-all hover:border-amber-400/75">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-extrabold text-amber-600 bg-amber-100 dark:bg-amber-950/40 px-1.5 py-0.5 rounded uppercase">
                        {cls.courseCode || cls.code}
                      </span>
                      <h4 className="text-xs font-extrabold text-slate-850 dark:text-slate-200">{cls.name}</h4>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-[#94A3B8] font-medium">
                      Level {cls.academicLevel || '100'} • {cls.semester || 'First'} Semester • Dept: {cls.departmentText || 'General'}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Created By Representative: {cls.createdBy}</p>
                  </div>
                  <button
                    onClick={() => handleClaimClass(cls.id, cls.name)}
                    className="px-3.5 py-1.5 bg-[#1e7a34] text-white hover:bg-[#258d3f] text-[10px] font-bold rounded-lg transition-all shadow-sm cursor-pointer whitespace-nowrap"
                  >
                    Claim Teaching
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right side Creation & Invite Forms */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2rem] p-6 shadow-soft space-y-4">
          <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
            <PlusCircle size={16} className="text-brand-primary" />
            <span>Create Class Workspace</span>
          </h3>

          <form onSubmit={handleCreateClass} className="space-y-3 pt-2">
            <input
              type="text"
              placeholder="Class Title (e.g. Intro to Logic)"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-brand-primary font-semibold dark:text-white"
            />
            <input
              type="text"
              placeholder="Join Code (e.g. CS102)"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-brand-primary font-semibold uppercase dark:text-white"
            />
            <input
              type="text"
              placeholder="Course Code (e.g. LOG102)"
              value={courseCodeVal}
              onChange={(e) => setCourseCodeVal(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-brand-primary font-semibold uppercase dark:text-white"
            />
            <input
              type="text"
              placeholder="Department Name"
              value={departmentVal}
              onChange={(e) => setDepartmentVal(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-brand-primary font-semibold dark:text-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={academicLevelVal}
                onChange={(e) => setAcademicLevelVal(e.target.value)}
                className="px-2 py-2 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-850 rounded-xl text-xs focus:outline-none focus:border-brand-primary font-semibold dark:text-slate-300"
              >
                <option value="100">100 Level</option>
                <option value="200">200 Level</option>
                <option value="300">300 Level</option>
                <option value="400">400 Level</option>
                <option value="Postgraduate">Postgraduate</option>
              </select>
              <select
                value={semesterVal}
                onChange={(e) => setSemesterVal(e.target.value)}
                className="px-2 py-2 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-850 rounded-xl text-xs focus:outline-none focus:border-brand-primary font-semibold dark:text-slate-300"
              >
                <option value="First">First Sem</option>
                <option value="Second">Second Sem</option>
                <option value="Third">Third Sem</option>
              </select>
            </div>
            <textarea
              placeholder="Short Description"
              value={classDesc}
              onChange={(e) => setClassDesc(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-brand-primary font-semibold dark:text-white h-16 resize-none"
            />
            {createError && (
              <p className="text-[10px] text-red-500 font-bold pl-1 animate-pulse">{createError}</p>
            )}
            <button type="submit" className="w-full py-2.5 bg-brand-primary text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-premium cursor-pointer">
              Create Workspace
            </button>
          </form>
        </div>

        {selectedClass && (
          <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2rem] p-6 shadow-soft space-y-4">
            <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Mail size={16} className="text-brand-primary" />
              <span>Invite Student to {selectedClass.code}</span>
            </h3>

            <form onSubmit={handleInviteStudent} className="space-y-3 pt-2">
              <input
                type="email"
                placeholder="student.email@sans.edu"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-brand-primary font-semibold dark:text-white"
              />
              {inviteError && (
                <p className="text-[10px] text-red-500 font-bold pl-1 animate-pulse">{inviteError}</p>
              )}
              <button
                type="submit"
                className="w-full py-2.5 bg-brand-primary text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-premium cursor-pointer"
              >
                Send Invite Link
              </button>
            </form>
          </div>
        )}

        {/* Bulk Actions Console */}
        <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2rem] p-6 shadow-soft space-y-4">
          <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Layers size={16} className="text-brand-primary" />
            <span>Bulk Actions Console</span>
          </h3>
          <p className="text-[10px] text-slate-405 font-bold uppercase tracking-wider leading-relaxed">Broadcast announcements, learning resources, or messages to multiple classes simultaneously.</p>

          <form onSubmit={handleBulkActionSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-[9px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-widest block">1. Select Target Classes</label>
              <div className="max-h-32 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl p-2.5 space-y-2 bg-slate-50/50 dark:bg-slate-900/10">
                {classes.length === 0 ? (
                  <p className="text-[10px] text-slate-400 text-center py-2 font-semibold">No classes created.</p>
                ) : (
                  classes.map(cls => (
                    <label key={cls.id} className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={selectedBulkClasses.includes(cls.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBulkClasses(prev => [...prev, cls.id]);
                          } else {
                            setSelectedBulkClasses(prev => prev.filter(id => id !== cls.id));
                          }
                        }}
                        className="rounded text-brand-primary focus:ring-brand-primary"
                      />
                      <span className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1] truncate">{cls.code} - {cls.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-widest block">2. Choose Action Type</label>
              <div className="bg-[#f0f7f2] dark:bg-slate-900/60 rounded-xl p-1 flex border border-slate-100 dark:border-slate-800/40">
                {(['announcement', 'resource', 'message'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setBulkActionType(type);
                      setBulkError('');
                    }}
                    className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap ${
                      bulkActionType === type ? 'bg-brand-primary text-white shadow-sm' : 'text-slate-500 hover:text-brand-primary'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {bulkActionType === 'announcement' && (
                <>
                  <input
                    type="text"
                    placeholder="Announcement Headline..."
                    value={bulkAnnTitle}
                    onChange={(e) => setBulkAnnTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-brand-primary font-semibold dark:text-white"
                  />
                  <textarea
                    placeholder="Announcement Content..."
                    value={bulkAnnContent}
                    onChange={(e) => setBulkAnnContent(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-brand-primary font-semibold dark:text-white h-20 resize-none"
                  />
                </>
              )}

              {bulkActionType === 'resource' && (
                <>
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setBulkResFile(file);
                      if (file && !bulkResTitle) {
                        setBulkResTitle(file.name.substring(0, file.name.lastIndexOf('.')) || file.name);
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#f0f7f2] file:text-brand-primary hover:file:bg-[#e2f1e5] cursor-pointer"
                  />
                  <input
                    type="text"
                    placeholder="Resource Document Title..."
                    value={bulkResTitle}
                    onChange={(e) => setBulkResTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-brand-primary font-semibold dark:text-white"
                  />
                  <select
                    value={bulkResCategory}
                    onChange={(e) => setBulkResCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-brand-primary font-semibold dark:text-white"
                  >
                    <option value="Document">📄 Document (Syllabus/Slides)</option>
                    <option value="Assignment">📝 Assignment Detail</option>
                    <option value="Reference">📚 Reference Material</option>
                  </select>
                </>
              )}

              {bulkActionType === 'message' && (
                <textarea
                  placeholder="Type message content here..."
                  value={bulkMsgContent}
                  onChange={(e) => setBulkMsgContent(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-brand-primary font-semibold dark:text-white h-24 resize-none"
                />
              )}
            </div>

            {bulkError && <p className="text-[10px] text-red-500 font-bold pl-1 animate-pulse">{bulkError}</p>}
            <button type="submit" disabled={bulkLoading} className="w-full py-2.5 bg-brand-primary text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-premium cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5">
              {bulkLoading ? 'Processing Broadcast...' : 'Execute Broadcast'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  const renderRoleClassView = () => {
    switch (user?.role) {
      case UserRole.Lecturer:
        return renderLecturerView();
      case UserRole.ClassRepresentative:
        return renderRepView();
      case UserRole.Student:
      default:
        return renderStudentView();
    }
  };

  return (
    <div className="p-8 space-y-6 h-[calc(100vh-64px)] overflow-y-auto relative bg-[#f7f6fb] dark:bg-[#0F172A] transition-colors duration-300">
      {successMsg && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-large flex items-center gap-2 animate-bounce z-100">
          <CheckCircle size={14} className="text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
          My Classes
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          Manage course schedules, class enrollment join codes, and coordinate directories.
        </p>
      </div>

      {renderRoleClassView()}

      {editingClassId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2rem] p-6 shadow-soft max-w-md w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-1.5">
              <Edit size={16} className="text-[#1e7a34]" />
              <span>Edit Class Workspace Settings</span>
            </h3>
            
            <form onSubmit={handleSaveEditClass} className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase pl-1 block mb-1">Class Title</label>
                <input
                  type="text"
                  value={editClassName}
                  onChange={(e) => setEditClassName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-[#1e7a34] font-semibold dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase pl-1 block mb-1">Workspace Code</label>
                  <input
                    type="text"
                    value={editClassCode}
                    onChange={(e) => setEditClassCode(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-[#1e7a34] font-semibold dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase pl-1 block mb-1">Course Code</label>
                  <input
                    type="text"
                    value={editCourseCode}
                    onChange={(e) => setEditCourseCode(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-[#1e7a34] font-semibold dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase pl-1 block mb-1">Academic Level</label>
                  <select
                    value={editLevel}
                    onChange={(e) => setEditLevel(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-[#1e7a34] font-semibold dark:text-white"
                  >
                    <option value="100">100 Level</option>
                    <option value="200">200 Level</option>
                    <option value="300">300 Level</option>
                    <option value="400">400 Level</option>
                    <option value="500">500 Level</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase pl-1 block mb-1">Semester</label>
                  <select
                    value={editSemester}
                    onChange={(e) => setEditSemester(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-[#1e7a34] font-semibold dark:text-white"
                  >
                    <option value="First">First Semester</option>
                    <option value="Second">Second Semester</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase pl-1 block mb-1">Department</label>
                <input
                  type="text"
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-[#1e7a34] font-semibold dark:text-white"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase pl-1 block mb-1">Description</label>
                <textarea
                  value={editClassDesc}
                  onChange={(e) => setEditClassDesc(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#ece8f3] dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-[#1e7a34] font-semibold dark:text-white resize-none"
                />
              </div>

              {editError && (
                <p className="text-[10px] text-red-500 font-bold pl-1 animate-pulse">{editError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancelEditClass}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-200 font-bold rounded-xl text-xs uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#1e7a34] text-white hover:bg-[#258d3f] font-bold rounded-xl text-xs uppercase cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyClassesPage;
