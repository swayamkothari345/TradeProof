import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

const features = [
  { text: 'Trade journalling with rule analysis' },
  { text: 'Position sizing & risk calculators'   },
  { text: 'AI-powered trading coach'             },
  { text: 'Simulated trading environment'        },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      const roleRoutes = { STUDENT: '/student', TRADER: '/trader', MENTOR: '/mentor', INSTITUTE: '/institute' };
      navigate(roleRoutes[user.role] || '/student');
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    const demos = {
      student:   { email: 'student@demo.com',   password: 'Password1' },
      trader:    { email: 'trader@demo.com',     password: 'Password1' },
      mentor:    { email: 'mentor@demo.com',     password: 'Password1' },
      institute: { email: 'institute@demo.com',  password: 'Password1' },
    };
    setForm(demos[role]);
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Left branding panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-96 p-10 flex-shrink-0"
        style={{ backgroundColor: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}
      >
        <div>
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent)' }}>
              <TrendingUp size={17} style={{ color: 'var(--accent-fg)' }} strokeWidth={2.5} />
            </div>
            <span className="font-bold text-[16px] tracking-tight" style={{ color: 'var(--text)' }}>TradeProof</span>
          </div>
          <h2 className="text-[28px] font-bold leading-tight tracking-tight" style={{ color: 'var(--text)' }}>
            Practice.<br />Analyse.<br />Improve.
          </h2>
          <p className="mt-4 text-[13px] leading-relaxed" style={{ color: '#7A90B0' }}>
            A trading discipline and learning platform for traders, students and mentors. Sharpen your process without risking real capital.
          </p>
        </div>

        <div className="space-y-3">
          {features.map(({ text }) => (
            <div key={text} className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--accent)' }} />
              <span className="text-[13px]" style={{ color: 'var(--text-3)' }}>{text}</span>
            </div>
          ))}
          <p className="text-[11px] mt-4" style={{ color: 'var(--text-3)' }}>
            For educational purposes only. No real-money trading.
          </p>
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Back to home */}
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium mb-6 transition-colors"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
          >
            <ArrowLeft size={13} />
            Back to Home
          </Link>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent)' }}>
              <TrendingUp size={15} style={{ color: 'var(--accent-fg)' }} strokeWidth={2.5} />
            </div>
            <span className="font-bold text-[15px] tracking-tight" style={{ color: 'var(--text)' }}>TradeProof</span>
          </div>

          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text)' }}>Welcome back</h1>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--text-3)' }}>Log in to your account</p>

          {/* Demo quick-fill */}
          <div className="mt-6 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>
              Demo accounts — password: Password1
            </p>
            <div className="flex flex-wrap gap-1.5">
              {['student', 'trader', 'mentor', 'institute'].map(role => (
                <button
                  key={role}
                  type="button"
                  onClick={() => fillDemo(role)}
                  className="text-[11px] px-2.5 py-1 rounded-md font-medium capitalize transition-all duration-100"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--accent)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="alert-error">
                <p className="text-[13px]">{error}</p>
              </div>
            )}

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-3)' }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-1">
              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          <p className="mt-6 text-center text-[13px]" style={{ color: 'var(--text-3)' }}>
            Don't have an account?{' '}
            <Link to="/register" className="font-medium" style={{ color: 'var(--accent)' }}>Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
