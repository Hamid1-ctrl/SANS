import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import type { RegisterRequest } from '../types';
import { ArrowRight, GraduationCap, Users, Award, Check, Mail, Lock, Hash, Phone, Building, Clock, BookOpen } from 'lucide-react';

// The fixed OTP code that is "sent" to the user's email
const VALID_OTP = '714529';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  
  // 4-Step state tracking:
  // Step 1: Create Account (Email, Pass, Confirm Pass)
  // Step 2: Email Verification (OTP)
  // Step 3: Choose Role
  // Step 4: Complete Profile (Tailored based on Role)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.Student);
  
  // State-driven form values
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    studentId: '',  // studentId or staffId
    phoneNumber: '',
    classCode: '',  // Class Representative tailored field
    department: '', // Lecturer tailored field
    officeNumber: '',
    officeHours: '',
    specialization: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Google sign-up intermediate email step
  const [showGoogleEmail, setShowGoogleEmail] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleEmailError, setGoogleEmailError] = useState<string | null>(null);
  const [googlePassword, setGooglePassword] = useState('');
  const [googlePasswordError, setGooglePasswordError] = useState<string | null>(null);
  
  // OTP Verification Code state (6 digits)
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Auto focus first OTP input on step 2 load
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => {
        otpRefs[0].current?.focus();
      }, 100);
    }
  }, [step]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // clear error for that field
    if (errors[name]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  // OTP box handler
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value[value.length - 1];
    }
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // auto focus next box
    if (value !== '' && index < 5) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  // STEP 1 VALIDATION
  const validateStep1 = () => {
    const tempErrors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!formData.email) {
      tempErrors.email = 'Email address is required';
    } else if (!emailRegex.test(formData.email)) {
      tempErrors.email = 'Invalid email address';
    }
    
    if (!formData.password) {
      tempErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      tempErrors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.confirmPassword !== formData.password) {
      tempErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  // STEP 4 VALIDATION (Tailored based on Selected Role)
  const validateStep4 = () => {
    const tempErrors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) {
      tempErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      tempErrors.lastName = 'Last name is required';
    }
    
    if (!formData.phoneNumber) {
      tempErrors.phoneNumber = 'Phone number is required';
    } else if (formData.phoneNumber.length < 10) {
      tempErrors.phoneNumber = 'Phone number must be at least 10 characters';
    }

    // Role-specific validations
    if (selectedRole === UserRole.Student) {
      if (!formData.studentId.trim()) {
        tempErrors.studentId = 'Student ID is required';
      }
    } else if (selectedRole === UserRole.ClassRepresentative) {
      if (!formData.studentId.trim()) {
        tempErrors.studentId = 'Student ID is required';
      }
      if (!formData.classCode.trim()) {
        tempErrors.classCode = 'Representative Class/Course code is required';
      }
    } else if (selectedRole === UserRole.Lecturer) {
      if (!formData.studentId.trim()) {
        tempErrors.studentId = 'Staff ID is required';
      }
      if (!formData.department.trim()) {
        tempErrors.department = 'Lecturer Department is required';
      }
      if (!formData.officeNumber.trim()) {
        tempErrors.officeNumber = 'Office Number is required (e.g. Room 402)';
      }
      if (!formData.officeHours.trim()) {
        tempErrors.officeHours = 'Office Hours are required (e.g. Mon/Wed 2-4 PM)';
      }
      if (!formData.specialization.trim()) {
        tempErrors.specialization = 'Academic Specialization is required (e.g. PhD, AI)';
      }
    }
    
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) setStep(2);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      setErrors({ otp: 'Please enter the complete 6-digit verification code' });
      return;
    }
    // Accept any 6-digit code (demo code '714529' or any user-entered code) for mock verification
    // Proceed to Step 3 (Choose Role)
    setStep(3);
  };

  // Google sign-up email step handler
  const handleGoogleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleEmailError(null);
    setGooglePasswordError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!googleEmail.trim()) {
      setGoogleEmailError('Please enter your Google email address');
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

    // Fill the form with Google email details and go to OTP step
    setFormData(prev => ({
      ...prev,
      email: googleEmail,
      password: googlePassword,
      confirmPassword: googlePassword,
    }));
    setShowGoogleEmail(false);
    setOtp(['', '', '', '', '', '']);
    setStep(2);
  };

  const handleNextStep3 = () => {
    setStep(4);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep4()) return;

    try {
      setRegisterError(null);
      const fullPayload: RegisterRequest = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        studentId: formData.studentId, // holds Student ID or Staff ID
        phoneNumber: formData.phoneNumber,
        role: selectedRole,
        officeNumber: selectedRole === UserRole.Lecturer ? formData.officeNumber : undefined,
        officeHours: selectedRole === UserRole.Lecturer ? formData.officeHours : undefined,
        specialization: selectedRole === UserRole.Lecturer ? formData.specialization : undefined
      };
      await registerUser(fullPayload);
      navigate('/login');
    } catch (error: any) {
      console.error('Registration failed:', error);
      setRegisterError(error?.response?.data?.detail || error?.response?.data?.message || error?.message || 'Registration failed. Please try again.');
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
      <div className="w-full max-w-5xl bg-white border border-slate-150 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.12),0_10px_30px_rgba(30,122,52,0.08)] ring-[12px] ring-slate-100/50 overflow-hidden flex flex-col md:flex-row min-h-[640px] relative z-10">
        
        {/* Left Side: Graphic Panel with Lottie Loader Animation */}
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

          <div className="text-center">
            <h3 className="text-sm font-extrabold text-[#F8FAFC] uppercase tracking-wider">
              Create Your SANS Account
            </h3>
            <p className="text-[11px] text-[#CBD5E1] font-bold mt-1.5 max-w-[240px] leading-relaxed">
              Sign up with your university email, choose your role, and connect with your classes.
            </p>
          </div>
        </div>

        {/* Right Side: Step Registration Form */}
        <div className="flex-1 p-12 flex flex-col justify-between bg-white">
          
          {/* Header step progress */}
          <div className="flex items-center justify-between text-xs font-bold text-slate-450">
            <div className="flex items-center gap-1.5">
              <div className={`h-1.5 w-8 rounded-full ${step >= 1 ? 'bg-brand-green' : 'bg-slate-100'}`} />
              <div className={`h-1.5 w-8 rounded-full ${step >= 2 ? 'bg-brand-green' : 'bg-slate-100'}`} />
              <div className={`h-1.5 w-8 rounded-full ${step >= 3 ? 'bg-brand-green' : 'bg-slate-100'}`} />
              <div className={`h-1.5 w-8 rounded-full ${step === 4 ? 'bg-brand-green' : 'bg-slate-100'}`} />
            </div>
            <span>{step} of 4</span>
          </div>

          {/* STEP 1: Account credentials */}
          {step === 1 && (
            <div className="max-w-md w-full mx-auto space-y-5 my-auto">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-855 dark:text-white tracking-tight animate-fade-in">
                  Create account
                </h2>
                <p className="text-xs text-slate-455 font-bold uppercase tracking-wider">
                  Choose your login credentials
                </p>
              </div>

              <form onSubmit={handleNextStep1} className="space-y-4">
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email address"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#fbfbfe] dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-brand-green/30 focus:bg-white transition-all font-semibold shadow-sm"
                  />
                  <Mail className="absolute left-4 top-3.5 text-slate-400" size={14} />
                </div>
                {errors.email && (
                  <p className="text-[10px] font-bold text-red-500 -mt-3 pl-1">{errors.email}</p>
                )}

                <div className="relative">
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Password"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#fbfbfe] dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-brand-green/30 focus:bg-white transition-all font-semibold shadow-sm"
                  />
                  <Lock className="absolute left-4 top-3.5 text-slate-400" size={14} />
                </div>
                {errors.password && (
                  <p className="text-[10px] font-bold text-red-500 -mt-3 pl-1">{errors.password}</p>
                )}

                <div className="relative">
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm Password"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#fbfbfe] dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-brand-green/30 focus:bg-white transition-all font-semibold shadow-sm"
                  />
                  <Lock className="absolute left-4 top-3.5 text-slate-400" size={14} />
                </div>
                {errors.confirmPassword && (
                  <p className="text-[10px] font-bold text-red-500 -mt-3 pl-1">{errors.confirmPassword}</p>
                )}

                <button
                  type="submit"
                  className="w-full py-3.5 bg-brand-green hover:bg-brand-green/95 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-premium flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                >
                  <span>Verify Email Address</span>
                  <ArrowRight size={14} />
                </button>
              </form>

              {/* Social Logins block */}
              <div className="space-y-4 mt-5">
                <div className="flex items-center gap-2">
                  <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-405">
                    or sign up with
                  </span>
                  <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1" />
                </div>

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowGoogleEmail(true)}
                    className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-[#fbfbfe] dark:hover:bg-slate-900 text-slate-655 flex items-center justify-center gap-2.5 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    <img src="/icons8-google.svg" alt="Google" className="w-4 h-4 shrink-0" />
                    <span>Google Account</span>
                  </button>
                </div>
              </div>

              {/* Google Email + Password Overlay */}
              {showGoogleEmail && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                  <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4 space-y-5">
                    <div className="flex items-center gap-3">
                      <img src="/icons8-google.svg" alt="Google" className="w-6 h-6" />
                      <div>
                        <h3 className="text-lg font-black text-slate-800 tracking-tight">Sign up with Google</h3>
                        <p className="text-[10px] text-slate-455 font-bold uppercase tracking-wider">Enter your Google account details</p>
                      </div>
                    </div>

                    <form onSubmit={handleGoogleEmailSubmit} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Email Address</label>
                        <input
                          type="email"
                          value={googleEmail}
                          onChange={(e) => { setGoogleEmail(e.target.value); setGoogleEmailError(null); }}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-[#fbfbfe] text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-green/30 transition-all font-semibold shadow-sm"
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
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-[#fbfbfe] text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-green/30 transition-all font-semibold shadow-sm"
                          placeholder="Create a password (min 6 characters)"
                        />
                        {googlePasswordError && (
                          <p className="text-[10px] font-bold text-red-500 mt-1 pl-1">{googlePasswordError}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => { setShowGoogleEmail(false); setGoogleEmailError(null); setGooglePasswordError(null); }}
                          className="px-5 py-3 border border-slate-200 text-slate-655 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all shadow-sm flex-1 uppercase tracking-wider cursor-pointer"
                        >
                          Cancel
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
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Email verification OTP (Now second step!) */}
          {step === 2 && (
            <div className="max-w-md w-full mx-auto space-y-6 my-auto animate-fade-in">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-855 dark:text-white tracking-tight">
                  Verify your email
                </h2>
                <p className="text-xs text-slate-455 font-bold uppercase tracking-wider">
                  We sent a 6-digit OTP code to {formData.email || 'your email'}
                </p>
              </div>

              {/* OTP hint banner */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold text-center leading-relaxed">
                📧 Demo verification code: <span className="font-black tracking-widest">{VALID_OTP}</span>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                {/* 6 box inputs grid */}
                <div className="grid grid-cols-6 gap-2.5 justify-center py-2 select-none">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={otpRefs[idx]}
                      type="text"
                      value={digit}
                      maxLength={1}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="aspect-square w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-[#fbfbfe] dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-center font-extrabold text-base focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green shadow-sm"
                    />
                  ))}
                </div>
                {errors.otp && (
                  <p className="text-[10px] font-bold text-red-500 text-center -mt-2">{errors.otp}</p>
                )}

                {/* countdown and resend links */}
                <div className="text-center text-xs text-slate-400 font-semibold">
                  Didn't receive the email?{' '}
                  <button type="button" className="text-brand-green font-bold hover:underline">
                    Resend code
                  </button>
                </div>

                {/* Step navigation buttons */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-5 py-3 border border-slate-200 dark:border-slate-800 text-slate-655 hover:bg-slate-55 rounded-xl text-xs font-bold transition-all shadow-sm flex-1 uppercase tracking-wider"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-3.5 bg-brand-green hover:bg-brand-green/95 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-premium flex-1 transition-all active:scale-[0.98]"
                  >
                    Verify & Continue
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 3: Choose academic role (Now third step!) */}
          {step === 3 && (
            <div className="max-w-md w-full mx-auto space-y-6 my-auto animate-fade-in">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-850 dark:text-white tracking-tight">
                  What is your academic role?
                </h2>
                <p className="text-xs text-slate-455 font-bold uppercase tracking-wider">
                  Select your SANS user profile role
                </p>
              </div>

              {/* Grid cards */}
              <div className="grid grid-cols-3 gap-3.5 pt-2">
                {[
                  { role: UserRole.Student, label: 'Student', icon: GraduationCap },
                  { role: UserRole.ClassRepresentative, label: 'Class Rep', icon: Users },
                  { role: UserRole.Lecturer, label: 'Lecturer', icon: Award },
                ].map((item) => {
                  const isSelected = selectedRole === item.role;
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.role}
                      onClick={() => setSelectedRole(item.role)}
                      className={`relative aspect-[3/4] border rounded-2xl p-4 flex flex-col items-center justify-between cursor-pointer transition-all duration-300 ${
                        isSelected
                          ? 'bg-[#3b2b52] text-white border-transparent shadow-large scale-[1.03]'
                          : 'bg-white dark:bg-[#1a1726] border-[#ece8f3] dark:border-slate-800 text-slate-655 hover:bg-slate-55 dark:hover:bg-slate-850 shadow-soft'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-2.5 right-2.5 w-4 h-4 bg-brand-green rounded-full flex items-center justify-center text-white border border-white">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}

                      <div className={`w-9.5 h-9.5 rounded-full flex items-center justify-center mt-3 ${isSelected ? 'bg-white/10 text-white' : 'bg-brand-green-light text-brand-green dark:bg-slate-800'}`}>
                        <Icon size={18} />
                      </div>

                      <span className="text-[10px] font-extrabold tracking-tight text-center pb-2 uppercase">
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-3 border border-slate-200 dark:border-slate-800 text-slate-650 hover:bg-slate-55 rounded-xl text-xs font-bold transition-all shadow-sm flex-1 uppercase tracking-wider"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNextStep3}
                  className="px-5 py-3.5 bg-brand-green text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-premium flex-1 transition-all active:scale-[0.98]"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Complete Profile (Tailored based on Selected Role - Now fourth step!) */}
          {step === 4 && (
            <div className="max-w-md w-full mx-auto space-y-5 my-auto animate-fade-in">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-855 dark:text-white tracking-tight">
                  Complete profile
                </h2>
                <p className="text-xs text-slate-455 font-bold uppercase tracking-wider">
                  Fill in your identity details ({selectedRole === UserRole.Student ? 'Student' : selectedRole === UserRole.Lecturer ? 'Lecturer' : 'Class Rep'})
                </p>
              </div>

              <form onSubmit={handleCreateAccount} className="space-y-4">
                {registerError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/15 text-red-600 rounded-xl text-xs font-semibold text-center">
                    {registerError}
                  </div>
                )}
                
                {/* Names */}
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="First name"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#fbfbfe] dark:bg-slate-900/60 text-slate-805 dark:text-slate-100 text-xs focus:outline-none focus:border-brand-green/30 focus:bg-white transition-all font-semibold"
                  />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Last name"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#fbfbfe] dark:bg-slate-900/60 text-slate-805 dark:text-slate-100 text-xs focus:outline-none focus:border-brand-green/30 focus:bg-white transition-all font-semibold"
                  />
                </div>
                {(errors.firstName || errors.lastName) && (
                  <p className="text-[10px] font-bold text-red-500 -mt-1 pl-1">Name details are required</p>
                )}

                {/* TAILORED ROW: Student ID vs Staff ID */}
                <div className="relative">
                  <input
                    type="text"
                    name="studentId"
                    value={formData.studentId}
                    onChange={handleChange}
                    placeholder={selectedRole === UserRole.Lecturer ? 'Staff Identification ID' : 'Student Identification ID'}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#fbfbfe] dark:bg-slate-900/60 text-slate-805 dark:text-slate-100 text-xs focus:outline-none focus:border-brand-green/30 focus:bg-white transition-all font-semibold shadow-sm"
                  />
                  <Hash className="absolute left-4 top-3.5 text-slate-400" size={14} />
                </div>
                {errors.studentId && (
                  <p className="text-[10px] font-bold text-red-500 -mt-3 pl-1">{errors.studentId}</p>
                )}

                {/* Phone number */}
                <div className="relative">
                  <input
                    type="text"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="Phone number"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#fbfbfe] dark:bg-slate-900/60 text-slate-850 dark:text-slate-100 text-xs focus:outline-none focus:border-brand-green/30 focus:bg-white transition-all font-semibold shadow-sm"
                  />
                  <Phone className="absolute left-4 top-3.5 text-slate-400" size={14} />
                </div>
                {errors.phoneNumber && (
                  <p className="text-[10px] font-bold text-red-500 -mt-3 pl-1">{errors.phoneNumber}</p>
                )}

                {/* TAILORED FIELD: Representative Class Code */}
                {selectedRole === UserRole.ClassRepresentative && (
                  <div className="relative animate-fade-in">
                    <input
                      type="text"
                      name="classCode"
                      value={formData.classCode}
                      onChange={handleChange}
                      placeholder="Representative Class Code (e.g. CS101, SE206)"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#fbfbfe] dark:bg-slate-900/60 text-slate-805 dark:text-slate-100 text-xs focus:outline-none focus:border-brand-green/30 focus:bg-white transition-all font-semibold shadow-sm"
                    />
                    <GraduationCap className="absolute left-4 top-3.5 text-slate-400" size={14} />
                    {errors.classCode && (
                      <p className="text-[10px] font-bold text-red-500 mt-1 pl-1">{errors.classCode}</p>
                    )}
                  </div>
                )}

                {/* TAILORED FIELD: Lecturer Department */}
                {selectedRole === UserRole.Lecturer && (
                  <>
                    <div className="relative animate-fade-in">
                      <input
                        type="text"
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        placeholder="Lecturer Department (e.g. Computer Science)"
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#fbfbfe] dark:bg-slate-900/60 text-slate-805 dark:text-slate-100 text-xs focus:outline-none focus:border-brand-green/30 focus:bg-white transition-all font-semibold shadow-sm"
                      />
                      <Award className="absolute left-4 top-3.5 text-slate-400" size={14} />
                      {errors.department && (
                        <p className="text-[10px] font-bold text-red-500 mt-1 pl-1">{errors.department}</p>
                      )}
                    </div>

                    {/* Lecturer Office Number */}
                    <div className="relative animate-fade-in">
                      <input
                        type="text"
                        name="officeNumber"
                        value={formData.officeNumber}
                        onChange={handleChange}
                        placeholder="Office Number (e.g. Room 402, Block C)"
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#fbfbfe] dark:bg-slate-900/60 text-slate-805 dark:text-slate-100 text-xs focus:outline-none focus:border-brand-green/30 focus:bg-white transition-all font-semibold shadow-sm"
                      />
                      <Building className="absolute left-4 top-3.5 text-slate-400" size={14} />
                      {errors.officeNumber && (
                        <p className="text-[10px] font-bold text-red-500 mt-1 pl-1">{errors.officeNumber}</p>
                      )}
                    </div>

                    {/* Lecturer Office Hours */}
                    <div className="relative animate-fade-in">
                      <input
                        type="text"
                        name="officeHours"
                        value={formData.officeHours}
                        onChange={handleChange}
                        placeholder="Office Hours (e.g. Mon/Wed 2:00 PM - 4:00 PM)"
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#fbfbfe] dark:bg-slate-900/60 text-slate-805 dark:text-slate-100 text-xs focus:outline-none focus:border-brand-green/30 focus:bg-white transition-all font-semibold shadow-sm"
                      />
                      <Clock className="absolute left-4 top-3.5 text-slate-400" size={14} />
                      {errors.officeHours && (
                        <p className="text-[10px] font-bold text-red-500 mt-1 pl-1">{errors.officeHours}</p>
                      )}
                    </div>

                    {/* Lecturer Specialization */}
                    <div className="relative animate-fade-in">
                      <input
                        type="text"
                        name="specialization"
                        value={formData.specialization}
                        onChange={handleChange}
                        placeholder="Academic Specialization (e.g. PhD, Artificial Intelligence)"
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#fbfbfe] dark:bg-slate-900/60 text-slate-805 dark:text-slate-100 text-xs focus:outline-none focus:border-brand-green/30 focus:bg-white transition-all font-semibold shadow-sm"
                      />
                      <BookOpen className="absolute left-4 top-3.5 text-slate-400" size={14} />
                      {errors.specialization && (
                        <p className="text-[10px] font-bold text-red-500 mt-1 pl-1">{errors.specialization}</p>
                      )}
                    </div>
                  </>
                )}

                {/* Step navigation buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-5 py-3 border border-slate-200 dark:border-slate-800 text-slate-655 hover:bg-slate-55 rounded-xl text-xs font-bold transition-all shadow-sm flex-1 uppercase tracking-wider"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-3.5 bg-brand-green hover:bg-brand-green/95 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-premium flex-1 transition-all active:scale-[0.98]"
                  >
                    Complete
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="text-center text-xs text-slate-450 font-semibold pt-4">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-brand-green font-bold hover:underline"
            >
              Sign In
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RegisterPage;
