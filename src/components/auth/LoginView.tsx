import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  Mail,
  Phone,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  MessageCircle,
  Send,
  Clock,
  Store,
  ChefHat,
  User,
  Users,
  ChevronRight,
  X,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { StaffMember, UserRole } from '../../types/index.ts';

export const LoginView: React.FC = () => {
  const {
    allStaff,
    currentStaff,
    loginWithPin,
    loginWithCredentials,
    quickDemoLogin,
    requestPinReset,
    verifyOtpAndResetPin,
    generateRandomPin,
    isTerminalLocked,
    unlockTerminal,
    logout,
  } = useAuth();

  // Mode: 'pin' (default POS numpad) or 'credentials' (email/mobile)
  const [authMode, setAuthMode] = useState<'pin' | 'credentials'>('pin');

  // Selected staff member for PIN entry
  const [selectedStaffId, setSelectedStaffId] = useState<string>(() => {
    return allStaff[0]?.id || '';
  });

  // Keep selectedStaffId updated if allStaff loads
  useEffect(() => {
    if (!selectedStaffId && allStaff.length > 0) {
      setSelectedStaffId(allStaff[0].id);
    }
  }, [allStaff, selectedStaffId]);

  // Current entered PIN
  const [pinInput, setPinInput] = useState<string>('');
  const [isPinVisible, setIsPinVisible] = useState<boolean>(false);

  // Credentials mode inputs
  const [identifierInput, setIdentifierInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');

  // UI status feedback
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  // Live clock
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  // Forgot password / PIN reset modal
  const [isForgotModalOpen, setIsForgotModalOpen] = useState<boolean>(false);
  const [resetIdentifier, setResetIdentifier] = useState<string>('');
  const [mobileNumberInput, setMobileNumberInput] = useState<string>('');
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');
  const [resetData, setResetData] = useState<{
    otp?: string;
    token?: string;
    staff?: StaffMember;
    mobileNumber?: string;
    expiresAt?: string;
    expiresInSeconds?: number;
    emailLink?: string;
    whatsappLink?: string;
    smsLink?: string;
    resetUrl?: string;
  } | null>(null);
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('1109');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [isOtpExpired, setIsOtpExpired] = useState<boolean>(false);

  // Selected staff object (Strictly defaulted to Owner)
  const ownerStaff = allStaff.find((s) => s.role === 'OWNER') || allStaff[0];
  const activeStaffMember = ownerStaff || allStaff[0];

  // Set default mobile from Owner if available
  useEffect(() => {
    if (ownerStaff?.phone && !mobileNumberInput) {
      const digits = ownerStaff.phone.replace(/\D/g, '').slice(-10);
      setMobileNumberInput(digits);
    }
    if (ownerStaff && selectedStaffId !== ownerStaff.id) {
      setSelectedStaffId(ownerStaff.id);
    }
  }, [ownerStaff]);

  // Real-Time 1-Minute (60s) Countdown Timer for OTP
  useEffect(() => {
    if (resetStep !== 'verify' || !isForgotModalOpen) return;

    setTimeLeft(60);
    setIsOtpExpired(false);

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsOtpExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [resetStep, resetData?.token, isForgotModalOpen]);

  // Initialize clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setCurrentDate(
        now.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle URL query parameters for reset link redirect (e.g. ?action=reset-pin&token=...&staffId=...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      const token = params.get('token');
      const staffId = params.get('staffId');
      if (action === 'reset-pin' && token) {
        setIsForgotModalOpen(true);
        setResetStep('verify');
        const targetStaff = allStaff.find((s) => s.id === staffId);
        setResetData({
          token,
          staff: targetStaff,
        });
        if (targetStaff) {
          setResetIdentifier(targetStaff.email || targetStaff.phone);
        }
      }
    }
  }, [allStaff]);

  // Handle Physical Keyboard Numpad / Digits input when PIN mode is active
  useEffect(() => {
    if (isForgotModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (authMode !== 'pin') return;

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleNumpadPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleNumpadBackspace();
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleNumpadClear();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handlePinSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authMode, pinInput, selectedStaffId, isForgotModalOpen]);

  // Numpad key press
  const handleNumpadPress = (digit: string) => {
    if (pinInput.length < 6) {
      const updated = pinInput + digit;
      setPinInput(updated);
      setErrorMessage('');

      // Auto submit when 4 digits are reached
      if (updated.length === 4) {
        triggerPinLogin(updated);
      }
    }
  };

  const handleNumpadBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMessage('');
  };

  const handleNumpadClear = () => {
    setPinInput('');
    setErrorMessage('');
  };

  // Trigger login with a given PIN
  const triggerPinLogin = async (pinToTry: string) => {
    try {
      setIsProcessing(true);
      setErrorMessage('');
      const res = await loginWithPin(pinToTry, selectedStaffId);
      if (res.success) {
        setSuccessMessage(res.message);
      } else {
        setErrorMessage(res.message);
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        setPinInput('');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPinInput('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePinSubmit = () => {
    if (!pinInput) {
      setErrorMessage('Please enter your 4-digit PIN.');
      return;
    }
    triggerPinLogin(pinInput);
  };

  // Credentials login submit
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifierInput.trim() || !passwordInput.trim()) {
      setErrorMessage('Please enter both your Email / Phone and PIN.');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage('');
      const res = await loginWithCredentials(identifierInput, passwordInput);
      if (res.success) {
        setSuccessMessage(res.message);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Lock screen PIN unlock
  const handleUnlockTerminal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput) {
      setErrorMessage('Enter your PIN to unlock terminal.');
      return;
    }
    const success = unlockTerminal(pinInput);
    if (!success) {
      setErrorMessage('Incorrect PIN. Terminal remains locked.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPinInput('');
    } else {
      setSuccessMessage('Terminal unlocked.');
    }
  };

  // Trigger Reset Code Generation via Real Mobile Number
  const handleGenerateReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMobile = mobileNumberInput.replace(/\D/g, '').slice(-10);
    if (!cleanMobile || cleanMobile.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit real mobile number (e.g. 9876543210).');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage('');
      const res = await requestPinReset(cleanMobile);
      if (res.success && res.token) {
        setResetData(res);
        setResetStep('verify');
        setEnteredOtp(''); // Strictly empty: Owner must input code received on real mobile
        setNewPin(''); // Strictly empty: Owner sets their desired 4-digit PIN
        setTimeLeft(60);
        setIsOtpExpired(false);
        setSuccessMessage(res.message);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate real-time OTP.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Resend fresh 1-minute OTP
  const handleResendOtp = async () => {
    const cleanMobile = mobileNumberInput.replace(/\D/g, '').slice(-10);
    if (!cleanMobile || cleanMobile.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit real mobile number.');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage('');
      const res = await requestPinReset(cleanMobile);
      if (res.success && res.token) {
        setResetData(res);
        setEnteredOtp(''); // Kept empty for real phone entry
        setNewPin('');
        setTimeLeft(60);
        setIsOtpExpired(false);
        setSuccessMessage('Fresh 1-minute OTP dispatched to mobile +91 ' + cleanMobile);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend OTP.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Complete PIN Reset with 1-Minute Expiry Validation
  const handleCompleteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOtpExpired || timeLeft <= 0) {
      setErrorMessage('This OTP has expired! Verification codes are strictly valid for only 1 minute. Please click Resend OTP.');
      return;
    }

    if (!enteredOtp.trim() || !newPin.trim()) {
      setErrorMessage('Please provide both the 6-digit OTP and the new 4-digit PIN.');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage('');
      const tokenOrId = resetData?.token || mobileNumberInput;
      const res = await verifyOtpAndResetPin(tokenOrId, enteredOtp, newPin);

      if (res.success) {
        setSuccessMessage(res.message);
        // Automatically close modal and log in
        setTimeout(async () => {
          await loginWithPin(newPin, ownerStaff?.id);
          setIsForgotModalOpen(false);
        }, 1200);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update PIN.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Copy reset link to clipboard
  const handleCopyLink = () => {
    if (resetData?.resetUrl) {
      navigator.clipboard.writeText(resetData.resetUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  };

  // If terminal is simply locked by current logged in user:
  if (isTerminalLocked) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
          {/* Subtle neon ring ambient background */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Food Katta Logo */}
          <div className="relative mx-auto w-24 h-24 rounded-full overflow-hidden border-2 border-amber-400/80 shadow-[0_0_25px_rgba(251,191,36,0.35)] p-0.5 bg-slate-950">
            <img
              src="/assets/food_katta_logo.jpg"
              alt="Food Katta"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-full"
            />
          </div>

          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Lock className="w-3.5 h-3.5" />
              <span>Terminal Locked</span>
            </div>
            <h2 className="text-xl font-black text-white">{currentStaff.name}</h2>
            <p className="text-xs text-slate-400 font-medium">
              Role: <span className="text-amber-400 font-bold">{currentStaff.role}</span> &bull; Enter PIN to unlock
            </p>
          </div>

          {/* Feedback */}
          {errorMessage && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* PIN Bubbles */}
          <div className="flex justify-center items-center gap-3">
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pinInput.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-150 ${
                    isFilled
                      ? 'bg-amber-400 scale-110 shadow-[0_0_12px_rgba(251,191,36,0.7)]'
                      : 'bg-slate-800 border border-slate-700'
                  }`}
                />
              );
            })}
          </div>

          {/* Mini Numpad */}
          <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  if (key === 'C') handleNumpadClear();
                  else if (key === '⌫') handleNumpadBackspace();
                  else {
                    if (pinInput.length < 4) {
                      const updated = pinInput + key;
                      setPinInput(updated);
                      if (updated.length === 4) {
                        const success = unlockTerminal(updated);
                        if (!success) {
                          setErrorMessage('Incorrect PIN.');
                          setIsShaking(true);
                          setTimeout(() => setIsShaking(false), 500);
                          setPinInput('');
                        }
                      }
                    }
                  }
                }}
                className="h-12 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 font-black text-base text-slate-100 border border-slate-700/60 shadow-sm transition-all"
              >
                {key}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                logout();
                setPinInput('');
              }}
              className="text-slate-400 hover:text-rose-400 font-bold transition-colors"
            >
              Switch User / Logout
            </button>
            <button
              onClick={() => {
                setIsForgotModalOpen(true);
                setResetIdentifier(currentStaff.email || currentStaff.phone);
              }}
              className="text-amber-400 hover:text-amber-300 font-bold transition-colors"
            >
              Forgot PIN?
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0d1117] text-slate-100 flex flex-col justify-between relative overflow-x-hidden select-none font-sans">
      {/* Background Neon Atmosphere Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Deep brick texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.07] bg-repeat"
          style={{
            backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
        {/* Cyan Ambient Neon Glow */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/15 rounded-full blur-[120px]" />
        {/* Red / Amber Ambient Neon Glow */}
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-rose-500/15 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 w-[500px] h-96 bg-amber-500/10 rounded-full blur-[130px]" />
      </div>

      {/* Top Status Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          {/* Logo Thumbnail with Neon Rim */}
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)] p-0.5 bg-slate-950 shrink-0">
            <img
              src="/assets/food_katta_logo.jpg"
              alt="Food Katta"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-wide text-white uppercase">
                Food Katta POS
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                v2.0 Online
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Quick Bites. Bold Flavors. &bull; Sangli
            </p>
          </div>
        </div>

        {/* Live Clock & Terminal info */}
        <div className="flex items-center gap-3 text-xs">
          <div className="hidden sm:flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{currentDate}</span>
            <span className="text-slate-600">|</span>
            <span className="font-mono font-bold text-white">{currentTime}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/80 border border-slate-800 rounded-lg text-[11px] text-slate-400 font-medium">
            <Store className="w-3 h-3 text-cyan-400" />
            <span>POS Terminal 01</span>
          </div>
        </div>
      </header>

      {/* Main Login Canvas */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-3 sm:p-6 lg:p-8">
        <div className="w-full max-w-5xl bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* ============================================================= */}
          {/* LEFT PANEL: Glowing Brand Showcase & Restaurant Info (5 cols) */}
          {/* ============================================================= */}
          <div className="lg:col-span-5 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 lg:p-8 flex flex-col justify-between items-center text-center border-b lg:border-b-0 lg:border-r border-slate-800/90 relative overflow-hidden">
            {/* Ambient circular glow background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-52 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-3 sm:space-y-4 relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Restaurant Billing System</span>
              </div>

              {/* High Resolution Official Neon Food Katta Logo */}
              <div className="relative mx-auto w-24 h-24 sm:w-40 sm:h-40 lg:w-52 lg:h-52 rounded-full p-1 bg-gradient-to-tr from-cyan-500 via-rose-500 to-amber-400 shadow-[0_0_35px_rgba(34,211,238,0.35)] transition-transform duration-500 hover:scale-105">
                <div className="w-full h-full rounded-full overflow-hidden bg-slate-950 p-0.5">
                  <img
                    src="/assets/food_katta_logo.jpg"
                    alt="Food Katta - Quick Bites. Bold Flavors."
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-300 to-cyan-300 tracking-tight">
                  FOOD KATTA
                </h1>
                <p className="text-[11px] sm:text-xs uppercase font-extrabold tracking-widest text-cyan-400">
                  Quick Bites &bull; Bold Flavors
                </p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto pt-1 font-medium leading-relaxed hidden sm:block">
                  Fast counter billing, live KOT kitchen queue, floor tables, and automated WhatsApp receipts.
                </p>
              </div>
            </div>

            {/* Owner Terminal Security Badge (Replaces Demo Access) */}
            <div className="w-full pt-6 relative z-10">
              <div className="bg-slate-950/80 border border-purple-500/30 rounded-2xl p-4 text-left space-y-3 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                    <span className="text-[11px] font-black tracking-wider uppercase text-purple-300">
                      Owner Terminal Access
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    Owner Only
                  </span>
                </div>
                <div className="border-t border-slate-800/80 pt-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 font-black text-sm">
                      RS
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">Rohan Sonawane</h4>
                      <p className="text-[10px] text-slate-400">Master POS Operator &bull; Full Control</p>
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Authorized Role:</span>
                  <span className="text-amber-400 font-bold">Restaurant Owner Only</span>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================= */}
          {/* RIGHT PANEL: Interactive POS Terminal Login (7 cols)          */}
          {/* ============================================================= */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div>
              {/* Login Mode Switcher Tabs */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('pin');
                      setErrorMessage('');
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${
                      authMode === 'pin'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Master PIN Pad</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('credentials');
                      setErrorMessage('');
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${
                      authMode === 'credentials'
                        ? 'bg-cyan-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email / Mobile</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsForgotModalOpen(true);
                    setResetStep('request');
                    setResetData(null);
                    setErrorMessage('');
                  }}
                  className="text-xs text-amber-400 hover:text-amber-300 font-bold transition-colors underline-offset-4 hover:underline flex items-center gap-1"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Forgot PIN? (Real OTP)</span>
                </button>
              </div>

              {/* Status or Error Notifications */}
              {errorMessage && (
                <div className="mt-4 p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-semibold flex items-center gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="mt-4 p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* MODE 1: OWNER MASTER PIN NUMPAD */}
              {authMode === 'pin' && (
                <div className="mt-5 space-y-5">
                  {/* Single Authorized Profile: Owner Rohan Sonawane */}
                  <div className="bg-slate-950/90 border border-purple-500/30 rounded-2xl p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 font-black text-base shadow-sm">
                        RS
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white">
                            {ownerStaff?.name || 'Rohan Sonawane'}
                          </h4>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                            OWNER
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Authorized POS Master Operator &bull; {ownerStaff?.phone || '+91 9876543210'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
                        Access Level
                      </span>
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 justify-end">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        Owner Only
                      </span>
                    </div>
                  </div>

                  {/* PIN Display & Bubbles */}
                  <div
                    className={`bg-slate-950 p-4 rounded-2xl border ${
                      isShaking
                        ? 'border-rose-500 animate-shake'
                        : 'border-slate-800'
                    } text-center space-y-2`}
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>
                        Owner Master PIN Code:
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsPinVisible(!isPinVisible)}
                        className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                        title={isPinVisible ? 'Hide PIN' : 'Reveal PIN'}
                      >
                        {isPinVisible ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* PIN Display Digits or Bubbles */}
                    <div className="h-10 flex items-center justify-center gap-3">
                      {isPinVisible ? (
                        <div className="font-mono text-2xl font-black tracking-widest text-amber-400">
                          {pinInput ? pinInput.padEnd(4, '-') : '----'}
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          {[0, 1, 2, 3].map((idx) => {
                            const isFilled = pinInput.length > idx;
                            return (
                              <div
                                key={idx}
                                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                                  isFilled
                                    ? 'bg-amber-400 scale-125 shadow-[0_0_12px_rgba(251,191,36,0.8)]'
                                    : 'bg-slate-800 border border-slate-700'
                                }`}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tactile On-Screen Numeric Keypad */}
                  <div className="grid grid-cols-3 gap-2.5 max-w-sm mx-auto">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(
                      (key) => {
                        const isAction = key === 'C' || key === '⌫';
                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={isProcessing}
                            onClick={() => {
                              if (key === 'C') handleNumpadClear();
                              else if (key === '⌫') handleNumpadBackspace();
                              else handleNumpadPress(key);
                            }}
                            className={`h-14 rounded-2xl font-black text-lg transition-all active:scale-95 flex items-center justify-center border ${
                              isAction
                                ? 'bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                                : 'bg-slate-800 hover:bg-slate-700/80 active:bg-amber-500 active:text-slate-950 text-white border-slate-700 shadow-sm'
                            }`}
                          >
                            {key}
                          </button>
                        );
                      }
                    )}
                  </div>

                  {/* Manual Submit Button if user types on physical keyboard */}
                  <button
                    type="button"
                    disabled={isProcessing || !pinInput}
                    onClick={handlePinSubmit}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-sm shadow-lg shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>
                      {isProcessing ? 'Authenticating Owner...' : 'Sign In as Owner'}
                    </span>
                  </button>
                </div>
              )}

              {/* MODE 2: EMAIL / MOBILE CREDENTIALS */}
              {authMode === 'credentials' && (
                <form onSubmit={handleCredentialsSubmit} className="mt-6 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 block">
                      Owner Registered Email or 10-Digit Mobile Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={identifierInput}
                        onChange={(e) => setIdentifierInput(e.target.value)}
                        placeholder="Enter your register Email or number"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 pl-10 text-sm text-white focus:outline-none focus:border-cyan-400 font-medium placeholder-slate-500"
                        required
                      />
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 block">
                      Owner Master 4-Digit PIN or Password
                    </label>
                    <div className="relative">
                      <input
                        type={isPinVisible ? 'text' : 'password'}
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="Enter Your PIN "
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 pl-10 pr-10 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono placeholder-slate-500"
                        required
                      />
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <button
                        type="button"
                        onClick={() => setIsPinVisible(!isPinVisible)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200"
                      >
                        {isPinVisible ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-sm shadow-lg shadow-cyan-500/20 disabled:opacity-40 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>{isProcessing ? 'Verifying...' : 'Sign In as Owner'}</span>
                  </button>
                </form>
              )}
            </div>

            {/* Footer / Terminal Info */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Protected by Food Katta Restaurant Security</span>
              </div>

              <div className="text-[11px] text-slate-400">
                Operator: <span className="text-amber-400 font-bold">Owner Rohan Sonawane</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* OWNER REAL-TIME MOBILE OTP FORGOT PASSWORD / PIN RECOVERY MODAL            */}
      {/* ========================================================================= */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-purple-500/40 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl relative">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-amber-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0 shadow-sm">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">
                      Owner Master PIN Recovery
                    </h3>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      Real Mobile OTP
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Enter your real mobile number to receive a real-time OTP valid for strictly 1 minute.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsForgotModalOpen(false);
                  setResetStep('request');
                  setResetData(null);
                  setErrorMessage('');
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error / Success Banners */}
            {errorMessage && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-semibold flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* STEP 1: ENTER REAL MOBILE NUMBER FOR 1-MINUTE REAL-TIME OTP */}
            {resetStep === 'request' && (
              <form onSubmit={handleGenerateReset} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    Owner Real Mobile Number (10 Digits)
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 flex items-center gap-1.5 text-slate-300 font-mono text-xs border-r border-slate-700 pr-2.5 select-none">
                      <span>🇮🇳</span>
                      <span className="font-bold text-white">+91</span>
                    </div>
                    <input
                      type="tel"
                      maxLength={10}
                      value={mobileNumberInput}
                      onChange={(e) => setMobileNumberInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 9876543210"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-20 pr-4 text-sm text-white font-mono tracking-wider focus:outline-none focus:border-amber-400 placeholder-slate-600"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl flex items-start gap-2 text-xs text-slate-400">
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-white font-bold">Strict Owner Authorization:</span> Only registered Owner Rohan Sonawane (+91 {ownerStaff?.phone?.replace(/\D/g, '').slice(-10) || '9876543210'}) has authorization to reset the POS Master PIN.
                    </div>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isProcessing || mobileNumberInput.length !== 10}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 font-black rounded-xl text-sm shadow-lg shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>
                      {isProcessing ? 'Generating Real-Time OTP...' : 'Send Real-Time 1-Minute OTP to Mobile'}
                    </span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: REAL-TIME 1-MINUTE COUNTDOWN + DISPATCH TO MOBILE + VERIFY */}
            {resetStep === 'verify' && resetData && (
              <div className="space-y-4">
                {/* 1-MINUTE COUNTDOWN TIMER DISPLAY */}
                <div
                  className={`p-4 rounded-2xl border text-center transition-all ${
                    timeLeft === 0
                      ? 'bg-rose-950/40 border-rose-500/60'
                      : timeLeft <= 15
                      ? 'bg-amber-950/40 border-amber-500/60'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Clock
                        className={`w-4 h-4 ${
                          timeLeft === 0 ? 'text-rose-400' : 'text-amber-400'
                        }`}
                      />
                      <span>OTP Validity (1 Minute Limit):</span>
                    </span>
                    <span
                      className={`font-mono font-black text-sm px-2 py-0.5 rounded-md ${
                        timeLeft === 0
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : timeLeft <= 15
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full transition-all duration-1000 ease-linear ${
                        timeLeft === 0
                          ? 'bg-rose-500'
                          : timeLeft <= 15
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${(timeLeft / 60) * 100}%` }}
                    />
                  </div>

                  {timeLeft > 0 ? (
                    <div className="py-2 px-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
                      <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-400">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Real-Time OTP Dispatched</span>
                      </div>
                      <p className="text-xs text-slate-300">
                        A 6-digit verification code was sent to Owner mobile:{' '}
                        <span className="font-mono font-bold text-amber-300">
                          +91 ******{(resetData.mobileNumber || mobileNumberInput).slice(-4)}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        🔒 For terminal security, the OTP is not displayed here. Check your mobile SMS / WhatsApp.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 py-1">
                      <div className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
                        <AlertCircle className="w-4 h-4" />
                        <span>OTP Expired (1-Minute Limit Exceeded)</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        For security, the real-time code has expired. Request a fresh 1-minute OTP.
                      </p>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 mx-auto shadow-md transition-all active:scale-95"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Resend Fresh 1-Minute OTP</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* DISPATCH CHANNELS TO REAL MOBILE */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Receive Code on Mobile:
                    </span>
                    {timeLeft > 0 && (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={isProcessing}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Resend Code</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* CARRIER SMS TO REAL MOBILE */}
                    {resetData.smsLink && (
                      <a
                        href={resetData.smsLink}
                        className="p-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold text-xs flex items-center justify-between transition-all group"
                      >
                        <span className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-purple-400" />
                          <span>Open Mobile SMS App</span>
                        </span>
                        <Send className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    )}

                    {/* WHATSAPP TO REAL MOBILE */}
                    {resetData.whatsappLink && (
                      <a
                        href={resetData.whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-between transition-all group"
                      >
                        <span className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-emerald-400" />
                          <span>Receive on WhatsApp</span>
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    )}
                  </div>
                </div>

                {/* IN-APP INSTANT PIN RESET FORM */}
                <form onSubmit={handleCompleteReset} className="pt-2 border-t border-slate-800 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300 block">
                        6-Digit OTP
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={enteredOtp}
                        disabled={timeLeft === 0}
                        onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="6-digit code"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono text-center tracking-widest focus:outline-none focus:border-amber-400 disabled:opacity-40"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300 block">
                        New Owner 4-Digit PIN
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 1109"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono text-center tracking-widest focus:outline-none focus:border-amber-400"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing || timeLeft === 0 || enteredOtp.length !== 6 || newPin.length !== 4}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {isProcessing
                        ? 'Verifying Real-Time OTP...'
                        : timeLeft === 0
                        ? 'OTP Expired — Please Resend'
                        : 'Verify OTP & Unlock POS as Owner'}
                    </span>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Bar: Copyright and Terminal Specs */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 py-3 text-center text-xs text-slate-500 border-t border-slate-800/80 flex flex-wrap items-center justify-between">
        <span>&copy; {new Date().getFullYear()} Food Katta Restaurant POS System</span>
        <span>Sangli, Maharashtra &bull; Made for High-Volume Counter Billing</span>
      </footer>
    </div>
  );
};
