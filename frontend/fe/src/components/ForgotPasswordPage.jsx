import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../context/useToast';

const MIN_PASSWORD = 6;
const INPUT =
  'w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500';
const BUTTON =
  'w-full bg-indigo-900 text-white py-3 rounded font-bold hover:bg-yellow-400 hover:text-indigo-900 transition-colors duration-300 disabled:opacity-60';

const ForgotPasswordPage = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: email, 2: otp, 3: new password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const run = (action) => async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await action();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = run(async () => {
    await api.post('/request-reset-password/', { email: email.trim() }, { auth: false });
    toast.success('We sent a 6-digit code to your email.');
    setStep(2);
  });

  const handleResend = async () => {
    setLoading(true);
    try {
      await api.post('/request-reset-password/', { email: email.trim() }, { auth: false });
      setOtp('');
      toast.success('We sent you a new code.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = run(async () => {
    await api.post('/verify-otp/', { email: email.trim(), otp: otp.trim() }, { auth: false });
    setStep(3);
  });

  const handleResetPassword = run(async () => {
    if (newPassword.length < MIN_PASSWORD) {
      toast.error(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    await api.post(
      '/reset-password/',
      { email: email.trim(), otp: otp.trim(), new_password: newPassword },
      { auth: false },
    );
    toast.success('Password reset successfully. You can now log in.');
    navigate('/auth');
  });

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="bg-white bg-opacity-90 backdrop-blur-md rounded-xl shadow-lg max-w-md w-full p-8 text-indigo-900">
        <h2 className="text-2xl font-bold text-center mb-2">Reset Password</h2>
        <p className="text-center text-sm text-indigo-700 mb-6">Step {step} of 3</p>

        {step === 1 && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="block font-semibold mb-1">Email Address</label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className={INPUT}
              />
            </div>
            <button type="submit" disabled={loading} className={BUTTON}>
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div>
              <label htmlFor="reset-otp" className="block font-semibold mb-1">OTP sent to {email}</label>
              <input
                id="reset-otp"
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                autoComplete="one-time-code"
                required
                className={INPUT}
              />
            </div>
            <button type="submit" disabled={loading} className={BUTTON}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <p className="text-center text-sm">
              The code is valid for 10 minutes.{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="text-indigo-700 underline hover:text-indigo-900 disabled:opacity-60"
              >
                Send a new code
              </button>
            </p>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label htmlFor="reset-password" className="block font-semibold mb-1">New Password</label>
              <input
                id="reset-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={`At least ${MIN_PASSWORD} characters`}
                autoComplete="new-password"
                required
                className={INPUT}
              />
            </div>
            <button type="submit" disabled={loading} className={BUTTON}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm">
          <Link to="/auth" className="text-indigo-700 underline hover:text-indigo-900">Back to login</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
