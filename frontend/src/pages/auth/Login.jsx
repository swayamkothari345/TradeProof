import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

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
      student: { email: 'student@demo.com', password: 'Password1' },
      trader: { email: 'trader@demo.com', password: 'Password1' },
      mentor: { email: 'mentor@demo.com', password: 'Password1' },
      institute: { email: 'institute@demo.com', password: 'Password1' },
    };
    setForm(demos[role]);
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-gray-900 flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-96 bg-teal-700 p-10">
        <div>
          <div className="flex items-center gap-2 mb-10">
            <div className="w-8 h-8 bg-white/20 rounded-md flex items-center justify-center">
              <TrendingUp size={16} className="text-white" />
            </div>
            <span className="text-white font-bold text-lg">TradeProof</span>
          </div>
          <h2 className="text-3xl font-bold text-white leading-tight">
            Practice. Analyse. Improve.
          </h2>
          <p className="mt-4 text-teal-100 text-sm leading-relaxed">
            A trading discipline and learning platform for traders, students and mentors. Sharpen your process without risking real capital.
          </p>
        </div>

        <div className="space-y-3">
          {[
            { icon: '📋', text: 'Trade journalling with rule analysis' },
            { icon: '🧮', text: 'Position sizing & risk calculators' },
            { icon: '🤖', text: 'AI-powered trading coach' },
            { icon: '📊', text: 'Simulated trading environment' },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3 text-teal-100 text-sm">
              <span>{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
          <p className="text-teal-200 text-xs mt-4">
            For educational purposes only. No real-money trading.
          </p>
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-teal-600 rounded-md flex items-center justify-center">
              <TrendingUp size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white text-lg">TradeProof</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Log in to your account</p>

          {/* Demo quick-fill */}
          <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-2">Demo accounts (password: Password1)</p>
            <div className="flex flex-wrap gap-1.5">
              {['student', 'trader', 'mentor', 'institute'].map(role => (
                <button key={role} onClick={() => fillDemo(role)}
                  className="text-xs px-2 py-1 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 capitalize font-medium transition-colors">
                  {role}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
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
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-teal-600 dark:text-teal-400 font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
