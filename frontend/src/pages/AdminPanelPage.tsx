import React, { useState, useEffect } from 'react';
import { Shield, Check, X, AlertTriangle, RefreshCw, Search, CheckCircle2 } from 'lucide-react';
import api from '../lib/axios';

interface LecturerUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  studentId: string; // Used as Staff ID for Lecturers
  officeNumber?: string;
  officeHours?: string;
  specialization?: string;
  role: number;
  status: number;
  createdAt: string;
}

const statusStyles: Record<number, { text: string; bg: string; border: string; label: string }> = {
  0: { text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-900/40', label: 'Pending' },
  1: { text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-900/40', label: 'Verified' },
  2: { text: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-900/40', label: 'Rejected' },
  3: { text: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-200 dark:border-rose-900/40', label: 'Suspended' }
};

const AdminPanelPage: React.FC = () => {
  const [lecturers, setLecturers] = useState<LecturerUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [actionError, setActionError] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');

  const fetchLecturers = async () => {
    setIsLoading(true);
    setActionError('');
    try {
      const endpoint = activeTab === 'pending' ? '/users/lecturers/pending' : '/users/lecturers';
      const response = await api.get<LecturerUser[]>(endpoint);
      setLecturers(response.data);
    } catch (err: any) {
      console.error('Failed to load lecturers:', err);
      setActionError('Failed to fetch lecturer accounts list.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLecturers();
  }, [activeTab]);

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'suspend' | 'unsuspend') => {
    try {
      setActionError('');
      const response = await api.post<{ message: string; status: number }>(`/users/${id}/${action}`);
      setSuccessMsg(response.data.message);
      setTimeout(() => setSuccessMsg(''), 4000);
      
      // Update local state state to reflect changes immediately
      setLecturers(prev => prev.map(u => u.id === id ? { ...u, status: response.data.status } : u));
      
      // If we are in the pending tab and updated status to non-pending, remove from list
      if (activeTab === 'pending' && response.data.status !== 0) {
        setLecturers(prev => prev.filter(u => u.id !== id));
      }
    } catch (err: any) {
      console.error(`Failed to execute action ${action}:`, err);
      setActionError(err.response?.data?.message ?? `Failed to perform action: ${action}`);
    }
  };

  const filteredLecturers = lecturers.filter(u => {
    const term = searchQuery.toLowerCase();
    return (
      u.firstName.toLowerCase().includes(term) ||
      u.lastName.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.studentId.toLowerCase().includes(term)
    );
  });

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
          <h1 className="text-3xl font-extrabold text-slate-805 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Shield className="text-brand-primary" size={28} />
            <span>SANS Administration Panel</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-xs md:text-sm">
            Approve new Lecturer requests, manage credentials, and audit academic roles.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1E293B] border border-slate-105 dark:border-slate-800/40 rounded-[2.5rem] shadow-soft overflow-hidden">
        
        {/* Controls Bar */}
        <div className="p-6 border-b border-slate-105 dark:border-slate-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl w-fit">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'all' 
                  ? 'bg-white dark:bg-[#1E293B] text-slate-800 dark:text-white shadow-sm' 
                  : 'text-slate-550 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              All Lecturers
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'pending' 
                  ? 'bg-white dark:bg-[#1E293B] text-slate-800 dark:text-white shadow-sm' 
                  : 'text-slate-550 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Pending Approval ({lecturers.filter(u => u.status === 0).length})
            </button>
          </div>

          {/* Search and Action error */}
          <div className="flex items-center gap-3 w-full md:w-80">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search staff..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/40 rounded-xl text-[11px] font-semibold focus:outline-none text-slate-800 dark:text-white"
              />
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            </div>
            <button 
              onClick={fetchLecturers} 
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/40 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {actionError && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/15 text-red-600 rounded-xl text-xs font-semibold text-center">
            {actionError}
          </div>
        )}

        {/* Lecturers Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-20 text-center text-xs text-slate-400 font-semibold">
              Loading accounts data...
            </div>
          ) : filteredLecturers.length === 0 ? (
            <div className="py-20 text-center text-xs text-slate-400 font-semibold">
              {searchQuery ? 'No accounts matched your search.' : 'No lecturer accounts found.'}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/30 text-[9px] font-bold text-slate-400 uppercase border-b border-slate-105 dark:border-slate-800/20">
                  <th className="px-6 py-4">Staff details</th>
                  <th className="px-6 py-4">Identification</th>
                  <th className="px-6 py-4">Office & Hours</th>
                  <th className="px-6 py-4">Specialization</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-105 dark:divide-slate-800/20">
                {filteredLecturers.map(lect => {
                  const style = statusStyles[lect.status] || statusStyles[0];
                  return (
                    <tr key={lect.id} className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                      <td className="px-6 py-4 space-y-0.5">
                        <div className="font-extrabold text-slate-800 dark:text-white">{lect.firstName} {lect.lastName}</div>
                        <div className="text-[9px] text-slate-400">{lect.email}</div>
                        <div className="text-[9px] text-slate-400">{lect.phoneNumber}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px]">
                          {lect.studentId}
                        </span>
                      </td>
                      <td className="px-6 py-4 space-y-0.5">
                        <div>Room: {lect.officeNumber || 'N/A'}</div>
                        <div className="text-[9px] text-slate-400">{lect.officeHours || 'No office hours provided'}</div>
                      </td>
                      <td className="px-6 py-4 max-w-[150px] truncate" title={lect.specialization}>
                        {lect.specialization || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 border rounded text-[9px] font-bold ${style.bg} ${style.text} ${style.border}`}>
                          {style.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {/* Approve Action */}
                          {lect.status !== 1 && (
                            <button
                              onClick={() => handleAction(lect.id, 'approve')}
                              title="Approve lecturer account"
                              className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center justify-center cursor-pointer transition-all"
                            >
                              <Check size={12} />
                            </button>
                          )}
                          
                          {/* Reject Action (only for pending) */}
                          {lect.status === 0 && (
                            <button
                              onClick={() => handleAction(lect.id, 'reject')}
                              title="Reject lecturer request"
                              className="w-7 h-7 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 hover:bg-red-500 hover:text-white flex items-center justify-center cursor-pointer transition-all"
                            >
                              <X size={12} />
                            </button>
                          )}

                          {/* Suspend Action (for verified) */}
                          {lect.status === 1 && (
                            <button
                              onClick={() => handleAction(lect.id, 'suspend')}
                              title="Suspend lecturer account"
                              className="w-7 h-7 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 hover:bg-rose-500 hover:text-white flex items-center justify-center cursor-pointer transition-all"
                            >
                              <AlertTriangle size={12} />
                            </button>
                          )}

                          {/* Unsuspend Action (for suspended) */}
                          {lect.status === 3 && (
                            <button
                              onClick={() => handleAction(lect.id, 'unsuspend')}
                              title="Lift lecturer suspension"
                              className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center justify-center cursor-pointer transition-all"
                            >
                              <RefreshCw size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanelPage;
