import React, { useState, useEffect } from 'react';
import { X, Mail, Phone, BookOpen, Calendar, GraduationCap } from 'lucide-react';
import api from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';

interface StudentProfileModalProps {
  studentId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({ studentId, isOpen, onClose }) => {
  const { user: currentUser } = useAuth();
  const [studentData, setStudentData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Access restriction: Only Lecturers & Admins
  const isLecturerOrAdmin = currentUser?.role === UserRole.Lecturer || currentUser?.role === UserRole.Administrator;

  useEffect(() => {
    if (isOpen && studentId && isLecturerOrAdmin) {
      fetchStudentDetails();
    }
  }, [isOpen, studentId]);

  const fetchStudentDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get(`/users/students/${studentId}`);
      setStudentData(res.data);
    } catch (err: any) {
      console.error('Failed to fetch student details:', err);
      setError(err.response?.data?.Message || 'Failed to load student profile details.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !isLecturerOrAdmin) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-6 relative overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-[#1e7a34] dark:text-emerald-400 flex items-center justify-center">
              <GraduationCap size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Student Academic Profile</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Faculty Inspection Access Only</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#1e7a34] border-t-transparent animate-spin" />
            <p className="text-xs text-slate-500 font-semibold">Fetching student records...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-xs font-bold text-rose-500">{error}</p>
            <button onClick={fetchStudentDetails} className="text-xs font-bold text-[#1e7a34] underline cursor-pointer">Retry</button>
          </div>
        ) : studentData ? (
          <div className="space-y-5">
            {/* Identity Card */}
            <div className="flex items-center gap-4 bg-slate-50/80 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40">
              <div className="w-14 h-14 rounded-full bg-[#1e7a34] text-white font-extrabold text-lg flex items-center justify-center shrink-0 shadow-md">
                {studentData.profileImageUrl ? (
                  <img src={studentData.profileImageUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span>{studentData.firstName?.[0]}{studentData.lastName?.[0]}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-black text-slate-800 dark:text-white truncate">
                  {studentData.firstName} {studentData.lastName}
                </h4>
                <p className="text-[10px] font-bold text-[#1e7a34] dark:text-emerald-400 uppercase tracking-wider mt-0.5">
                  {studentData.role === 2 ? 'Course Representative' : 'Enrolled Student'}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {studentData.indexNumber && (
                    <span className="text-[9px] font-extrabold px-2.5 py-0.5 bg-emerald-500/10 dark:bg-emerald-950/50 text-[#1e7a34] dark:text-emerald-300 rounded-full border border-emerald-500/30">
                      Index #: {studentData.indexNumber}
                    </span>
                  )}
                  <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full">
                    ID: {studentData.studentId}
                  </span>
                </div>
              </div>
            </div>

            {/* Field Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800/40 rounded-xl space-y-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Mail size={10} /> Email Address
                </span>
                <p className="font-extrabold text-slate-800 dark:text-white truncate">{studentData.email}</p>
              </div>

              <div className="p-3 bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800/40 rounded-xl space-y-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Phone size={10} /> Contact Phone
                </span>
                <p className="font-extrabold text-slate-800 dark:text-white truncate">{studentData.phoneNumber || 'Not provided'}</p>
              </div>

              <div className="p-3 bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800/40 rounded-xl space-y-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <BookOpen size={10} /> Department
                </span>
                <p className="font-extrabold text-slate-800 dark:text-white truncate">{studentData.departmentName || 'General Science'}</p>
              </div>

              <div className="p-3 bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800/40 rounded-xl space-y-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Calendar size={10} /> Registration Date
                </span>
                <p className="font-extrabold text-slate-800 dark:text-white truncate">
                  {new Date(studentData.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Enrolled Class Workspaces */}
            {studentData.enrolledClasses && studentData.enrolledClasses.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">
                  Enrolled Class Workspaces ({studentData.enrolledClasses.length})
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {studentData.enrolledClasses.map((cls: any) => (
                    <span key={cls.id} className="text-[10px] font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
                      {cls.code} • {cls.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
