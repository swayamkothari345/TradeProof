import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard, TrendingUp, BookOpen, Calculator, Brain, ClipboardList,
  GraduationCap, BarChart2, Users, Link2, FileText, AlertTriangle, MessageSquare,
  PieChart, Settings, LogOut, ChevronLeft, ChevronRight, Building2, FlaskConical,
  History, Target, Trophy
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

const navByRole = {
  STUDENT: [
    { label: 'Overview', path: '/student', icon: LayoutDashboard, end: true },
    { label: 'Demo Trading Lab', path: '/student/trading-lab', icon: TrendingUp },
    { label: 'Fictional Market', path: '/student/fictional-market', icon: FlaskConical },
    { label: 'Historical Practice', path: '/student/historical-practice', icon: History },
    { label: 'Trading Journal', path: '/student/journal', icon: BookOpen },
    { label: 'Risk Calculator', path: '/student/risk', icon: Calculator },
    { label: 'AI Trading Coach', path: '/student/ai-coach', icon: Brain },
    { label: 'Assessments', path: '/student/tests', icon: ClipboardList },
    { label: 'Learning Hub', path: '/student/learning', icon: GraduationCap },
    { label: 'Analytics', path: '/student/analytics', icon: BarChart2 },
    { label: 'My Mentors', path: '/student/mentors', icon: Users },
    { label: 'Disputes', path: '/student/disputes', icon: AlertTriangle },
    { label: 'Settings', path: '/student/settings', icon: Settings },
  ],
  TRADER: [
    { label: 'Overview', path: '/trader', icon: LayoutDashboard, end: true },
    { label: 'Demo Trading Lab', path: '/trader/trading-lab', icon: TrendingUp },
    { label: 'Fictional Market', path: '/trader/fictional-market', icon: FlaskConical },
    { label: 'Historical Practice', path: '/trader/historical-practice', icon: History },
    { label: 'Trading Journal', path: '/trader/journal', icon: BookOpen },
    { label: 'Risk Calculator', path: '/trader/risk', icon: Calculator },
    { label: 'AI Trading Coach', path: '/trader/ai-coach', icon: Brain },
    { label: 'Assessments', path: '/trader/tests', icon: ClipboardList },
    { label: 'Learning Hub', path: '/trader/learning', icon: GraduationCap },
    { label: 'Analytics', path: '/trader/analytics', icon: BarChart2 },
    { label: 'Settings', path: '/trader/settings', icon: Settings },
  ],
  MENTOR: [
    { label: 'Overview', path: '/mentor', icon: LayoutDashboard, end: true },
    { label: 'My Students', path: '/mentor/students', icon: Users },
    { label: 'Invitations', path: '/mentor/invitations', icon: Link2 },
    { label: 'Assessments', path: '/mentor/tests', icon: ClipboardList },
    { label: 'Assignments', path: '/mentor/assignments', icon: FileText },
    { label: 'Trade Reviews', path: '/mentor/trade-reviews', icon: TrendingUp },
    { label: 'Rule Findings', path: '/mentor/findings', icon: AlertTriangle },
    { label: 'Disputes', path: '/mentor/disputes', icon: MessageSquare },
    { label: 'Feedback', path: '/mentor/feedback', icon: Brain },
    { label: 'Analytics', path: '/mentor/analytics', icon: BarChart2 },
    { label: 'Settings', path: '/mentor/settings', icon: Settings },
  ],
  INSTITUTE: [
    { label: 'Overview', path: '/institute', icon: LayoutDashboard, end: true },
    { label: 'Teachers', path: '/institute/mentors', icon: Users },
    { label: 'Students', path: '/institute/students', icon: GraduationCap },
    { label: 'Cohorts', path: '/institute/cohorts', icon: Building2 },
    { label: 'Invitations', path: '/institute/invitations', icon: Link2 },
    { label: 'Assessments', path: '/institute/assessments', icon: ClipboardList },
    { label: 'Assignments', path: '/institute/assignments', icon: FileText },
    { label: 'Analytics', path: '/institute/analytics', icon: PieChart },
    { label: 'Settings', path: '/institute/settings', icon: Settings },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = navByRole[user?.role] ?? [];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className={clsx(
      'flex flex-col h-screen sticky top-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-200',
      collapsed ? 'w-14' : 'w-56'
    )}>
      {/* Logo */}
      <div className={clsx(
        'flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0',
        collapsed && 'justify-center px-0'
      )}>
        <div className="w-7 h-7 bg-teal-600 rounded-md flex items-center justify-center flex-shrink-0">
          <TrendingUp size={14} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">TradeProof</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {navItems.map(({ label, path, icon: Icon, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-2.5 py-2 rounded-md text-sm font-medium transition-colors',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              isActive
                ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400'
                : 'text-gray-600 dark:text-gray-400',
              collapsed && 'justify-center px-0'
            )}
            title={collapsed ? label : undefined}
          >
            <Icon size={16} className="flex-shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-2 space-y-1">
        <button
          onClick={handleLogout}
          className={clsx(
            'w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors',
            collapsed && 'justify-center px-0'
          )}
          title={collapsed ? 'Log out' : undefined}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && <span>Log out</span>}
        </button>

        <button
          onClick={() => setCollapsed(c => !c)}
          className="w-full flex items-center justify-center py-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </aside>
  );
}
