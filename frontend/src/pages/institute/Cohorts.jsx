import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, ChevronDown, ChevronRight, Trash2, Link2, UserPlus, X } from 'lucide-react';
import { cohortsApi, connectionsApi } from '../../services/api.js';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Empty from '../../components/ui/Empty.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';

export default function InstituteCohorts() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const { data: cohorts = [], isLoading } = useQuery({
    queryKey: ['institute-cohorts'],
    queryFn: () => cohortsApi.list().then(r => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => cohortsApi.delete(id),
    onSuccess: () => qc.invalidateQueries(['institute-cohorts']),
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--text-2)' }}>
          Organise students into cohorts. Each cohort can have its own invitation link and test assignments.
        </p>
        <Button icon={Plus} onClick={() => setShowCreate(true)}>New Cohort</Button>
      </div>

      {cohorts.length === 0 ? (
        <Empty title="No cohorts yet" message="Create a cohort to organise your students into groups." />
      ) : (
        <div className="space-y-3">
          {cohorts.map(cohort => (
            <div key={cohort.id} className="card">
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold" style={{ color: 'var(--text)' }}>{cohort.name}</h3>
                    <span className="badge-blue text-xs">{cohort._count?.members ?? 0} students</span>
                  </div>
                  {cohort.description && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{cohort.description}</p>
                  )}
                  {cohort.invitations?.[0] && (
                    <div className="flex items-center gap-1 mt-1">
                      <Link2 size={11} className="text-gray-400" />
                      <code className="text-xs font-mono" style={{ color: 'var(--accent)' }}>
                        {cohort.invitations[0].code}
                      </code>
                      <span className="text-xs text-gray-400">
                        ({cohort.invitations[0].usedCount}/{cohort.invitations[0].maxUses} used)
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExpanded(expanded === cohort.id ? null : cohort.id)}
                    className="p-1.5 transition-colors"
                    style={{ color: 'var(--text-3)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                    title="View members">
                    {expanded === cohort.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <button
                    onClick={() => { if (confirm(`Archive cohort "${cohort.name}"?`)) deleteMutation.mutate(cohort.id); }}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    title="Archive cohort">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {expanded === cohort.id && (
                <CohortMembers cohortId={cohort.id} />
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateCohortModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function CohortMembers({ cohortId }) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['cohort-members', cohortId],
    queryFn: () => cohortsApi.members(cohortId).then(r => r.data.data),
  });

  const { data: allStudents = [] } = useQuery({
    queryKey: ['institute-students'],
    queryFn: () => cohortsApi.students().then(r => r.data.data),
  });

  const addMutation = useMutation({
    mutationFn: (studentId) => cohortsApi.addMember(cohortId, studentId),
    onSuccess: () => { qc.invalidateQueries(['cohort-members', cohortId]); qc.invalidateQueries(['institute-cohorts']); setAddOpen(false); },
  });

  const removeMutation = useMutation({
    mutationFn: (studentId) => cohortsApi.removeMember(cohortId, studentId),
    onSuccess: () => { qc.invalidateQueries(['cohort-members', cohortId]); qc.invalidateQueries(['institute-cohorts']); },
  });

  const memberIds = new Set(members.map(m => m.userId));
  const eligibleStudents = allStudents.filter(s => !memberIds.has(s.student?.id ?? s.studentId));

  if (isLoading) return <div className="px-4 pb-4"><LoadingSpinner /></div>;

  return (
    <div className="px-4 pb-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
          Members ({members.length})
        </p>
        <button
          onClick={() => setAddOpen(!addOpen)}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors"
          style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-subtle)' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-raised)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--accent-subtle)'}
        >
          <UserPlus size={12} /> Add student
        </button>
      </div>

      {addOpen && (
        <div className="mb-3 p-3 rounded-lg space-y-1.5" style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
          {eligibleStudents.length === 0 ? (
            <p className="text-xs text-center py-2" style={{ color: 'var(--text-3)' }}>
              All connected students are already in this cohort.
            </p>
          ) : (
            eligibleStudents.map(s => {
              const student = s.student ?? s;
              const name = student.profile
                ? `${student.profile.firstName} ${student.profile.lastName}`
                : student.email;
              return (
                <button
                  key={student.id}
                  onClick={() => addMutation.mutate(student.id)}
                  disabled={addMutation.isPending}
                  className="w-full flex items-center gap-3 px-2 py-1.5 rounded-md text-left transition-colors disabled:opacity-50"
                  style={{ color: 'var(--text-2)' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-sunken)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
                    style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                    {(student.profile?.firstName?.[0] ?? student.email?.[0] ?? '?').toUpperCase()}
                  </div>
                  <span className="text-xs">{name}</span>
                </button>
              );
            })
          )}
        </div>
      )}

      {members.length === 0 ? (
        <p className="text-xs py-2" style={{ color: 'var(--text-3)' }}>
          No members yet. Share the invitation code or add students above.
        </p>
      ) : (
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3 group">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
                style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                {(m.user?.profile?.firstName?.[0] ?? m.user?.email?.[0] ?? '?').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{ color: 'var(--text)' }}>
                  {m.user?.profile ? `${m.user.profile.firstName} ${m.user.profile.lastName}` : m.user?.email}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>{m.user?.role}</p>
              </div>
              <button
                onClick={() => removeMutation.mutate(m.userId)}
                disabled={removeMutation.isPending}
                className="hidden group-hover:flex items-center justify-center w-6 h-6 rounded transition-colors"
                style={{ color: 'var(--text-3)' }}
                title="Remove from cohort"
                onMouseEnter={e => e.currentTarget.style.color = 'var(--neg)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateCohortModal({ onClose }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [createInvite, setCreateInvite] = useState(true);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const cohort = await cohortsApi.create(data).then(r => r.data.data);
      if (createInvite) {
        // Create an invitation linked to this cohort
        await connectionsApi.createInvitation({ cohortId: cohort.id, maxUses: 50 });
      }
      return cohort;
    },
    onSuccess: () => { qc.invalidateQueries(['institute-cohorts']); onClose(); },
  });

  return (
    <Modal open onClose={onClose} title="New Cohort"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={createMutation.isPending}
            disabled={!name.trim()}
            onClick={() => createMutation.mutate({ name, description })}>
            Create
          </Button>
        </>
      }>
      <div className="space-y-4">
        <div>
          <label className="label">Cohort Name *</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Batch 2025 — Foundation" />
        </div>
        <div>
          <label className="label">Description</label>
          <input className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description…" />
        </div>
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
          <input type="checkbox" checked={createInvite} onChange={e => setCreateInvite(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300" style={{ accentColor: 'var(--accent)' }} />
          Auto-generate invitation link for this cohort
        </label>
        {createMutation.error && (
          <p className="text-sm" style={{ color: 'var(--neg)' }}>
            {createMutation.error?.response?.data?.message ?? 'Failed to create cohort.'}
          </p>
        )}
      </div>
    </Modal>
  );
}
