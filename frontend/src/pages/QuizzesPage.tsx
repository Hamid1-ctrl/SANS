import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { 
  Beaker, 
  Plus, 
  Trash2, 
  Calendar, 
  CheckCircle2, 
  ShieldAlert, 
  ArrowRight,
  BookOpen
} from 'lucide-react';

interface Quiz {
  id: number;
  title: string;
  course: string;
  date: string;
  points: number;
  questionsCount: number;
}

const QuizzesPage: React.FC = () => {
  const { user } = useAuth();
  const [successMsg, setSuccessMsg] = useState('');

  // Strict Permission Check: Lecturer Only
  const isLecturer = user?.role === UserRole.Lecturer;

  // New Quiz state form
  const [quizzes, setQuizzes] = useState<Quiz[]>([
    { id: 1, title: 'AI Logic Planning Quiz', course: 'Artificial Intelligence', date: 'July 10, 2026', points: 20, questionsCount: 10 },
    { id: 2, title: 'Database Indexing Quiz', course: 'Database Systems', date: 'July 14, 2026', points: 15, questionsCount: 8 }
  ]);

  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizCourse, setNewQuizCourse] = useState('Artificial Intelligence');
  const [newQuizDate, setNewQuizDate] = useState('');
  const [newQuizPoints, setNewQuizPoints] = useState(10);
  
  // Questions builder state
  const [questions, setQuestions] = useState<string[]>(['']);

  const handleAddQuestionField = () => {
    setQuestions([...questions, '']);
  };

  const handleQuestionChange = (index: number, val: string) => {
    const copy = [...questions];
    copy[index] = val;
    setQuestions(copy);
  };

  const handleRemoveQuestion = (index: number) => {
    const copy = [...questions];
    copy.splice(index, 1);
    setQuestions(copy);
  };

  const handleCreateQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuizTitle.trim() || !newQuizDate) return;

    const newQuiz: Quiz = {
      id: quizzes.length + 1,
      title: newQuizTitle,
      course: newQuizCourse,
      date: newQuizDate,
      points: Number(newQuizPoints),
      questionsCount: questions.filter(q => q.trim() !== '').length || 5
    };

    setQuizzes([...quizzes, newQuiz]);
    setNewQuizTitle('');
    setNewQuizDate('');
    setQuestions(['']);
    setSuccessMsg('Success: Academic Quiz Scheduled!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  if (!isLecturer) {
    return (
      <div className="p-8 h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="w-full max-w-md bg-white dark:bg-[#191624] border border-red-200/25 rounded-[2.5rem] p-8 text-center shadow-large space-y-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-655 mx-auto">
            <ShieldAlert size={24} />
          </div>
          <h2 className="text-lg font-black text-slate-800">Access Denied</h2>
          <p className="text-xs text-slate-455 font-semibold leading-relaxed">
            You do not have administrative permission parameters to configure academic testing or quizzes. This section is strictly reserved for lecturing faculty.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 h-[calc(100vh-64px)] overflow-y-auto relative">
      
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
        
        {/* Left side Create form */}
        <div className="lg:col-span-2 bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2.5rem] p-8 shadow-soft space-y-6">
          <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
            <Beaker className="text-brand-primary" size={18} />
            <span>Create New Quiz</span>
          </h2>

          <form onSubmit={handleCreateQuiz} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Quiz Title</label>
                <input 
                  type="text" 
                  value={newQuizTitle}
                  onChange={(e) => setNewQuizTitle(e.target.value)}
                  placeholder="e.g. Logic foundations"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Associated Course</label>
                <select
                  value={newQuizCourse}
                  onChange={(e) => setNewQuizCourse(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-brand-primary cursor-pointer"
                >
                  <option>Artificial Intelligence</option>
                  <option>Database Systems</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Quiz Date</label>
                <input 
                  type="date" 
                  value={newQuizDate}
                  onChange={(e) => setNewQuizDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-brand-primary cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Max Points</label>
                <input 
                  type="number" 
                  value={newQuizPoints}
                  onChange={(e) => setNewQuizPoints(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>

            {/* Dynamic Questions Builder */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-bold text-slate-405 uppercase tracking-widest">Questionnaire items</h4>
                <button
                  type="button"
                  onClick={handleAddQuestionField}
                  className="px-3 py-1.5 bg-brand-primary-light text-brand-primary rounded-xl text-[10px] font-extrabold uppercase flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={11} />
                  <span>Add Question</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {questions.map((question, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-bold w-6">{idx + 1}.</span>
                    <input 
                      type="text"
                      value={question}
                      onChange={(e) => handleQuestionChange(idx, e.target.value)}
                      placeholder="Enter question prompt..."
                      className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-primary"
                    />
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(idx)}
                        className="p-2 text-slate-400 hover:text-red-500 rounded-xl cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
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

        {/* Right side active list */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#191624] border border-[#ece8f3] dark:border-slate-800/40 rounded-[2.5rem] p-6 shadow-soft space-y-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <BookOpen size={16} className="text-brand-primary" />
              <span>Active Quizzes</span>
            </h3>

            <div className="space-y-3.5 pt-2">
              {quizzes.map(item => (
                <div key={item.id} className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[8px] font-extrabold text-brand-primary bg-brand-primary-light px-2 py-0.5 rounded uppercase">
                        {item.course}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-slate-805 text-xs mt-2">{item.title}</h4>
                  </div>
                  <div className="border-t border-slate-100 pt-3 mt-3 flex items-center justify-between text-[9px] text-slate-400 font-bold">
                    <span>{item.questionsCount} Questions • {item.points} pts</span>
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />
                      <span>{item.date}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default QuizzesPage;
