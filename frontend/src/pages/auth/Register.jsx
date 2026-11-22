import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, Eye, EyeOff, GraduationCap, BarChart2, Users, Building2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

const roles = [
  { value: 'STUDENT',   label: 'Student',             description: 'Learn trading under mentor guidance', icon: GraduationCap },
  { value: 'TRADER',    label: 'Independent Trader',   description: 'Practise and self-analyse',           icon: BarChart2     },
  { value: 'MENTOR',    label: 'Mentor',               description: 'Guide and assess students',           icon: Users         },
  { value: 'INSTITUTE', label: 'Institute',             description: 'Manage cohorts and programmes',       icon: Building2     },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.role) { setError('Please select your role.'); return; }
    setError('');
    setLoading(true);
    try {
      const user = await register(form);
      const roleRoutes = { STUDENT: '/student', TRADER: '/trader', MENTOR: '/mentor', INSTITUTE: '/institute' };
      navigate(roleRoutes[user.role] || '/student');
    } catch (err) {
      setError(err?.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      <div className="w-full max-w-lg">
        {/* Back to home */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium mb-5 transition-colors"
          style={{ color: 'var(--text-3)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
        >
          <ArrowLeft size={13} />
          Back to Home
        </Link>

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent)' }}>
            <TrendingUp size={17} style={{ color: 'var(--accent-fg)' }} strokeWidth={2.5} />
          </div>
          <span className="font-bold text-[16px] tracking-tight" style={{ color: 'var(--text)' }}>TradeProof</span>
        </div>

        <div className="card p-8">
          <h1 className="text-[20px] font-bold tracking-tight" style={{ color: 'var(--text)' }}>Create your account</h1>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--text-3)' }}>
            Get started with TradeProof — free for educational use
          </p>

          {error && (
            <div className="alert-error mt-4">
              <p className="text-[13px]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Role selection */}
            <div>
              <label className="label">I am a</label>
              <div className="grid grid-cols-2 gap-2">
                {roles.map(({ value, label, description, icon: Icon }) => {
                  const selected = form.role === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, role: value }))}
                      className="text-left p-3 rounded-lg transition-all duration-100"
                      style={{
                        border: selected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                        backgroundColor: selected ? 'var(--accent-subtle)' : 'var(--bg-raised)',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon size={13} style={{ color: selected ? 'var(--accent)' : 'var(--text-3)' }} />
                        <span
                          className="text-[13px] font-medium"
                          style={{ color: selected ? 'var(--accent)' : 'var(--text)' }}
                        >
                          {label}
                        </span>
                      </div>
                      <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>{description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">First name</label>
                <input type="text" className="input" placeholder="Arjun" value={form.firstName}
                  onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Last name</label>
                <input type="text" className="input" placeholder="Sharma" value={form.lastName}
                  onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))} required />
              </div>
            </div>

            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="you@example.com" value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
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

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-5 text-center text-[11px]" style={{ color: 'var(--text-3)' }}>
            By registering you agree that this is an educational platform. No real-money trading occurs.
          </p>

          <p className="mt-3 text-center text-[13px]" style={{ color: 'var(--text-3)' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-medium" style={{ color: 'var(--accent)' }}>Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
