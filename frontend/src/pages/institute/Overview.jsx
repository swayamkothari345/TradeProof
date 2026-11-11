import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, GraduationCap, Building2, ClipboardList, ChevronRight } from 'lucide-react';
import { analyticsApi } from '../../services/api.js';
import StatCard from '../../components/ui/StatCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function InstituteOverview() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.dashboard().then(r => r.data.data),
  });

  const quickLinks = [
    { label: 'Manage Mentors', path: '/institute/mentors', icon: Users },
    { label: 'Manage Students', path: '/institute/students', icon: GraduationCap },
    { label: 'Manage Cohorts', path: '/institute/cohorts', icon: Building2 },
    { label: 'Assessments', path: '/institute/assessments', icon: ClipboardList },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Welcome back, {user?.profile?.firstName}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Institute management dashboard</p>
        </div>
        <span className="badge-gray text-xs">Institute</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Students" value={data?.totalStudents ?? 0} icon={GraduationCap} iconColor="blue" loading={isLoading} />
        <StatCard title="Pending Invitations" value={data?.pendingInvitations ?? 0} icon={Users} iconColor="amber" loading={isLoading} />
        <StatCard title="Tests Created" value={data?.testsCreated ?? 0} icon={ClipboardList} iconColor="teal" loading={isLoading} />
        <StatCard title="Tests Completed" value={data?.testsCompleted ?? 0} icon={ClipboardList} iconColor="green" loading={isLoading} />
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
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
    </div>
  );
}
