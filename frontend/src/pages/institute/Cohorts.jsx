import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, ChevronDown, ChevronRight, Trash2, Link2 } from 'lucide-react';
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
        <p className="text-sm text-gray-500 dark:text-gray-400">
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
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{cohort.name}</h3>
                    <span className="badge-blue text-xs">{cohort._count?.members ?? 0} students</span>
                  </div>
                  {cohort.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{cohort.description}</p>
                  )}
                  {cohort.invitations?.[0] && (
                    <div className="flex items-center gap-1 mt-1">
                      <Link2 size={11} className="text-gray-400" />
                      <code className="text-xs font-mono text-teal-600 dark:text-teal-400">
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
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
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
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['cohort-members', cohortId],
    queryFn: () => cohortsApi.members(cohortId).then(r => r.data.data),
  });

  if (isLoading) return <div className="px-4 pb-4"><LoadingSpinner /></div>;

  if (members.length === 0) {
    return (
      <div className="px-4 pb-4 text-xs text-gray-500 dark:text-gray-400">
        No members yet. Share the invitation code to enrol students.
      </div>
    );
  }

  return (
    <div className="border-t border-gray-100 dark:border-gray-700 px-4 pb-4 pt-3">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Members</p>
      <div className="space-y-2">
        {members.map(m => (
          <div key={m.id} className="flex items-center gap-3">
            <div className="w-7 h-7 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center text-xs font-medium text-teal-700 dark:text-teal-400">
              {(m.user?.profile?.firstName?.[0] ?? m.user?.email?.[0] ?? '?').toUpperCase()}
            </div>
            <div>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {m.user?.profile ? `${m.user.profile.firstName} ${m.user.profile.lastName}` : m.user?.email}
              </p>
              <p className="text-xs text-gray-400">{m.user?.role}</p>
            </div>
          </div>
        ))}
      </div>
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
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input type="checkbox" checked={createInvite} onChange={e => setCreateInvite(e.target.checked)}
            className="w-4 h-4 text-teal-600 rounded border-gray-300" />
          Auto-generate invitation link for this cohort
        </label>
        {createMutation.error && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {createMutation.error?.response?.data?.message ?? 'Failed to create cohort.'}
          </p>
        )}
      </div>
    </Modal>
  );
}
