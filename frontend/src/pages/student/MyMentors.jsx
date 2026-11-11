import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, UserX, Link } from 'lucide-react';
import { connectionsApi } from '../../services/api.js';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { ConfirmModal } from '../../components/ui/Modal.jsx';
import Empty from '../../components/ui/Empty.jsx';
import { formatDateTime } from '../../utils/format.js';

export default function MyMentors() {
  const qc = useQueryClient();
  const [showJoin, setShowJoin] = useState(false);
  const [revokeId, setRevokeId] = useState(null);
  const [code, setCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const { data: connections, isLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: () => connectionsApi.list().then(r => r.data.data),
  });

  const acceptMutation = useMutation({
    mutationFn: (code) => connectionsApi.accept(code),
    onSuccess: () => { qc.invalidateQueries(['connections']); setShowJoin(false); setCode(''); setJoinError(''); },
    onError: (err) => setJoinError(err?.response?.data?.message || 'Invalid or expired invitation code.'),
  });

  const revokeMutation = useMutation({
    mutationFn: (id) => connectionsApi.revoke(id),
    onSuccess: () => { qc.invalidateQueries(['connections']); setRevokeId(null); },
  });

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Mentors you are connected to can view your permitted journal entries and rule findings.
        </p>
        <Button icon={Link} onClick={() => setShowJoin(true)}>Join a Mentor</Button>
      </div>

      {isLoading ? null : !connections?.length ? (
        <Empty title="No mentors connected"
          message="Enter an invitation code from your mentor to connect. All access is consent-based."
          action={<Button icon={Link} onClick={() => setShowJoin(true)}>Join a Mentor</Button>} />
      ) : (
        <div className="space-y-3">
          {connections.map(c => (
            <div key={c.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                      {c.mentor?.profile?.firstName?.[0]}{c.mentor?.profile?.lastName?.[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {c.mentor?.profile?.firstName} {c.mentor?.profile?.lastName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{c.mentor?.email}</p>
                    {c.mentor?.mentorProfile?.specialisation && (
                      <p className="text-xs text-teal-600 dark:text-teal-400 mt-0.5">{c.mentor.mentorProfile.specialisation}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="badge-green">Active</span>
                  <p className="text-xs text-gray-400 mt-1">Since {formatDateTime(c.connectedAt)}</p>
                  <button onClick={() => setRevokeId(c.id)}
                    className="mt-2 text-xs text-red-500 hover:text-red-600 hover:underline flex items-center gap-1">
                    <UserX size={12} />Revoke access
                  </button>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500">Permitted access: Journal entries, Rule findings</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showJoin} onClose={() => { setShowJoin(false); setCode(''); setJoinError(''); }}
        title="Join a Mentor" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowJoin(false); setCode(''); setJoinError(''); }}>Cancel</Button>
            <Button loading={acceptMutation.isPending} disabled={!code.trim()}
              onClick={() => acceptMutation.mutate(code.trim().toUpperCase())}>
              Join
            </Button>
          </>
        }>
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Enter the invitation code your mentor shared with you.
          </p>
          <div>
            <label className="label">Invitation Code</label>
            <input className="input font-mono uppercase tracking-widest" placeholder="e.g. AB12CD"
              value={code} onChange={e => setCode(e.target.value.toUpperCase())} />
          </div>
          {joinError && <p className="text-sm text-red-600 dark:text-red-400">{joinError}</p>}
          <p className="text-xs text-gray-400">
            By joining, you consent to your mentor viewing your trading journal and rule findings.
          </p>
        </div>
      </Modal>

      <ConfirmModal open={!!revokeId} onClose={() => setRevokeId(null)}
        onConfirm={() => revokeMutation.mutate(revokeId)}
        title="Revoke Mentor Access"
        message="Your mentor will no longer be able to view your trading records. You can re-connect using a new invitation code."
        confirmLabel="Revoke Access" danger loading={revokeMutation.isPending} />
    </div>
  );
}
