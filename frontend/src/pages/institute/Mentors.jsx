import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Copy, Check, UserCheck } from 'lucide-react';
import { cohortsApi, connectionsApi } from '../../services/api.js';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Empty from '../../components/ui/Empty.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import { formatDateTime } from '../../utils/format.js';

export default function InstituteMentors() {
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState('');
  const [inviteForm, setInviteForm] = useState({ maxUses: 5, expiresAt: '' });

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['institute-students'],
    queryFn: () => cohortsApi.students().then(r => r.data.data),
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ['invitations'],
    queryFn: () => connectionsApi.getInvitations().then(r => r.data.data),
  });

  const createInviteMutation = useMutation({
    mutationFn: (data) => connectionsApi.createInvitation(data),
    onSuccess: () => { qc.invalidateQueries(['invitations']); setShowInvite(false); },
  });

  // Teachers are MENTOR-role users who accepted an institute invitation
  const teachers = connections.filter(c => c.student?.role === 'MENTOR');

  // Invitations with no cohortId are for open/teacher use
  const openInvitations = invitations.filter(inv => !inv.cohortId && inv.status !== 'REVOKED');

  const copy = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(''), 2000);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--text-2)' }}>
          Manage teacher accounts connected to your institute. Share a Teacher Invite code with MENTOR-role users to link them.
        </p>
        <Button icon={Plus} onClick={() => setShowInvite(true)}>Teacher Invite</Button>
      </div>

      {/* Open invitation codes */}
      {openInvitations.length > 0 && (
        <div className="card p-4 space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Active Teacher Invitations</h4>
          {openInvitations.map(inv => (
            <div key={inv.id} className="flex items-center justify-between gap-4 py-1.5 last:border-0"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <code className="text-sm font-mono" style={{ color: 'var(--accent)' }}>{inv.code}</code>
                <span className="text-xs text-gray-400 ml-3">{inv.usedCount}/{inv.maxUses} used</span>
                {inv.expiresAt && <span className="text-xs ml-2" style={{ color: 'var(--warn)' }}>Expires {formatDateTime(inv.expiresAt)}</span>}
              </div>
              <button onClick={() => copy(inv.code)}
                className="p-1.5 text-gray-400 transition-colors" style={{ color: 'var(--text-3)' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'} title="Copy code">
                {copied === inv.code ? <Check size={14} style={{ color: 'var(--pos)' }} /> : <Copy size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Teacher list */}
      {teachers.length === 0 ? (
        <Empty
          title="No teachers connected"
          message="Create a Teacher Invite code and share it with your MENTOR-role teachers."
        />
      ) : (
        <div className="grid gap-2">
          {teachers.map(c => {
            const t = c.student;
            const name = t?.profile ? `${t.profile.firstName} ${t.profile.lastName}` : t?.email ?? 'Unknown';
            const initials = (t?.profile?.firstName?.[0] ?? t?.email?.[0] ?? '?').toUpperCase();
            return (
              <div key={c.id} className="card p-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                  style={{ backgroundColor: 'var(--info-bg)', color: 'var(--info)' }}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" style={{ color: 'var(--text)' }}>{name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{t?.email}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="badge-blue text-xs flex items-center gap-1"><UserCheck size={11} /> Teacher</span>
                  <p className="text-xs text-gray-400 mt-1">Since {formatDateTime(c.connectedAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showInvite && (
        <Modal open onClose={() => setShowInvite(false)} title="Create Teacher Invite"
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowInvite(false)}>Cancel</Button>
              <Button loading={createInviteMutation.isPending}
                onClick={() => createInviteMutation.mutate({ maxUses: Number(inviteForm.maxUses), expiresAt: inviteForm.expiresAt || null })}>
                Generate Code
              </Button>
            </>
          }>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>
              Share this code with MENTOR-role teachers. When they accept, they appear in your Teachers list.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Max Uses</label>
                <input type="number" min="1" className="input" value={inviteForm.maxUses}
                  onChange={e => setInviteForm(f => ({ ...f, maxUses: e.target.value }))} />
              </div>
              <div>
                <label className="label">Expires (optional)</label>
                <input type="datetime-local" className="input" value={inviteForm.expiresAt}
                  onChange={e => setInviteForm(f => ({ ...f, expiresAt: e.target.value }))} />
              </div>
            </div>
            {createInviteMutation.error && (
              <p className="text-sm" style={{ color: 'var(--neg)' }}>
                {createInviteMutation.error?.response?.data?.message ?? 'Failed to create invite.'}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
