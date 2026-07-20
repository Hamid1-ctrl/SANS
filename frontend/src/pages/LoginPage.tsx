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
  const { login, loginWithGoogle } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoginError(null);
    setIsGoogleLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result.isNewUser) {
        // Redirect to register with state parameters pre-populated
        navigate('/register', { 
          state: { 
            isGoogleSignUp: true,
            email: result.email,
            firstName: result.firstName,
            lastName: result.lastName,
            firebaseUid: result.firebaseUid
          } 
        });
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Google Sign-In failed:', error);
      setLoginError(error?.message || 'Google Sign-In failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };


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
      setLoginError(error?.response?.data?.detail || error?.response?.data?.message || error?.message || 'Login failed. Please verify your credentials.');
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-6 relative font-sans transition-colors duration-300"
      style={{
        backgroundImage: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.88)), url("/sans_landing_background.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      
      {/* Outer Card with Tablet framing and premium glass lifting ring */}
      <div className="w-full max-w-5xl bg-white border border-slate-150 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.12),0_10px_30px_rgba(30,122,52,0.08)] ring-[12px] ring-slate-100/50 overflow-hidden flex flex-col md:flex-row min-h-[620px] relative z-10">
        
        {/* Left Side: Custom Lottie Player Panel */}
        <div className="w-full md:w-1/2 bg-[#1E293B] p-12 flex flex-col justify-between items-center relative overflow-hidden shrink-0 select-none">
          
          <div className="absolute top-10 left-10 w-48 h-48 rounded-full bg-brand-green/5 blur-3xl"></div>
          
          {/* SANS Brand Logo */}
          <div className="self-start flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-brand-green text-white flex items-center justify-center font-black text-xs shadow-sm">
              S
            </div>
            <span className="text-[#F8FAFC] font-extrabold text-sm tracking-tight">SANS</span>
          </div>

          {/* Lottie Animation Player loaded from Public assets folder */}
          <div className="w-full flex items-center justify-center min-h-[280px]">
            <div dangerouslySetInnerHTML={{ __html: '<lottie-player src="/Email motion loading.json" background="transparent" speed="1" loop autoplay style="width: 280px; height: 280px;"></lottie-player>' }} />
          </div>

          {/* Left panel caption details */}
          <div className="text-center">
            <h3 className="text-sm font-extrabold text-[#F8FAFC] uppercase tracking-wider">
              Official SANS Portal
            </h3>
            <p className="text-[11px] text-[#CBD5E1] font-bold mt-1.5 max-w-[240px] leading-relaxed">
              SANS helps you coordinate timetables, announcements, and course tasks seamlessly.
            </p>
          </div>
        </div>

        {/* Right Side: Form Sign In Panel */}
        <div className="flex-1 p-12 flex flex-col justify-between bg-white">
          <div className="self-end text-xs font-bold text-slate-450">
            Smart Portal
          </div>

          {/* ─── STEP: Normal Credentials Login ─── */}
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
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450">
                  or sign in with
                </span>
                <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1" />
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isGoogleLoading}
                  className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-[#fbfbfe] dark:hover:bg-slate-900 text-slate-655 flex items-center justify-center gap-2.5 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-60"
                >
                  <img src="/icons8-google.svg" alt="Google" className="w-4 h-4 shrink-0" />
                  <span>{isGoogleLoading ? 'Connecting to Google...' : 'Google Account'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-slate-450 font-semibold pt-4">
            New to SANS?{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-brand-green font-bold hover:underline cursor-pointer"
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
