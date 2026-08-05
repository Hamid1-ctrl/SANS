import React, { useState, useEffect } from 'react';
import { X, Search, GraduationCap, ChevronRight } from 'lucide-react';
import api from '../../lib/axios';

interface ClassRosterModalProps {
  classWorkspaceId: string | null;
  classWorkspaceName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectStudent: (studentId: string) => void;
}

export const ClassRosterModal: React.FC<ClassRosterModalProps> = ({
  classWorkspaceId,
  classWorkspaceName,
  isOpen,
  onClose,
  onSelectStudent,
}) => {
  const [members, setMembers] = useState<{ lecturer: any; students: any[] }>({ lecturer: null, students: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && classWorkspaceId) {
      fetchClassRoster();
    }
  }, [isOpen, classWorkspaceId]);

  const fetchClassRoster = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get(`/classworkspaces/${classWorkspaceId}/members`);
      setMembers(res.data);
    } catch (err: any) {
      console.error('Failed to load class roster:', err);
      setError(err.response?.data?.Message || 'Failed to load enrolled students list.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredStudents = members.students.filter(student => {
    const q = searchQuery.toLowerCase();
    return (
      student.name?.toLowerCase().includes(q) ||
      student.email?.toLowerCase().includes(q) ||
      student.studentId?.toLowerCase().includes(q) ||
      student.indexNumber?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-[9998] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-5 relative overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-[#1e7a34] dark:text-emerald-400 flex items-center justify-center font-bold">
              <GraduationCap size={22} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Enrolled Class Roster</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                {classWorkspaceName || 'Class Workspace'} • {members.students?.length || 0} Students Enrolled
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="relative shrink-0">
          <input
            type="text"
            placeholder="Search students by name, Student ID, Index #, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 text-xs font-medium rounded-xl text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#1e7a34]"
          />
          <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
        </div>

        {/* Modal Body / Table */}
        <div className="flex-1 overflow-y-auto min-h-[250px] space-y-3 pr-1">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-[#1e7a34] border-t-transparent animate-spin" />
              <p className="text-xs text-slate-500 font-semibold">Loading class roster...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-xs font-bold text-rose-500">{error}</p>
              <button onClick={fetchClassRoster} className="text-xs font-bold text-[#1e7a34] underline cursor-pointer">Retry</button>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 font-semibold">
              {searchQuery ? 'No student records match your query.' : 'No students are enrolled in this class workspace.'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map(student => (
                <div
                  key={student.id}
                  className="p-3.5 bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/40 rounded-2xl flex items-center justify-between gap-3 hover:border-emerald-500/30 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#1e7a34] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {student.name?.[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-slate-800 dark:text-white truncate">{student.name}</h4>
                        {student.isClassRepresentative && (
                          <span className="text-[8px] font-bold px-2 py-0.2 bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded-md">
                            ★ Course Rep
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[9px] text-slate-400 font-semibold mt-0.5">
                        <span>ID: {student.studentId}</span>
                        {student.indexNumber && <span>Index #: {student.indexNumber}</span>}
                        <span className="truncate hidden sm:inline">{student.email}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onSelectStudent(student.id);
                    }}
                    className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-[#1e7a34] dark:text-emerald-300 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer shrink-0 flex items-center gap-1 border border-emerald-500/20"
                  >
                    <span>View Profile</span>
                    <ChevronRight size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between shrink-0">
          <span className="text-[10px] text-slate-400 font-bold">Showing {filteredStudents.length} of {members.students?.length || 0} students</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-all cursor-pointer"
          >
            Close Directory
          </button>
        </div>

      </div>
    </div>
  );
};
