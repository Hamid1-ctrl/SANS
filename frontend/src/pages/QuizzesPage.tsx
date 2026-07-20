import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useQuizzes, useCreateQuiz, useDeleteQuiz } from '../hooks/useQuizzes';
import { UserRole } from '../types';
import { 
  Beaker, 
  Trash2, 
  Calendar, 
  CheckCircle2, 
  ArrowRight,
  BookOpen
} from 'lucide-react';

const QuizzesPage: React.FC = () => {
  const { user } = useAuth();
  const { classes, activeClass } = useWorkspace();
  const { data: quizzes, isLoading } = useQuizzes(activeClass?.id);
  const createQuiz = useCreateQuiz();
  const deleteQuiz = useDeleteQuiz();

  const [successMsg, setSuccessMsg] = useState('');
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizClassId, setNewQuizClassId] = useState(activeClass?.id || '');
  const [newQuizDate, setNewQuizDate] = useState('');
  const [newQuizPoints, setNewQuizPoints] = useState(10);

  const isLecturer = user?.role === UserRole.Lecturer;

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetClassId = newQuizClassId || activeClass?.id || (classes.length > 0 ? classes[0].id : '');
    if (!newQuizTitle.trim() || !newQuizDate || !targetClassId) return;

    try {
      await createQuiz.mutateAsync({
        title: newQuizTitle,
        date: newQuizDate,
        points: Number(newQuizPoints),
        questionsCount: 5,
        classWorkspaceId: targetClassId === 'global' ? '00000000-0000-0000-0000-000000000000' : targetClassId
      });

      setNewQuizTitle('');
      setNewQuizDate('');
      setSuccessMsg('Success: Academic Quiz Scheduled!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteQuiz.mutateAsync(id);
      setSuccessMsg('Success: Quiz deleted successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 space-y-6 h-[calc(100vh-64px)] overflow-y-auto relative bg-[#f7f6fb] dark:bg-[#0F172A] transition-colors duration-300">
      
      {/* Toast Feedback */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-large flex items-center gap-2 animate-bounce z-100">
          <CheckCircle2 size={14} className="text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
          Quizzes Manager
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          Create, schedule, and review academic test questionnaires for your enrolled courses.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left side Create form - Lecturer Only */}
        {isLecturer ? (
          <div className="lg:col-span-2 bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2.5rem] p-8 shadow-soft space-y-6">
            <h2 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Beaker className="text-brand-primary" size={18} />
              <span>Create New Quiz</span>
            </h2>

            <form onSubmit={handleCreateQuiz} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Quiz Title</label>
                  <input 
                    type="text" 
                    value={newQuizTitle}
                    onChange={(e) => setNewQuizTitle(e.target.value)}
                    placeholder="e.g. Logic foundations"
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-[#CBD5E1] border border-slate-200 dark:border-slate-800/40 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Target Class</label>
                  <select
                    value={newQuizClassId}
                    onChange={(e) => setNewQuizClassId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-[#CBD5E1] border border-slate-200 dark:border-slate-800/40 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-primary cursor-pointer"
                  >
                    <option value="">Select a class...</option>
                    <option value="global" className="dark:bg-[#1F2937] font-bold text-[#1e7a34]">University Hub (Global)</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id} className="dark:bg-[#1F2937]">
                        {cls.code} - {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Quiz Date</label>
                  <input 
                    type="date" 
                    value={newQuizDate}
                    onChange={(e) => setNewQuizDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-[#CBD5E1] border border-slate-200 dark:border-slate-800/40 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-primary cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Max Points</label>
                  <input 
                    type="number" 
                    value={newQuizPoints}
                    onChange={(e) => setNewQuizPoints(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-[#CBD5E1] border border-slate-200 dark:border-slate-800/40 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-brand-primary text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-premium flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all"
              >
                <span>Schedule Quiz Test</span>
                <ArrowRight size={14} />
              </button>
            </form>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2.5rem] p-8 shadow-soft space-y-4">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/40 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2">
              <Beaker size={24} />
            </div>
            <h2 className="text-lg font-black text-slate-800 dark:text-white">Active Class Assessment Board</h2>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-semibold leading-relaxed">
              Review and participate in questionnaires assigned directly by your lecturing faculty. Be sure to check the timers, points weight, and due dates before starting.
            </p>
          </div>
        )}

        {/* Right side active list */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2.5rem] p-6 shadow-soft space-y-4">
            <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
              <BookOpen size={16} className="text-brand-primary" />
              <span>Active Quizzes</span>
            </h3>

            <div className="space-y-3.5 pt-2">
              {isLoading ? (
                <p className="text-xs font-semibold text-slate-400 dark:text-[#94A3B8] text-center py-4">Loading quizzes...</p>
              ) : quizzes?.length === 0 ? (
                <p className="text-xs font-semibold text-slate-400 dark:text-[#94A3B8] text-center py-4">No active quizzes scheduled.</p>
              ) : (
                quizzes?.map(item => (
                  <div key={item.id} className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/40 rounded-2xl flex flex-col justify-between shadow-sm relative group">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-[8px] font-extrabold text-brand-primary bg-brand-primary-light/40 dark:bg-brand-primary/10 px-2 py-0.5 rounded uppercase">
                          {item.course}
                        </span>
                        {isLecturer && (
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-slate-400 hover:text-red-505 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Delete Quiz"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                      <h4 className="font-extrabold text-slate-805 dark:text-white text-xs mt-2">{item.title}</h4>
                    </div>
                    <div className="border-t border-slate-100 dark:border-slate-800/40 pt-3 mt-3 flex items-center justify-between text-[9px] text-slate-400 dark:text-[#94A3B8] font-bold">
                      <span>{item.questionsCount} Questions • {item.points} pts</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        <span>{new Date(item.date).toLocaleDateString()}</span>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default QuizzesPage;
