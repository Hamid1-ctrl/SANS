import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useQuizzes, useCreateQuiz, useDeleteQuiz } from '../hooks/useQuizzes';
import { UserRole } from '../types';
import { 
  Beaker, 
  Trash2, 
  Calendar, 
  CheckCircle2, 
  Plus,
  BookOpen,
  Search,
  Award,
  Clock,
  Sparkles,
  X,
  Zap,
  ArrowRight
} from 'lucide-react';

const QuizzesPage: React.FC = () => {
  const { user } = useAuth();
  const { classes, activeClass } = useWorkspace();
  const { data: quizzes = [], isLoading } = useQuizzes(activeClass?.id);
  const createQuiz = useCreateQuiz();
  const deleteQuiz = useDeleteQuiz();

  const [successMsg, setSuccessMsg] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'today'>('all');

  // Form State for Lecturer Quiz Scheduling
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizClassId, setNewQuizClassId] = useState(activeClass?.id || '');
  const [newQuizDate, setNewQuizDate] = useState('');
  const [newQuizPoints, setNewQuizPoints] = useState(10);
  const [newQuestionsCount, setNewQuestionsCount] = useState(5);

  const isLecturer = user?.role === UserRole.Lecturer || user?.role === UserRole.Administrator;

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetClassId = newQuizClassId || activeClass?.id || (classes.length > 0 ? classes[0].id : '');
    if (!newQuizTitle.trim() || !newQuizDate || !targetClassId) return;

    try {
      await createQuiz.mutateAsync({
        title: newQuizTitle,
        date: newQuizDate,
        points: Number(newQuizPoints),
        questionsCount: Number(newQuestionsCount),
        classWorkspaceId: targetClassId === 'global' ? '00000000-0000-0000-0000-000000000000' : targetClassId
      });

      setNewQuizTitle('');
      setNewQuizDate('');
      setIsModalOpen(false);
      setSuccessMsg('Success: Academic Quiz Scheduled!');
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this scheduled quiz?')) return;
    try {
      await deleteQuiz.mutateAsync(id);
      setSuccessMsg('Success: Quiz deleted successfully!');
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      console.error(err);
    }
  };

  // Stats Calculations
  const totalPoints = useMemo(() => quizzes.reduce((sum, q) => sum + (q.points || 0), 0), [quizzes]);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const todayQuizzesCount = useMemo(() => quizzes.filter(q => q.date && q.date.startsWith(todayStr)).length, [quizzes, todayStr]);

  // Filtered Quizzes
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter(q => {
      const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            q.course.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (activeTab === 'today') {
        return q.date && q.date.startsWith(todayStr);
      }
      return true;
    });
  }, [quizzes, searchQuery, activeTab, todayStr]);

  return (
    <div className="p-8 space-y-6 h-[calc(100vh-64px)] overflow-y-auto relative bg-[#f7f6fb] dark:bg-[#0F172A] transition-colors duration-300">
      
      {/* Toast Feedback Notification */}
      {successMsg && (
        <div className="fixed top-8 right-8 z-[999999] bg-[#1e7a34] text-white px-6 py-4 rounded-2xl text-xs font-black shadow-2xl flex items-center gap-3 border-2 border-emerald-300 ring-4 ring-[#1e7a34]/30 animate-bounce">
          <CheckCircle2 size={18} className="text-emerald-200 shrink-0" />
          <span className="tracking-wide text-sm">{successMsg}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
              Quizzes & Assessment Center
            </h1>
            <span className="px-2.5 py-0.5 bg-emerald-500/10 dark:bg-emerald-950/50 text-[#1e7a34] dark:text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">
              {activeClass ? activeClass.code : 'Official'}
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            Access active questionnaires, monitor points weight, and track scheduled academic assessments for {activeClass ? activeClass.name : 'your workspace'}.
          </p>
        </div>

        {isLecturer && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-[#1e7a34] text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-lg shadow-[#1e7a34]/25 hover:bg-[#1e7a34]/90 active:scale-[0.98] transition-all cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span>Schedule New Quiz</span>
          </button>
        )}
      </div>

      {/* Modern Dashboard Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800/60 rounded-3xl p-5 shadow-soft flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Quizzes</span>
            <p className="text-2xl font-black text-slate-800 dark:text-white">{quizzes.length}</p>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
            <Beaker size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800/60 rounded-3xl p-5 shadow-soft flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Assessment Weight</span>
            <p className="text-2xl font-black text-slate-800 dark:text-white">{totalPoints} <span className="text-xs font-semibold text-slate-400">pts</span></p>
          </div>
          <div className="w-12 h-12 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center">
            <Award size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800/60 rounded-3xl p-5 shadow-soft flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Due Today</span>
            <p className="text-2xl font-black text-slate-800 dark:text-white">{todayQuizzesCount}</p>
          </div>
          <div className="w-12 h-12 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
            <Clock size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800/60 rounded-3xl p-5 shadow-soft flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">System Space Policy</span>
            <p className="text-xs font-extrabold text-[#1e7a34] dark:text-[#3ea556] flex items-center gap-1 mt-1">
              <Sparkles size={12} /> Auto-Cleanup Active
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 dark:bg-emerald-950/50 text-[#1e7a34] dark:text-emerald-400 rounded-2xl flex items-center justify-center">
            <Zap size={22} />
          </div>
        </div>
      </div>

      {/* Action, Filter & Search Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-[#1E293B] border border-[#ece8f3] dark:border-slate-800/80 rounded-2xl p-4 shadow-soft">
        
        {/* Filter Pills */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'all' 
                ? 'bg-white dark:bg-[#1E293B] text-[#1e7a34] dark:text-[#3ea556] shadow-xs font-extrabold' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            All Quizzes ({quizzes.length})
          </button>
          <button
            onClick={() => setActiveTab('today')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'today' 
                ? 'bg-white dark:bg-[#1E293B] text-[#1e7a34] dark:text-[#3ea556] shadow-xs font-extrabold' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Due Today ({todayQuizzesCount})
          </button>
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search quizzes or courses..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#1e7a34]"
          />
        </div>
      </div>

      {/* Main Assessment Cards Deck */}
      {isLoading ? (
        <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800/40 rounded-3xl p-12 text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[#1e7a34] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Loading academic quizzes...</p>
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800/40 rounded-3xl p-12 text-center space-y-4 shadow-soft">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <BookOpen size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-white">No Active Quizzes Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto">
              There are no active scheduled quizzes matching your criteria for this class workspace.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuizzes.map(item => {
            const isDueToday = item.date && item.date.startsWith(todayStr);
            const dateDisplay = item.date ? new Date(item.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Scheduled';

            return (
              <div 
                key={item.id} 
                className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800/60 rounded-[2rem] p-6 shadow-soft hover:shadow-medium transition-all flex flex-col justify-between relative group"
              >
                <div className="space-y-4">
                  {/* Top Bar Badges */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#1e7a34] dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-500/20">
                      {item.course}
                    </span>

                    <div className="flex items-center gap-2">
                      {isDueToday && (
                        <span className="text-[9px] font-black uppercase px-2.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-full flex items-center gap-1">
                          <Clock size={10} /> Due Today
                        </span>
                      )}
                      {isLecturer && (
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                          title="Delete Scheduled Quiz"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-white leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                      Official course assessment questionnaire.
                    </p>
                  </div>

                  {/* Assessment Info Tags */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/40">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Questions</span>
                      <span className="font-extrabold text-slate-800 dark:text-white">{item.questionsCount} Items</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/40">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Max Points</span>
                      <span className="font-extrabold text-[#1e7a34] dark:text-emerald-300">{item.points} Points</span>
                    </div>
                  </div>
                </div>

                {/* Footer Bar */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
                    <Calendar size={13} className="text-[#1e7a34]" />
                    <span>{dateDisplay}</span>
                  </div>

                  <button 
                    onClick={() => alert(`Assessment Overview for ${item.title}:\n\nTotal Questions: ${item.questionsCount}\nMax Points: ${item.points}\nDate: ${dateDisplay}\n\nPlease follow your lecturer's instructions.`)}
                    className="flex items-center gap-1 text-xs font-bold text-[#1e7a34] dark:text-emerald-300 hover:underline cursor-pointer"
                  >
                    <span>View Info</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LECTURER MODAL: SCHEDULE NEW QUIZ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 text-[#1e7a34] dark:text-emerald-300 flex items-center justify-center">
                  <Beaker size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Schedule New Quiz Test</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Publish a new questionnaire for your enrolled students.</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateQuiz} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Quiz Title</label>
                <input
                  type="text"
                  required
                  value={newQuizTitle}
                  onChange={(e) => setNewQuizTitle(e.target.value)}
                  placeholder="e.g. Mid-Semester Logic Assessment"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:outline-none focus:border-[#1e7a34]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Target Class Workspace</label>
                <select
                  value={newQuizClassId}
                  onChange={(e) => setNewQuizClassId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold focus:outline-none focus:border-[#1e7a34] cursor-pointer"
                >
                  <option value="">Select a class...</option>
                  <option value="global" className="font-bold text-[#1e7a34]">University Hub (Global)</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.code} - {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Quiz Date</label>
                  <input
                    type="date"
                    required
                    value={newQuizDate}
                    onChange={(e) => setNewQuizDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold focus:outline-none focus:border-[#1e7a34] cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Max Points</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newQuizPoints}
                    onChange={(e) => setNewQuizPoints(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold focus:outline-none focus:border-[#1e7a34]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Questions</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newQuestionsCount}
                    onChange={(e) => setNewQuestionsCount(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold focus:outline-none focus:border-[#1e7a34]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createQuiz.isPending}
                  className="px-5 py-2 bg-[#1e7a34] text-white rounded-xl font-bold shadow-md hover:bg-[#1e7a34]/90 cursor-pointer"
                >
                  {createQuiz.isPending ? 'Scheduling...' : 'Schedule Quiz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default QuizzesPage;
