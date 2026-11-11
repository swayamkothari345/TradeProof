import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Copy, Check, Users } from 'lucide-react';
import { connectionsApi } from '../../services/api.js';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Empty from '../../components/ui/Empty.jsx';
import { formatDateTime } from '../../utils/format.js';

export default function MentorInvitations() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [copied, setCopied] = useState('');
  const [form, setForm] = useState({ maxUses: 1, expiresAt: '' });

  const { data: invitations } = useQuery({
    queryKey: ['invitations'],
    queryFn: () => connectionsApi.getInvitations().then(r => r.data.data),
  });

  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: () => connectionsApi.list().then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => connectionsApi.createInvitation(data),
    onSuccess: () => { qc.invalidateQueries(['invitations']); setShowCreate(false); setForm({ maxUses: 1, expiresAt: '' }); },
  });

  const revokeMutation = useMutation({
    mutationFn: (id) => connectionsApi.revoke(id),
    onSuccess: () => { qc.invalidateQueries(['connections']); },
  });

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(''), 2000);
  };

  const statusBadge = {
    PENDING: 'badge-amber',
    ACCEPTED: 'badge-green',
    REJECTED: 'badge-red',
    REVOKED: 'badge-gray',
    EXPIRED: 'badge-gray',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Generate invitation codes to share with students. Students enter the code from their account.
        </p>
        <Button icon={Plus} onClick={() => setShowCreate(true)}>Create Invitation</Button>
      </div>

      {/* Connected students */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <Users size={15} />Active Connections ({connections?.length ?? 0})
        </h3>
        {connections?.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Student</th><th>Email</th><th>Connected</th><th></th></tr></thead>
              <tbody>
                {connections.map(c => (
                  <tr key={c.id}>
                    <td className="font-medium">
                      {c.student?.profile?.firstName} {c.student?.profile?.lastName}
                    </td>
                    <td className="text-gray-500">{c.student?.email}</td>
                    <td className="text-xs text-gray-400">{formatDateTime(c.connectedAt)}</td>
                    <td>
                      <button onClick={() => revokeMutation.mutate(c.id)}
                        className="text-xs text-red-500 hover:text-red-600 hover:underline">Revoke</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-4 text-center">No active connections yet</p>
        )}
      </div>

      {/* Invitations */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Invitations</h3>
        {invitations?.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Code</th><th>Status</th><th>Uses</th><th>Expires</th><th>Created</th><th></th></tr></thead>
              <tbody>
                {invitations.map(inv => (
                  <tr key={inv.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                          {inv.code}
                        </code>
                        <button onClick={() => copyCode(inv.code)}
                          className="p-1 text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                          {copied === inv.code ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </td>
                    <td><span className={statusBadge[inv.status] ?? 'badge-gray'}>{inv.status}</span></td>
                    <td className="text-sm">{inv.usedCount} / {inv.maxUses}</td>
                    <td className="text-xs text-gray-400">{inv.expiresAt ? formatDateTime(inv.expiresAt) : 'Never'}</td>
                    <td className="text-xs text-gray-400">{formatDateTime(inv.createdAt)}</td>
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No invitations" message="Create an invitation to share with your students."
            action={<Button icon={Plus} onClick={() => setShowCreate(true)}>Create Invitation</Button>} />
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Invitation" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button loading={createMutation.isPending} onClick={() => createMutation.mutate({
              maxUses: Number(form.maxUses),
              expiresAt: form.expiresAt || undefined,
            })}>Create</Button>
          </>
        }>
        <div className="space-y-4">
          <div>
            <label className="label">Maximum Uses</label>
            <input type="number" min="1" max="100" className="input" value={form.maxUses}
              onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} />
            <p className="mt-1 text-xs text-gray-400">How many students can use this code</p>
          </div>
          <div>
            <label className="label">Expiry Date (optional)</label>
            <input type="datetime-local" className="input" value={form.expiresAt}
              onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
          </div>
          {createMutation.error && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {createMutation.error?.response?.data?.message || 'Failed to create invitation.'}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
