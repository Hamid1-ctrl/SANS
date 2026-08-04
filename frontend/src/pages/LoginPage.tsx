import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { LoginRequest } from '../types';
import { Eye, EyeOff, X, CheckCircle } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, loginWithGoogle, resetPassword } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoginError(null);
    setIsGoogleLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result.isNewUser) {
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
      if (error?.code === 'auth/unauthorized-domain' || error?.message?.includes('unauthorized-domain')) {
        setLoginError(`Firebase Auth Restriction: Please add "${window.location.hostname}" to Firebase Console -> Authentication -> Settings -> Authorized Domains.`);
      } else {
        setLoginError(error?.message || 'Google Sign-In failed. Please try again.');
      }
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

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetError(null);
    setIsResetting(true);
    try {
      await resetPassword(resetEmail.trim());
      setResetSuccessMsg(`Password reset link sent to ${resetEmail.trim()}! Please check your inbox or spam folder.`);
    } catch (err: any) {
      console.error('Password reset failed:', err);
      setResetError(err?.message || 'Failed to send password reset email. Please verify the email address.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative font-sans transition-colors duration-300"
      style={{
        backgroundImage: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.88)), url("/sans_landing_background.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      
      {/* Outer Card with Tablet framing and mobile stacking */}
      <div className="w-full max-w-5xl bg-white border border-slate-150 rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.12),0_10px_30px_rgba(30,122,52,0.08)] ring-[8px] sm:ring-[12px] ring-slate-100/50 overflow-hidden flex flex-col md:flex-row min-h-[580px] relative z-10">
        
        {/* Left Side: Graphic Lottie Panel */}
        <div className="w-full md:w-1/2 bg-[#1E293B] p-6 sm:p-10 md:p-12 flex flex-col justify-between items-center relative overflow-hidden shrink-0 select-none">
          <div className="absolute top-10 left-10 w-48 h-48 rounded-full bg-brand-green/5 blur-3xl"></div>
          
          {/* SANS Brand Logo */}
          <div className="self-start flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-brand-green text-white flex items-center justify-center font-black text-xs shadow-sm">
              S
            </div>
            <span className="text-[#F8FAFC] font-extrabold text-sm tracking-tight">SANS</span>
          </div>

          {/* Lottie Animation Player */}
          <div className="w-full flex items-center justify-center py-4 md:py-0 min-h-[160px] md:min-h-[280px]">
            <div dangerouslySetInnerHTML={{ __html: '<lottie-player src="/Email motion loading.json" background="transparent" speed="1" loop autoplay style="width: 200px; height: 200px;"></lottie-player>' }} />
          </div>

          {/* Left panel caption details */}
          <div className="text-center hidden sm:block">
            <h3 className="text-sm font-extrabold text-[#F8FAFC] uppercase tracking-wider">
              Official SANS Portal
            </h3>
            <p className="text-[11px] text-[#CBD5E1] font-bold mt-1.5 max-w-[240px] leading-relaxed">
              SANS helps you coordinate timetables, announcements, and course tasks seamlessly.
            </p>
          </div>
        </div>

        {/* Right Side: Form Sign In Panel */}
        <div className="flex-1 p-6 sm:p-10 md:p-12 flex flex-col justify-between bg-white">
          <div className="self-end text-xs font-bold text-slate-450 hidden sm:block">
            Smart Portal
          </div>

          {/* Sign In Credentials Form */}
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

              {/* Password Input with Interactive Hide/Show Eye Icon */}
              <div className="space-y-1">
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    {...register('password')}
                    className="w-full pl-4 pr-11 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#fbfbfe] dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-green/30 focus:bg-white dark:focus:bg-slate-900 transition-all font-semibold shadow-sm"
                    placeholder="Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[10px] font-bold text-red-500 mt-1 pl-1">{errors.password.message}</p>
                )}
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-[11px] font-extrabold text-[#1e7a34] dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-brand-green hover:bg-brand-green/95 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-premium hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer select-none"
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

      {/* FORGOT PASSWORD MODAL */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-[#1e7a34] flex items-center justify-center font-black">
                  🔑
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white leading-tight">Reset Password</h3>
                  <p className="text-[10px] text-slate-400 font-medium">We'll send a password recovery link to your email.</p>
                </div>
              </div>
              <button 
                onClick={() => { setIsForgotModalOpen(false); setResetError(null); setResetSuccessMsg(null); }} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {resetSuccessMsg ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-xs text-emerald-800 dark:text-emerald-200 font-semibold space-y-3">
                <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle size={16} /> Reset Email Sent!
                </div>
                <p className="text-[11px] leading-relaxed">{resetSuccessMsg}</p>
                <button
                  onClick={() => { setIsForgotModalOpen(false); setResetSuccessMsg(null); setResetEmail(''); }}
                  className="w-full py-2.5 bg-[#1e7a34] text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-sm hover:bg-[#258d3f] transition-all"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendResetEmail} className="space-y-4">
                {resetError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/15 text-red-600 rounded-xl text-xs font-semibold text-center leading-relaxed">
                    {resetError}
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your registered email address"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#fbfbfe] dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:border-brand-green"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="flex-1 py-3 bg-[#1e7a34] text-white text-xs font-bold rounded-xl shadow cursor-pointer uppercase tracking-wider hover:bg-[#258d3f] transition-colors"
                  >
                    {isResetting ? 'Sending...' : 'Send Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
