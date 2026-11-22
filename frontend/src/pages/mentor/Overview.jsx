import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, ClipboardList, AlertTriangle, Link2, Award, ChevronRight } from 'lucide-react';
import { analyticsApi } from '../../services/api.js';
import StatCard from '../../components/ui/StatCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const quickLinks = [
  { label: 'View Students',     path: '/mentor/students',    icon: Users        },
  { label: 'Create Invitation', path: '/mentor/invitations', icon: Link2        },
  { label: 'Create Test',       path: '/mentor/tests',       icon: ClipboardList },
  { label: 'Review Disputes',   path: '/mentor/disputes',    icon: AlertTriangle },
];

const steps = [
  { step: '1', title: 'Create an invitation',         desc: 'Go to Invitations and generate a code or link to share with students.' },
  { step: '2', title: 'Wait for student to join',     desc: 'Students accept your invitation from their account.' },
  { step: '3', title: 'Create and assign tests',      desc: 'Build assessments and assign them to individual students or cohorts.' },
  { step: '4', title: 'Review and give feedback',     desc: 'View student journal entries and provide structured feedback.' },
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
          style={{ backgroundColor: 'var(--warn-bg)', color: 'var(--warn)' }}>
          <Icon size={13} />
        </div>
        <span className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>{label}</span>
      </div>
      <ChevronRight size={13} style={{ color: 'var(--text-3)' }} />
    </Link>
  );
}

export default function MentorOverview() {
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
            Welcome back, {user?.profile?.firstName || 'Mentor'}
          </h2>
          <p className="mt-0.5 text-[13px]" style={{ color: 'var(--text-3)' }}>Your mentoring dashboard</p>
        </div>
        <span className="badge-amber">Mentor</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Students"      value={data?.totalStudents ?? 0}
          sub="Active connections" icon={Users} iconColor="blue" loading={isLoading} />
        <StatCard title="Pending Invitations" value={data?.pendingInvitations ?? 0}
          sub="Awaiting acceptance" icon={Link2} iconColor="amber" loading={isLoading} />
        <StatCard title="Tests Created"       value={data?.testsCreated ?? 0}
          sub={`${data?.testsCompleted ?? 0} completed`} icon={ClipboardList} iconColor="teal" loading={isLoading} />
        <StatCard title="Avg Score"           value={data?.avgScore != null ? `${Number(data.avgScore).toFixed(1)}%` : '—'}
          sub="Across all tests" icon={Award} iconColor="green" loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="section-title mb-3">Quick Actions</h3>
          <div className="space-y-0.5">
            {quickLinks.map(ql => <QuickLink key={ql.path} {...ql} />)}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="section-title mb-4">Getting Started</h3>
          <div className="space-y-4">
            {steps.map(({ step, title, desc }) => (
              <div key={step} className="flex gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px] font-bold"
                  style={{ backgroundColor: 'var(--warn-bg)', color: 'var(--warn)' }}
                >
                  {step}
                </div>
                <div>
                  <p className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>{title}</p>
                  <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-3)' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
