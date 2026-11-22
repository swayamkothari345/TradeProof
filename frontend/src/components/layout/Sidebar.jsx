import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, BookOpen, Calculator, Brain, ClipboardList,
  GraduationCap, BarChart2, Users, Link2, FileText, AlertTriangle, MessageSquare,
  PieChart, Settings, LogOut, ChevronLeft, ChevronRight, Building2, FlaskConical,
  History, X, LibraryBig, Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

// ── Navigation definitions ─────────────────────────────────────────────────

const navByRole = {
  STUDENT: [
    {
      items: [
        { label: 'Overview', path: '/student', icon: LayoutDashboard, end: true },
      ],
    },
    {
      label: 'Practice',
      items: [
        { label: 'Demo Trading Lab',      path: '/student/trading-lab',            icon: TrendingUp  },
        { label: 'Fictional Market',      path: '/student/fictional-market',       icon: FlaskConical },
        { label: 'Historical Practice',   path: '/student/historical-practice',    icon: History     },
        { label: 'Practical Scenarios',   path: '/student/practical-scenarios',    icon: Zap         },
      ],
    },
    {
      label: 'Track',
      items: [
        { label: 'Trading Journal', path: '/student/journal',    icon: BookOpen  },
        { label: 'Risk Calculator', path: '/student/risk',       icon: Calculator },
        { label: 'Analytics',       path: '/student/analytics',  icon: BarChart2 },
      ],
    },
    {
      label: 'Learn',
      items: [
        { label: 'AI Coach',      path: '/student/ai-coach',    icon: Brain         },
        { label: 'Assessments',   path: '/student/tests',       icon: ClipboardList },
        { label: 'Learning Hub',  path: '/student/learning',    icon: GraduationCap },
        { label: 'Dictionary',    path: '/student/dictionary',  icon: LibraryBig    },
      ],
    },
    {
      label: 'Connect',
      items: [
        { label: 'My Mentors', path: '/student/mentors',   icon: Users         },
        { label: 'Disputes',   path: '/student/disputes',  icon: AlertTriangle },
        { label: 'Settings',   path: '/student/settings',  icon: Settings      },
      ],
    },
  ],
  TRADER: [
    {
      items: [
        { label: 'Overview', path: '/trader', icon: LayoutDashboard, end: true },
      ],
    },
    {
      label: 'Practice',
      items: [
        { label: 'Demo Trading Lab',      path: '/trader/trading-lab',             icon: TrendingUp  },
        { label: 'Fictional Market',      path: '/trader/fictional-market',        icon: FlaskConical },
        { label: 'Historical Practice',   path: '/trader/historical-practice',     icon: History     },
        { label: 'Practical Scenarios',   path: '/trader/practical-scenarios',     icon: Zap         },
      ],
    },
    {
      label: 'Track',
      items: [
        { label: 'Trading Journal', path: '/trader/journal',   icon: BookOpen  },
        { label: 'Risk Calculator', path: '/trader/risk',      icon: Calculator },
        { label: 'Analytics',       path: '/trader/analytics', icon: BarChart2 },
      ],
    },
    {
      label: 'Learn',
      items: [
        { label: 'AI Coach',     path: '/trader/ai-coach',    icon: Brain         },
        { label: 'Assessments',  path: '/trader/tests',       icon: ClipboardList },
        { label: 'Learning Hub', path: '/trader/learning',    icon: GraduationCap },
        { label: 'Dictionary',   path: '/trader/dictionary',  icon: LibraryBig    },
        { label: 'Settings',     path: '/trader/settings',    icon: Settings      },
      ],
    },
  ],
  MENTOR: [
    {
      items: [
        { label: 'Overview', path: '/mentor', icon: LayoutDashboard, end: true },
      ],
    },
    {
      label: 'Students',
      items: [
        { label: 'My Students',  path: '/mentor/students',    icon: Users },
        { label: 'Invitations',  path: '/mentor/invitations', icon: Link2 },
      ],
    },
    {
      label: 'Education',
      items: [
        { label: 'Assessments',  path: '/mentor/tests',        icon: ClipboardList },
        { label: 'Assignments',  path: '/mentor/assignments',  icon: FileText      },
        { label: 'Dictionary',   path: '/mentor/dictionary',   icon: LibraryBig    },
      ],
    },
    {
      label: 'Review',
      items: [
        { label: 'Trade Reviews',  path: '/mentor/trade-reviews', icon: TrendingUp    },
        { label: 'Rule Findings',  path: '/mentor/findings',      icon: AlertTriangle },
        { label: 'Disputes',       path: '/mentor/disputes',      icon: MessageSquare },
        { label: 'Feedback',       path: '/mentor/feedback',      icon: Brain         },
      ],
    },
    {
      label: 'Insights',
      items: [
        { label: 'Analytics', path: '/mentor/analytics', icon: BarChart2 },
        { label: 'Settings',  path: '/mentor/settings',  icon: Settings  },
      ],
    },
  ],
  INSTITUTE: [
    {
      items: [
        { label: 'Overview', path: '/institute', icon: LayoutDashboard, end: true },
      ],
    },
    {
      label: 'People',
      items: [
        { label: 'Cohorts',     path: '/institute/cohorts',     icon: Building2    },
        { label: 'Students',    path: '/institute/students',    icon: GraduationCap },
        { label: 'Teachers',    path: '/institute/mentors',     icon: Users        },
        { label: 'Invitations', path: '/institute/invitations', icon: Link2        },
      ],
    },
    {
      label: 'Education',
      items: [
        { label: 'Assessments', path: '/institute/assessments', icon: ClipboardList },
        { label: 'Assignments', path: '/institute/assignments',  icon: FileText      },
        { label: 'Dictionary',  path: '/institute/dictionary',  icon: LibraryBig    },
      ],
    },
    {
      label: 'Insights',
      items: [
        { label: 'Analytics', path: '/institute/analytics', icon: PieChart },
        { label: 'Settings',  path: '/institute/settings',  icon: Settings },
      ],
    },
  ],
};

const roleConfig = {
  STUDENT:   { label: 'Student',   textVar: 'var(--info)',               bgVar: 'var(--info-bg)'          },
  TRADER:    { label: 'Trader',    textVar: 'var(--accent)',             bgVar: 'var(--accent-subtle)'    },
  MENTOR:    { label: 'Mentor',    textVar: 'var(--warn)',               bgVar: 'var(--warn-bg)'          },
  INSTITUTE: { label: 'Institute', textVar: 'var(--badge-purple-color)', bgVar: 'var(--badge-purple-bg)'  },
};

// ── NavItem ────────────────────────────────────────────────────────────────

function NavItem({ label, path, icon: Icon, end, collapsed }) {
  return (
    <NavLink
      to={path}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `sidebar-nav-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center !px-0' : ''}`
      }
    >
      <Icon size={15} className="shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

// ── Main Sidebar ───────────────────────────────────────────────────────────

export default function Sidebar({ mobileOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const groups = navByRole[user?.role] ?? [];
  const rc = roleConfig[user?.role] ?? roleConfig.STUDENT;

  const initials = [user?.profile?.firstName, user?.profile?.lastName]
    .filter(Boolean).map(s => s[0].toUpperCase()).join('') || user?.email?.[0]?.toUpperCase() || 'U';
  const fullName = [user?.profile?.firstName, user?.profile?.lastName]
    .filter(Boolean).join(' ') || user?.email || '';

  // Close mobile sidebar on route change
  useEffect(() => {
    if (onClose) onClose();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside
      className={[
        // Shared
        'flex flex-col overflow-hidden transition-all duration-200 select-none',
        // ── Mobile: fixed overlay ──────────────────────────────────────────
        'fixed inset-y-0 left-0 z-40 w-[260px]',
        mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
        // ── Desktop (md+): sticky in-flow ─────────────────────────────────
        'md:sticky md:top-0 md:translate-x-0 md:shadow-none md:h-screen md:shrink-0 md:z-auto',
        collapsed ? 'md:w-[52px]' : 'md:w-[220px]',
      ].join(' ')}
      style={{
        backgroundColor: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
      }}
    >
      {/* Logo row */}
      <div
        className={`flex items-center gap-2.5 px-3 border-b shrink-0 ${collapsed ? 'justify-center' : ''}`}
        style={{ borderBottomColor: 'var(--sidebar-border)', minHeight: '52px', height: '52px' }}
      >
        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--accent)' }}>
          <TrendingUp size={14} style={{ color: 'var(--accent-fg)' }} strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <span className="text-[13px] font-bold tracking-tight" style={{ color: 'var(--text)' }}>TradeProof</span>
            </div>
            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="md:hidden w-7 h-7 flex items-center justify-center rounded-md transition-colors flex-shrink-0"
              style={{ color: '#52688F' }}
              onMouseEnter={e => e.currentTarget.style.color = '#94A3B8'}
              onMouseLeave={e => e.currentTarget.style.color = '#52688F'}
              aria-label="Close navigation"
            >
              <X size={16} />
            </button>
          </>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {groups.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && (
              <div className={`flex items-center gap-2 mt-3 mb-1 ${collapsed ? 'px-1' : 'px-1'}`}>
                <div className="h-px flex-1" style={{ backgroundColor: 'var(--sidebar-border)' }} />
                {!collapsed && group.label && (
                  <span
                    className="text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: 'var(--sidebar-label)' }}
                  >
                    {group.label}
                  </span>
                )}
                <div className="h-px flex-1" style={{ backgroundColor: 'var(--sidebar-border)' }} />
              </div>
            )}
            {group.items.map(item => (
              <NavItem key={item.path} {...item} collapsed={collapsed} />
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom section: user + logout + collapse */}
      <div className="shrink-0 border-t px-2 pb-2 pt-2 space-y-0.5" style={{ borderTopColor: 'var(--sidebar-border)' }}>
        {/* User row */}
        {!collapsed ? (
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-md">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ backgroundColor: rc.bgVar, color: rc.textVar }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium truncate leading-tight" style={{ color: 'var(--text)' }}>{fullName}</p>
              <p className="text-[10px] font-medium" style={{ color: rc.textVar }}>{rc.label}</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center px-0 py-1.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: rc.bgVar, color: rc.textVar }}
            >
              {initials}
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Log out' : undefined}
          className={`sidebar-nav-item w-full hover:!bg-[rgba(220,38,38,0.08)] hover:!text-[var(--neg)] ${collapsed ? 'justify-center !px-0' : ''}`}
        >
          <LogOut size={15} className="shrink-0" />
          {!collapsed && <span>Log out</span>}
        </button>

        {/* Desktop collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="hidden md:flex w-full items-center justify-center py-1 rounded-md transition-all duration-100"
          style={{ color: 'var(--sidebar-label)' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--sidebar-nav-hover)'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </aside>
  );
}
