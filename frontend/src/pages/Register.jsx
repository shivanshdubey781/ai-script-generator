import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register, verifyOTP, resendOTP } from '../services/api';
import { Eye, EyeOff, UserPlus, AlertCircle, Mail, CheckCircle, RefreshCw } from 'lucide-react';

/* ────────────────────────────────────────────────────────────
   OTP Input Component — 6 individual digit boxes
──────────────────────────────────────────────────────────── */
function OTPInput({ onComplete, disabled }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  // FIX: useRef must not be called inside .map() — use a single ref array instead
  const inputRefs = useRef([]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // digits only
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);

    // Auto-advance to next box
    if (value && index < 5) inputRefs.current[index + 1]?.focus();

    // Notify parent when all 6 digits entered
    const code = newDigits.join('');
    if (code.length === 6) onComplete(code);
  };

  const handleKeyDown = (index, e) => {
    // Backspace goes to previous box
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newDigits = pasted.split('');
      setDigits(newDigits);
      inputRefs.current[5]?.focus();
      onComplete(pasted);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }} onPaste={handlePaste}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => (inputRefs.current[i] = el)}
          id={`otp-digit-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          style={{
            width: '48px',
            height: '56px',
            textAlign: 'center',
            fontSize: '24px',
            fontWeight: '700',
            background: '#0f0f1a',
            border: `2px solid ${digit ? '#6366f1' : '#2d2d4e'}`,
            borderRadius: '10px',
            color: '#e2e2f0',
            outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            cursor: disabled ? 'not-allowed' : 'text',
            letterSpacing: '0',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#6366f1';
            e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.2)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = digit ? '#6366f1' : '#2d2d4e';
            e.target.style.boxShadow = 'none';
          }}
        />
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Step Indicator Component
──────────────────────────────────────────────────────────── */
function StepIndicator({ step }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
      {/* Step 1 */}
      <div style={{
        width: '32px', height: '32px', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '13px', fontWeight: '700',
        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
        color: '#fff',
        boxShadow: step === 1 ? '0 0 0 3px rgba(99,102,241,0.25)' : 'none',
      }}>
        {step > 1 ? <CheckCircle size={16} /> : '1'}
      </div>
      {/* Connector */}
      <div style={{
        height: '2px', width: '40px',
        background: step > 1
          ? 'linear-gradient(to right,#6366f1,#8b5cf6)'
          : '#2d2d4e',
        borderRadius: '2px',
        transition: 'background 0.4s',
      }} />
      {/* Step 2 */}
      <div style={{
        width: '32px', height: '32px', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '13px', fontWeight: '700',
        background: step === 2
          ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
          : '#1a1a2e',
        color: step === 2 ? '#fff' : '#555577',
        border: step === 2 ? 'none' : '2px solid #2d2d4e',
        boxShadow: step === 2 ? '0 0 0 3px rgba(99,102,241,0.25)' : 'none',
        transition: 'all 0.4s',
      }}>
        2
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Main Register Page
──────────────────────────────────────────────────────────── */
export default function Register() {
  // Step 1 state
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  // Step 2 state
  const [step, setStep] = useState(1);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');

  // Resend countdown
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const navigate = useNavigate();

  /* Countdown timer — starts when step 2 mounts */
  useEffect(() => {
    if (step !== 2) return;
    if (countdown === 0) { setCanResend(true); return; }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, step]);

  /* ── Step 1: Validate ── */
  const validate = () => {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = 'Full name is required';
    if (!form.email) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email format';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    return errs;
  };

  /* ── Step 1: Submit registration ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setServerError('');
    setLoading(true);
    try {
      await register({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
      });
      setRegisteredEmail(form.email);
      setStep(2);
      setCountdown(60);
      setCanResend(false);
    } catch (err) {
      setServerError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 2: Verify OTP ── */
  const handleVerify = async (code) => {
    const finalCode = code || otpCode;
    if (!finalCode || finalCode.length < 6) return;
    setOtpLoading(true);
    setOtpError('');
    setOtpSuccess('');
    try {
      await verifyOTP({ email: registeredEmail, code: finalCode, purpose: 'registration' });
      setOtpSuccess('Email verified! Redirecting to login…');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setOtpError(err.response?.data?.detail || 'Verification failed. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  /* ── Step 2: Resend OTP ── */
  const handleResend = async () => {
    setOtpError('');
    try {
      await resendOTP({ email: registeredEmail, purpose: 'registration' });
      setCountdown(60);
      setCanResend(false);
      setOtpSuccess('A new OTP has been sent to your email.');
      setTimeout(() => setOtpSuccess(''), 4000);
    } catch (err) {
      setOtpError(err.response?.data?.detail || 'Failed to resend OTP.');
    }
  };

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    if (errors[field]) setErrors({ ...errors, [field]: '' });
  };

  /* ──────────────────────────────────────────
     RENDER
  ─────────────────────────────────────────── */
  return (
    <div className="p-8">
      <StepIndicator step={step} />

      {/* ── STEP 1: Registration Form ── */}
      {step === 1 && (
        <>
          <h2 className="text-2xl font-bold text-text-primary mb-1">Create account</h2>
          <p className="text-text-muted text-sm mb-6">Start generating viral scripts today — it&apos;s free!</p>

          {serverError && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300
              rounded-lg px-4 py-3 text-sm mb-5">
              <AlertCircle size={16} className="flex-shrink-0" />
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="reg-name" className="label">Full Name</label>
              <input
                id="reg-name"
                type="text"
                value={form.full_name}
                onChange={handleChange('full_name')}
                placeholder="Rahul Sharma"
                className={`input-field ${errors.full_name ? 'border-red-500/60' : ''}`}
                autoComplete="name"
              />
              {errors.full_name && <p className="text-red-400 text-xs mt-1">{errors.full_name}</p>}
            </div>

            <div>
              <label htmlFor="reg-email" className="label">Email Address</label>
              <input
                id="reg-email"
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                placeholder="you@example.com"
                className={`input-field ${errors.email ? 'border-red-500/60' : ''}`}
                autoComplete="email"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="reg-password" className="label">Password</label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange('password')}
                  placeholder="Min. 8 characters"
                  className={`input-field pr-12 ${errors.password ? 'border-red-500/60' : ''}`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="reg-confirm" className="label">Confirm Password</label>
              <input
                id="reg-confirm"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange('confirmPassword')}
                placeholder="Repeat your password"
                className={`input-field ${errors.confirmPassword ? 'border-red-500/60' : ''}`}
                autoComplete="new-password"
              />
              {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-6"
              id="register-submit-btn"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <UserPlus size={16} />
              )}
              {loading ? 'Creating account...' : 'Create Account →'}
            </button>
          </form>

          <p className="text-center text-sm text-text-muted mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:text-primary-hover font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </>
      )}

      {/* ── STEP 2: OTP Verification ── */}
      {step === 2 && (
        <div style={{ textAlign: 'center' }}>
          {/* Email icon */}
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.2))',
            border: '2px solid rgba(99,102,241,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <Mail size={28} style={{ color: '#6366f1' }} />
          </div>

          <h2 className="text-2xl font-bold text-text-primary mb-2">Verify your email</h2>
          <p className="text-text-muted text-sm mb-1">
            We sent a 6-digit code to
          </p>
          <p style={{ color: '#6366f1', fontWeight: '600', fontSize: '15px', marginBottom: '28px' }}>
            {registeredEmail}
          </p>

          {/* Error / Success banners */}
          {otpError && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300
              rounded-lg px-4 py-3 text-sm mb-5" style={{ textAlign: 'left' }}>
              <AlertCircle size={16} className="flex-shrink-0" />
              {otpError}
            </div>
          )}
          {otpSuccess && (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-300
              rounded-lg px-4 py-3 text-sm mb-5" style={{ textAlign: 'left' }}>
              <CheckCircle size={16} className="flex-shrink-0" />
              {otpSuccess}
            </div>
          )}

          {/* OTP boxes */}
          <div style={{ marginBottom: '28px' }}>
            <OTPInput
              onComplete={(code) => { setOtpCode(code); handleVerify(code); }}
              disabled={otpLoading}
            />
          </div>

          {/* Verify button */}
          <button
            onClick={() => handleVerify(otpCode)}
            disabled={otpLoading || otpCode.length < 6}
            className="btn-primary w-full flex items-center justify-center gap-2 mb-4"
            id="otp-verify-btn"
          >
            {otpLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckCircle size={16} />
            )}
            {otpLoading ? 'Verifying...' : 'Verify Email'}
          </button>

          {/* Resend countdown */}
          <div style={{ marginBottom: '20px' }}>
            {canResend ? (
              <button
                onClick={handleResend}
                className="flex items-center gap-1.5 mx-auto text-primary hover:text-primary-hover text-sm font-medium transition-colors"
                id="otp-resend-btn"
              >
                <RefreshCw size={14} />
                Resend OTP
              </button>
            ) : (
              <span className="text-text-muted text-sm">
                Resend OTP in <span style={{ color: '#6366f1', fontWeight: '600' }}>{countdown}s</span>
              </span>
            )}
          </div>

          {/* Back link */}
          <button
            onClick={() => { setStep(1); setServerError(''); setOtpError(''); }}
            className="text-text-muted hover:text-text-primary text-sm transition-colors"
            id="otp-back-btn"
          >
            ← Use a different email
          </button>
        </div>
      )}
    </div>
  );
}
