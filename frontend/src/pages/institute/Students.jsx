import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, GraduationCap } from 'lucide-react';
import { cohortsApi } from '../../services/api.js';
import Empty from '../../components/ui/Empty.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import { formatDateTime } from '../../utils/format.js';

export default function InstituteStudents() {
  const [search, setSearch] = useState('');

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['institute-students'],
    queryFn: () => cohortsApi.students().then(r => r.data.data),
  });

  if (isLoading) return <LoadingSpinner />;

  // Only show student/trader connections (MENTOR connections are teachers on the Mentors page)
  const students = connections.filter(c => ['STUDENT', 'TRADER'].includes(c.student?.role));

  const filtered = students.filter(c => {
    if (!search.trim()) return true;
    const name = `${c.student?.profile?.firstName ?? ''} ${c.student?.profile?.lastName ?? ''} ${c.student?.email ?? ''}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          All students enrolled in your institute.
        </p>
        <span className="badge-blue">{students.length} total</span>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <Empty
          title={search ? 'No matching students' : 'No students yet'}
          message={search ? 'Try a different search term.' : 'Share cohort invitation codes to enrol students.'}
        />
      ) : (
        <div className="grid gap-2">
          {filtered.map(c => {
            const student = c.student;
            const name = student?.profile
              ? `${student.profile.firstName} ${student.profile.lastName}`
              : student?.email ?? 'Unknown';
            const initials = (student?.profile?.firstName?.[0] ?? student?.email?.[0] ?? '?').toUpperCase();

            return (
              <div key={c.id} className="card p-4 flex items-center gap-4">
                <div className="w-9 h-9 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center text-sm font-semibold text-teal-700 dark:text-teal-400 flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{student?.email}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="badge-green text-xs">Active</span>
                  <p className="text-xs text-gray-400 mt-1">Joined {formatDateTime(c.connectedAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
