import React from 'react';
import { Bell, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '../../services/api.js';
import { clsx } from 'clsx';

const roleBadge = {
  STUDENT: 'badge-blue',
  TRADER: 'badge-green',
  MENTOR: 'badge-amber',
  INSTITUTE: 'badge-gray',
};

export default function Header({ title }) {
  const { dark, toggle } = useTheme();
  const { user } = useAuth();

  const { data: notifs } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list().then(r => r.data.data),
    refetchInterval: 60000,
  });

  const unread = notifs?.filter(n => !n.isRead).length ?? 0;

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle theme"
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notifications */}
        <button className="relative p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <Bell size={16} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {/* User chip */}
        <div className="flex items-center gap-2 pl-3 border-l border-gray-200 dark:border-gray-700">
          <div className="w-7 h-7 bg-teal-100 dark:bg-teal-900/40 rounded-full flex items-center justify-center">
            <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">
              {user?.profile?.firstName?.[0] ?? user?.email?.[0]?.toUpperCase() ?? 'U'}
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-medium text-gray-900 dark:text-gray-100 leading-none">
              {user?.profile?.firstName} {user?.profile?.lastName}
            </p>
            <span className={clsx('text-[10px] mt-0.5', roleBadge[user?.role])}>{user?.role}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
