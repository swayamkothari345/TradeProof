import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';

function getTitle(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  if (!last || last === 'student' || last === 'trader' || last === 'mentor' || last === 'institute') {
    return 'Overview';
  }
  return last
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export default function AppLayout() {
  const { pathname } = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-stone-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={getTitle(pathname)} />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
