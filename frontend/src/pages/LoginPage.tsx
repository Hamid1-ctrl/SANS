import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { LoginRequest } from '../types';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginRequest) => {
    setLoginError(null);
    try {
      await login(data);
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login failed:', error);
      setLoginError(error?.message || 'Login failed. Please verify your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-brand-green dark:bg-[#113a1a] flex items-center justify-center p-6 relative font-sans transition-colors duration-300">
      
      {/* Outer Card with Tablet framing and premium glass lifting ring */}
      <div className="w-full max-w-5xl bg-white dark:bg-[#191624] border border-white/20 dark:border-slate-800/40 rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] ring-[12px] ring-white/10 dark:ring-white/5 overflow-hidden flex flex-col md:flex-row min-h-[620px]">
        
        {/* Left Side: Custom Lottie Player Panel */}
        <div className="w-full md:w-1/2 bg-[#f3f0f7] dark:bg-[#151221] p-12 flex flex-col justify-between items-center relative overflow-hidden shrink-0 select-none">
          
          <div className="absolute top-10 left-10 w-48 h-48 rounded-full bg-brand-green/5 blur-3xl"></div>
          
          {/* SANS Brand Logo */}
          <div className="self-start flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-brand-green text-white flex items-center justify-center font-black text-xs shadow-sm">
              S
            </div>
            <span className="text-slate-850 dark:text-white font-extrabold text-sm tracking-tight">SANS</span>
          </div>

          {/* Lottie Animation Player loaded from Public assets folder */}
          <div className="w-full flex items-center justify-center min-h-[280px]">
            <div dangerouslySetInnerHTML={{ __html: '<lottie-player src="/Email motion loading.json" background="transparent" speed="1" loop autoplay style="width: 280px; height: 280px;"></lottie-player>' }} />
          </div>

          {/* Left panel caption details */}
          <div className="text-center">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
              A Cleaner Academic Workspace
            </h3>
            <p className="text-[11px] text-slate-455 dark:text-slate-400 font-bold mt-1.5 max-w-[240px] leading-relaxed">
              Consolidate schedules, review lecture items, and manage alerts without AI clutter.
            </p>
          </div>
        </div>

        {/* Right Side: Form Sign In Panel */}
        <div className="flex-1 p-12 flex flex-col justify-between">
          <div className="self-end text-xs font-bold text-slate-450">
            Smart Portal 2.0
          </div>

          <div className="max-w-sm w-full mx-auto space-y-6 my-auto">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                Sign in
              </h2>
              <p className="text-xs text-slate-455 font-bold uppercase tracking-wider">
                Enter your academic credentials
              </p>
            </div>

            {loginError && (
              <div className="p-3 bg-red-500/10 border border-red-500/15 text-red-600 rounded-xl text-xs font-semibold text-center leading-relaxed animate-fade-in">
                {loginError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email Address */}
              <div className="space-y-1">
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#fbfbfe] dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-green/30 focus:bg-white dark:focus:bg-slate-900 transition-all font-semibold shadow-sm"
                  placeholder="Email address"
                />
                {errors.email && (
                  <p className="text-[10px] font-bold text-red-500 mt-1 pl-1">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1">
                <input
                  id="password"
                  type="password"
                  {...register('password')}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#fbfbfe] dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-green/30 focus:bg-white dark:focus:bg-slate-900 transition-all font-semibold shadow-sm"
                  placeholder="Password"
                />
                {errors.password && (
                  <p className="text-[10px] font-bold text-red-500 mt-1 pl-1">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-brand-green hover:bg-brand-green/95 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-premium hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer select-none"
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Social Logins block */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-405">
                  or sign in with
                </span>
                <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1" />
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-[#fbfbfe] dark:hover:bg-slate-900 text-slate-655 flex items-center justify-center gap-2.5 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <img src="/icons8-google.svg" alt="Google" className="w-4 h-4 shrink-0" />
                  <span>Google Account</span>
                </button>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-slate-450 font-semibold pt-4">
            New to SANS?{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-brand-green font-bold hover:underline"
            >
              Create Account
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
