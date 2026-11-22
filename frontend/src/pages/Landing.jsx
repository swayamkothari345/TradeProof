import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, BookOpen, Brain, BarChart2, GraduationCap,
  Users, Building2, FlaskConical, History, Shield,
  CheckCircle, ArrowRight, ClipboardList, Sun, Moon,
  Target, LineChart, Layers, FileText, Zap,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

// ─── Shared primitives ───────────────────────────────────────────────────────

function Badge({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: 'var(--accent-subtle)', border: '1px solid var(--accent-muted)', color: 'var(--accent)' }}>
      {children}
    </span>
  );
}

// ─── Product Preview ─────────────────────────────────────────────────────────

function ProductPreview() {
  return (
    <div className="relative mx-auto max-w-3xl mt-12">
      {/* Glow */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-brand/10 to-transparent rounded-2xl pointer-events-none" />
      <div className="rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        {/* Browser chrome */}
        <div className="px-4 py-2.5 flex items-center gap-2" style={{ backgroundColor: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 mx-3 h-5 rounded text-xs flex items-center px-2 text-[10px]" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-3)' }}>
            tradeproof.app/student
          </div>
        </div>
        {/* App shell */}
        <div className="flex h-56 sm:h-72">
          {/* Sidebar */}
          <div className="w-40 p-3 flex flex-col gap-1" style={{ backgroundColor: 'var(--bg-raised)', borderRight: '1px solid var(--border)' }}>
            <div className="flex items-center gap-1.5 mb-3 px-1">
              <div className="w-5 h-5 rounded bg-brand" />
              <span className="text-xs font-bold" style={{ color: 'var(--text-2)' }}>TradeProof</span>
            </div>
            {[
              ['Overview', true], ['Trading Lab', false], ['Journal', false],
              ['AI Coach', false], ['Analytics', false], ['Tests', false],
            ].map(([label, active]) => (
              <div key={label} className="px-2 py-1.5 rounded-md text-[11px] font-medium"
                style={active
                  ? { backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }
                  : { color: 'var(--text-3)' }}>
                {label}
              </div>
            ))}
          </div>
          {/* Main area */}
          <div className="flex-1 p-4 overflow-hidden">
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-3)' }}>Overview</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[['Portfolio Value', '₹1,00,000', 'var(--text)'], ['Total P&L', '+₹2,340', '#4ADE80'], ['Win Rate', '64%', '#5EEAD4']].map(([label, value, color]) => (
                <div key={label} className="rounded-lg p-2" style={{ backgroundColor: 'var(--bg-raised)' }}>
                  <p className="text-[9px] mb-0.5" style={{ color: 'var(--text-3)' }}>{label}</p>
                  <p className="text-xs font-bold" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>
            {/* Fake chart bars */}
            <div className="flex items-end gap-1 h-16">
              {[40, 55, 35, 70, 60, 80, 50, 75, 65, 90, 72, 85].map((h, i) => (
                <div key={i} className="flex-1 rounded-t"
                  style={{ height: `${h}%`, backgroundColor: i % 3 === 0 ? '#ef4444' : '#14b8a6', opacity: 0.7 + (i % 3) * 0.1 }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function Landing() {
  const { dark, toggle } = useTheme();

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text)' }}>

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 backdrop-blur-sm" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'rgba(17,28,46,0.92)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand rounded-md flex items-center justify-center">
              <TrendingUp size={14} className="text-white" />
            </div>
            <span className="text-sm font-bold">TradeProof</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm" style={{ color: 'var(--text-2)' }}>
            <a href="#features" className="transition-colors"
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-2)'}>Features</a>
            <a href="#how-it-works" className="transition-colors"
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-2)'}>How it works</a>
            <a href="#who-its-for" className="transition-colors"
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-2)'}>Who it's for</a>
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={toggle}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: 'var(--text-2)' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-raised)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              aria-label="Toggle theme">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link to="/login" className="text-sm transition-colors px-2 py-1.5"
              style={{ color: 'var(--text-2)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-2)'}>
              Sign in
            </Link>
            <Link to="/register" className="px-4 py-1.5 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 text-center">
        <div className="mb-5">
          <Badge><Shield size={11} /> Educational use only · Simulated data · No real trading</Badge>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-5 tracking-tight">
          Become a disciplined trader<br className="hidden sm:block" />{' '}
          <span style={{ color: 'var(--accent)' }}>before risking real money</span>
        </h1>

        <p className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-8" style={{ color: 'var(--text-2)' }}>
          TradeProof is a structured trading education platform. Practice in simulated markets,
          journal every trade, get AI-powered coaching, and track your progress — all in one place.
        </p>

        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/register"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
            Start learning free <ArrowRight size={14} />
          </Link>
          <Link to="/login"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl transition-colors"
            style={{ backgroundColor: 'var(--bg-raised)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--bg-raised)'; e.currentTarget.style.color = 'var(--text-2)'; }}>
            Sign in
          </Link>
        </div>

        <ProductPreview />
      </section>

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>Process</p>
            <h2 className="text-2xl sm:text-3xl font-bold">How TradeProof works</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: '01', icon: Layers,
                title: 'Practice in simulated markets',
                desc: 'Trade NIFTY 50, fictional companies, and historical scenarios — all with synthetic data, zero risk.',
              },
              {
                step: '02', icon: FileText,
                title: 'Journal every trade',
                desc: 'Record your entries, exits, rationale, and mistakes. Build a searchable history of your trading behaviour.',
              },
              {
                step: '03', icon: Brain,
                title: 'Get AI coaching',
                desc: 'The AI Trading Coach analyses your journal for patterns — discipline issues, recurring mistakes, and positive habits.',
              },
              {
                step: '04', icon: LineChart,
                title: 'Track your progress',
                desc: 'Win rate, risk-reward, consistency score, drawdown — visualised on your analytics dashboard.',
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="relative">
                <div className="text-4xl font-black leading-none mb-3" style={{ color: 'var(--border)' }}>{step}</div>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: 'var(--accent-subtle)' }}>
                  <Icon size={18} style={{ color: 'var(--accent)' }} />
                </div>
                <h3 className="text-sm font-semibold mb-2">{title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>Platform</p>
          <h2 className="text-2xl sm:text-3xl font-bold">Everything in one place</h2>
          <p className="text-sm mt-2 max-w-xl mx-auto" style={{ color: 'var(--text-3)' }}>
            All the tools a serious trader needs to learn, reflect, and improve — structured into a single platform.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icon: TrendingUp, bg: 'bg-indigo-500',
              title: 'Demo Trading Lab',
              desc: 'Paper trade NIFTY 50 and RELIANCE with simulated prices. Place MARKET or LIMIT orders, track positions and P&L — risk-free.',
            },
            {
              icon: FlaskConical, bg: 'bg-brand',
              title: 'Fictional Market',
              desc: 'Five fictional companies with synthetic price histories and news feeds. Experiment freely without real-world context.',
            },
            {
              icon: History, bg: 'bg-violet-500',
              title: 'Historical Practice',
              desc: 'Read a news event, interpret the chart, decide BUY / SELL / WAIT and submit your reasoning for multi-criteria scoring.',
            },
            {
              icon: BookOpen, bg: 'bg-amber-500',
              title: 'Trading Journal',
              desc: 'Log every trade with entry, exit, rationale, stop-loss, and outcome. Tag mistakes and build your personal trade record.',
            },
            {
              icon: Brain, bg: 'bg-purple-500',
              title: 'AI Trading Coach',
              desc: 'Pattern analysis on your journal — discipline warnings, recurring errors, positive habits, and tailored exercises.',
            },
            {
              icon: BarChart2, bg: 'bg-blue-500',
              title: 'Analytics Dashboard',
              desc: 'Win rate, risk-reward, drawdown, expectancy, and consistency score visualised across all your activity.',
            },
            {
              icon: ClipboardList, bg: 'bg-green-500',
              title: 'MCQ Assessments',
              desc: 'Platform tests on risk management, trading psychology, position sizing, technical analysis, and market structure.',
            },
            {
              icon: GraduationCap, bg: 'bg-orange-500',
              title: 'Learning Hub',
              desc: 'Structured modules covering core trading concepts, with progress tracking and curated external resources.',
            },
            {
              icon: Shield, bg: 'bg-red-500',
              title: 'Risk Calculator',
              desc: 'Compute position size, stop-loss distance, risk-reward ratios, and maximum portfolio risk before every trade.',
            },
          ].map(({ icon: Icon, bg, title, desc }) => (
            <div key={title}
              className="rounded-xl p-5 transition-all"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-muted)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${bg}`}>
                <Icon size={16} className="text-white" />
              </div>
              <h3 className="text-sm font-semibold mb-1">{title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Who it's for ────────────────────────────────────────────────────── */}
      <section id="who-its-for" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>Roles</p>
            <h2 className="text-2xl sm:text-3xl font-bold">Built for every type of learner</h2>
            <p className="text-sm mt-2" style={{ color: 'var(--text-3)' }}>Pick your role and get a tailored learning experience</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: TrendingUp, bg: 'bg-indigo-500', label: 'Trader',
                features: ['Full demo trading lab', 'Self-paced learning', 'AI coaching', 'Analytics dashboard'],
              },
              {
                icon: GraduationCap, bg: 'bg-brand', label: 'Student',
                features: ['Assigned tests & scenarios', 'Mentor guidance', 'Learning modules', 'Progress tracking'],
              },
              {
                icon: Users, bg: 'bg-violet-500', label: 'Mentor',
                features: ['Create & assign tests', 'Review student trades', 'Rubric-based feedback', 'Student analytics'],
              },
              {
                icon: Building2, bg: 'bg-amber-500', label: 'Institute',
                features: ['Manage cohorts', 'Invite teachers', 'Bulk assignments', 'Aggregate analytics'],
              },
            ].map(({ icon: Icon, bg, label, features }) => (
              <Link key={label} to="/register"
                className="group rounded-xl p-5 transition-all block"
                style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-muted)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${bg}`}>
                  <Icon size={16} className="text-white" />
                </div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold">{label}</h3>
                  <ArrowRight size={13} className="text-gray-400 group-hover:text-brand transition-colors" />
                </div>
                <ul className="space-y-1.5">
                  {features.map(f => (
                    <li key={f} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-3)' }}>
                      <CheckCircle size={11} className="text-brand shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-gradient-to-br from-brand to-brand-hover rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="absolute rounded-full border border-white/30"
                style={{ width: `${120 + i * 60}px`, height: `${120 + i * 60}px`, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
            ))}
          </div>
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-xs font-medium text-white mb-5">
              <Zap size={11} /> Free to get started
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Start your trading education today
            </h2>
            <p className="text-sm text-white/80 max-w-lg mx-auto mb-7 leading-relaxed">
              All market data on TradeProof is algorithmically simulated for educational purposes.
              TradeProof is not a broker, exchange, or financial advisor. No real money is involved.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link to="/register"
                className="inline-flex items-center gap-2 px-7 py-3 bg-white hover:bg-gray-50 text-brand text-sm font-bold rounded-xl transition-colors shadow-sm">
                Create a free account <ArrowRight size={14} />
              </Link>
              <Link to="/login"
                className="inline-flex items-center gap-2 px-7 py-3 text-white hover:text-white/80 text-sm font-semibold transition-colors border border-white/30 rounded-xl">
                Sign in →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-brand rounded flex items-center justify-center">
              <TrendingUp size={10} className="text-white" />
            </div>
            <span className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>TradeProof</span>
            <span className="text-xs" style={{ color: 'var(--border)' }}>·</span>
            <span className="text-xs text-gray-400">Educational Trading Platform</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>Simulated data only</span>
            <span>·</span>
            <span>Not financial advice</span>
            <span>·</span>
            <button onClick={toggle} className="flex items-center gap-1 transition-colors"
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = ''}>
              {dark ? <Sun size={12} /> : <Moon size={12} />}
              {dark ? 'Light mode' : 'Dark mode'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
