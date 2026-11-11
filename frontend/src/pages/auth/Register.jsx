import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, Eye, EyeOff, GraduationCap, BarChart2, Users, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

const roles = [
  { value: 'STUDENT', label: 'Student', description: 'Learn trading under mentor guidance', icon: GraduationCap },
  { value: 'TRADER', label: 'Independent Trader', description: 'Practise and self-analyse', icon: BarChart2 },
  { value: 'MENTOR', label: 'Mentor', description: 'Guide and assess students', icon: Users },
  { value: 'INSTITUTE', label: 'Institute', description: 'Manage cohorts and programmes', icon: Building2 },
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
    <div className="min-h-screen bg-stone-50 dark:bg-gray-900 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-teal-600 rounded-md flex items-center justify-center">
            <TrendingUp size={16} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 dark:text-white text-lg">TradeProof</span>
        </div>

        <div className="card p-8">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Create your account</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started with TradeProof — free for educational use</p>

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Role selection */}
            <div>
              <label className="label">I am a</label>
              <div className="grid grid-cols-2 gap-2">
                {roles.map(({ value, label, description, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, role: value }))}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${
                      form.role === value
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={14} className={form.role === value ? 'text-teal-600 dark:text-teal-400' : 'text-gray-500'} />
                      <span className={`text-sm font-medium ${form.role === value ? 'text-teal-700 dark:text-teal-300' : 'text-gray-700 dark:text-gray-300'}`}>{label}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
                  </button>
                ))}
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
                <input type={showPassword ? 'text' : 'password'} className="input pr-10"
                  placeholder="Min 8 chars, 1 uppercase, 1 number" value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} required />
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-gray-400 dark:text-gray-500">
            By registering you agree that this is an educational platform. No real-money trading occurs.
          </p>

          <p className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-teal-600 dark:text-teal-400 font-medium hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
