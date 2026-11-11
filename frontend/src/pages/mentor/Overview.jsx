import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, ClipboardList, AlertTriangle, MessageSquare, ChevronRight, Link2, Award } from 'lucide-react';
import { analyticsApi } from '../../services/api.js';
import StatCard from '../../components/ui/StatCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function MentorOverview() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.dashboard().then(r => r.data.data),
  });

  const quickLinks = [
    { label: 'View Students', path: '/mentor/students', icon: Users },
    { label: 'Create Invitation', path: '/mentor/invitations', icon: Link2 },
    { label: 'Create Test', path: '/mentor/tests', icon: ClipboardList },
    { label: 'Review Disputes', path: '/mentor/disputes', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Welcome back, {user?.profile?.firstName}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your mentoring dashboard</p>
        </div>
        <span className="badge-amber text-xs">Mentor</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Students" value={data?.totalStudents ?? 0}
          sub="Active connections" icon={Users} iconColor="blue" loading={isLoading} />
        <StatCard title="Pending Invitations" value={data?.pendingInvitations ?? 0}
          sub="Awaiting acceptance" icon={Link2} iconColor="amber" loading={isLoading} />
        <StatCard title="Tests Created" value={data?.testsCreated ?? 0}
          sub={`${data?.testsCompleted ?? 0} completed`} icon={ClipboardList} iconColor="teal" loading={isLoading} />
        <StatCard title="Avg Score" value={data?.avgScore != null ? `${Number(data.avgScore).toFixed(1)}%` : '—'}
          sub="Across all tests" icon={Award} iconColor="green" loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {quickLinks.map(({ label, path, icon: Icon }) => (
              <Link key={path} to={path}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-teal-50 dark:bg-teal-900/20 rounded-md flex items-center justify-center">
                    <Icon size={14} className="text-teal-600 dark:text-teal-400" />
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                </div>
                <ChevronRight size={14} className="text-gray-400" />
              </Link>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Getting Started</h3>
          <div className="space-y-3">
            {[
              { step: '1', title: 'Create an invitation', desc: 'Go to Invitations and generate a code or link to share with students.' },
              { step: '2', title: 'Wait for student to join', desc: 'Students accept your invitation from their account.' },
              { step: '3', title: 'Create and assign tests', desc: 'Build assessments and assign them to individual students or cohorts.' },
              { step: '4', title: 'Review and give feedback', desc: 'View student journal entries and provide structured feedback.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-3">
                <div className="w-6 h-6 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-teal-700 dark:text-teal-400">{step}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
