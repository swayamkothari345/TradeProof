import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, GraduationCap, Building2, ClipboardList, ChevronRight, TrendingUp } from 'lucide-react';
import { analyticsApi } from '../../services/api.js';
import StatCard from '../../components/ui/StatCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const quickLinks = [
  { label: 'Manage Mentors',  path: '/institute/mentors',      icon: Users         },
  { label: 'Manage Students', path: '/institute/students',     icon: GraduationCap },
  { label: 'Manage Cohorts',  path: '/institute/cohorts',      icon: Building2     },
  { label: 'Assessments',     path: '/institute/assessments',  icon: ClipboardList },
];

function QuickLink({ label, path, icon: Icon }) {
  return (
    <Link
      to={path}
      className="flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-100"
      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-raised)'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--badge-purple-bg)', color: 'var(--badge-purple-color)' }}>
          <Icon size={13} />
        </div>
        <span className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>{label}</span>
      </div>
      <ChevronRight size={13} style={{ color: 'var(--text-3)' }} />
    </Link>
  );
}

export default function InstituteOverview() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.dashboard().then(r => r.data.data),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[18px] font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
            Welcome back, {user?.profile?.firstName || 'Admin'}
          </h2>
          <p className="mt-0.5 text-[13px]" style={{ color: 'var(--text-3)' }}>Institute management dashboard</p>
        </div>
        <span className="badge-purple">Institute</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Students"      value={data?.totalStudents ?? 0}
          icon={GraduationCap} iconColor="blue"   loading={isLoading} />
        <StatCard title="Pending Invitations" value={data?.pendingInvitations ?? 0}
          icon={Users}         iconColor="amber"  loading={isLoading} />
        <StatCard title="Tests Created"       value={data?.testsCreated ?? 0}
          icon={ClipboardList} iconColor="teal"   loading={isLoading} />
        <StatCard title="Tests Completed"     value={data?.testsCompleted ?? 0}
          icon={TrendingUp}    iconColor="green"  loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="section-title mb-3">Quick Actions</h3>
          <div className="space-y-0.5">
            {quickLinks.map(ql => <QuickLink key={ql.path} {...ql} />)}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="section-title mb-4">Platform Overview</h3>
          <div className="space-y-3">
            {[
              { label: 'Students enrolled',     val: data?.totalStudents ?? 0,      color: 'var(--accent)'  },
              { label: 'Tests in platform',      val: data?.testsCreated ?? 0,       color: 'var(--info)'    },
              { label: 'Completed attempts',     val: data?.testsCompleted ?? 0,     color: 'var(--pos)'     },
              { label: 'Pending invitations',    val: data?.pendingInvitations ?? 0, color: 'var(--warn)'    },
            ].map(({ label, val, color }) => (
              <div key={label} className="flex items-center justify-between py-2"
                style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-[13px]" style={{ color: 'var(--text-2)' }}>{label}</span>
                <span className="text-[14px] font-semibold tabular-nums" style={{ color }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
