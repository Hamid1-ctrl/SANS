import React, { useState, useRef, useEffect } from 'react';
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

// The fixed OTP code that is "sent" to the user's email
const VALID_OTP = '714529';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Google auth flow: 'credentials' → 'google-email' → 'google-otp'
  const [authStep, setAuthStep] = useState<'credentials' | 'google-email' | 'google-otp'>('credentials');
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleEmailError, setGoogleEmailError] = useState<string | null>(null);
  const [googlePassword, setGooglePassword] = useState('');
  const [googlePasswordError, setGooglePasswordError] = useState<string | null>(null);

  // OTP state
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Auto focus first OTP input when OTP step loads
  useEffect(() => {
    if (authStep === 'google-otp') {
      setTimeout(() => {
        otpRefs[0].current?.focus();
      }, 80);
    }
  }, [authStep]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value !== '' && index < 5) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  // Step 1 of Google flow: validate email + password and proceed to OTP
  const handleGoogleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleEmailError(null);
    setGooglePasswordError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!googleEmail.trim()) {
      setGoogleEmailError('Please enter your email address');
      return;
    }
    if (!emailRegex.test(googleEmail)) {
      setGoogleEmailError('Please enter a valid email address');
      return;
    }
    if (!googlePassword.trim()) {
      setGooglePasswordError('Please enter your account password');
      return;
    }
    if (googlePassword.length < 6) {
      setGooglePasswordError('Password must be at least 6 characters');
      return;
    }

    // Proceed to OTP step
    setOtp(['', '', '', '', '', '']);
    setOtpError(null);
    setAuthStep('google-otp');
  };

  // Step 2 of Google flow: validate OTP code then authenticate
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      setOtpError('Please enter the complete 6-digit verification code');
      return;
    }
    // Accept any 6-digit code (demo code '714529' or any user-entered code) for mock verification
    setIsVerifying(true);
    setOtpError(null);
    try {
      await login({ email: googleEmail, password: googlePassword });
      navigate('/dashboard');
    } catch (err: any) {
      setOtpError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Authentication failed. Please check your credentials and try again.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // Reset Google flow back to credentials view
  const handleBackToCredentials = () => {
    setAuthStep('credentials');
    setGoogleEmail('');
    setGooglePassword('');
    setGoogleEmailError(null);
    setGooglePasswordError(null);
    setOtp(['', '', '', '', '', '']);
    setOtpError(null);
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
          {authStep === 'credentials' && (
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
                    onClick={() => setAuthStep('google-email')}
                    className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-[#fbfbfe] dark:hover:bg-slate-900 text-slate-655 flex items-center justify-center gap-2.5 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    <img src="/icons8-google.svg" alt="Google" className="w-4 h-4 shrink-0" />
                    <span>Google Account</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP: Google Email + Password Entry ─── */}
          {authStep === 'google-email' && (
            <div className="max-w-sm w-full mx-auto space-y-6 my-auto animate-fade-in">
              <div className="flex items-center gap-3 mb-2">
                <img src="/icons8-google.svg" alt="Google" className="w-6 h-6" />
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">
                    Sign in with Google
                  </h2>
                  <p className="text-[10px] text-slate-455 font-bold uppercase tracking-wider">
                    Enter your Google account details
                  </p>
                </div>
              </div>

              <form onSubmit={handleGoogleEmailSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Email Address</label>
                  <input
                    type="email"
                    value={googleEmail}
                    onChange={(e) => { setGoogleEmail(e.target.value); setGoogleEmailError(null); }}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-[#fbfbfe] text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-green/30 focus:bg-white transition-all font-semibold shadow-sm"
                    placeholder="you@example.com"
                    autoFocus
                  />
                  {googleEmailError && (
                    <p className="text-[10px] font-bold text-red-500 mt-1 pl-1">{googleEmailError}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Account Password</label>
                  <input
                    type="password"
                    value={googlePassword}
                    onChange={(e) => { setGooglePassword(e.target.value); setGooglePasswordError(null); }}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-[#fbfbfe] text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-green/30 focus:bg-white transition-all font-semibold shadow-sm"
                    placeholder="Your password"
                  />
                  {googlePasswordError && (
                    <p className="text-[10px] font-bold text-red-500 mt-1 pl-1">{googlePasswordError}</p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleBackToCredentials}
                    className="px-5 py-3 border border-slate-200 text-slate-655 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all shadow-sm flex-1 uppercase tracking-wider cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-3 bg-brand-green hover:bg-brand-green/95 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-premium flex-1 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Send OTP Code
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ─── STEP: Google OTP Verification ─── */}
          {authStep === 'google-otp' && (
            <div className="max-w-sm w-full mx-auto space-y-6 my-auto animate-fade-in">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                  Verify your identity
                </h2>
                <p className="text-xs text-slate-455 font-bold uppercase tracking-wider">
                  We sent a 6-digit code to {googleEmail}
                </p>
              </div>

              {/* OTP hint banner */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold text-center leading-relaxed">
                📧 Demo verification code: <span className="font-black tracking-widest">{VALID_OTP}</span>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="grid grid-cols-6 gap-2.5 justify-center py-2 select-none">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={otpRefs[idx]}
                      type="text"
                      inputMode="numeric"
                      value={digit}
                      maxLength={1}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="aspect-square w-full rounded-xl border border-slate-200 bg-[#fbfbfe] text-slate-800 text-center font-extrabold text-base focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green shadow-sm"
                    />
                  ))}
                </div>
                {otpError && (
                  <p className="text-[10px] font-bold text-red-500 text-center -mt-2">{otpError}</p>
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => { setAuthStep('google-email'); setOtp(['', '', '', '', '', '']); setOtpError(null); }}
                    className="px-5 py-3 border border-slate-200 text-slate-655 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all shadow-sm flex-1 uppercase tracking-wider cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="px-5 py-3.5 bg-brand-green hover:bg-brand-green/95 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-premium flex-1 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60"
                  >
                    {isVerifying ? 'Verifying...' : 'Verify & Sign In'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="text-center text-xs text-slate-450 font-semibold pt-4">
            {authStep === 'credentials' ? (
              <>
                New to SANS?{' '}
                <button
                  onClick={() => navigate('/register')}
                  className="text-brand-green font-bold hover:underline cursor-pointer"
                >
                  Create Account
                </button>
              </>
            ) : authStep === 'google-otp' ? (
              <>
                Didn't receive the code?{' '}
                <button
                  type="button"
                  onClick={() => { setOtp(['', '', '', '', '', '']); setOtpError(null); otpRefs[0].current?.focus(); }}
                  className="text-brand-green font-bold hover:underline cursor-pointer"
                >
                  Resend code
                </button>
              </>
            ) : null}
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
