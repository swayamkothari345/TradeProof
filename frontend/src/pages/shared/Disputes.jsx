import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, MessageSquare } from 'lucide-react';
import { rulesApi } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Empty from '../../components/ui/Empty.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import { formatDateTime } from '../../utils/format.js';

const statusBadge = { OPEN: 'badge-amber', ACCEPTED: 'badge-green', REJECTED: 'badge-red' };
const findingBadge = { PASSED: 'badge-green', VIOLATION: 'badge-red', INSUFFICIENT_DATA: 'badge-amber' };

export default function Disputes() {
  const { user } = useAuth();
  const isMentor = ['MENTOR', 'INSTITUTE'].includes(user?.role);
  const qc = useQueryClient();

  const [disputeModal, setDisputeModal] = useState(null); // { findingId }
  const [resolveModal, setResolveModal] = useState(null); // { disputeId }
  const [form, setForm] = useState({ reason: '', evidence: '' });
  const [resolveForm, setResolveForm] = useState({ status: 'ACCEPTED', resolution: '' });

  const { data: disputes, isLoading: loadingDisputes } = useQuery({
    queryKey: ['disputes'],
    queryFn: () => rulesApi.disputes().then(r => r.data.data),
  });

  const { data: findings, isLoading: loadingFindings } = useQuery({
    queryKey: ['findings'],
    queryFn: () => rulesApi.findings().then(r => r.data.data),
    enabled: !isMentor,
  });

  const submitMutation = useMutation({
    mutationFn: ({ findingId, data }) => rulesApi.dispute(findingId, data),
    onSuccess: () => {
      qc.invalidateQueries(['disputes']);
      setDisputeModal(null);
      setForm({ reason: '', evidence: '' });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({ disputeId, data }) => rulesApi.resolveDispute(disputeId, data),
    onSuccess: () => { qc.invalidateQueries(['disputes']); setResolveModal(null); setResolveForm({ status: 'ACCEPTED', resolution: '' }); },
  });

  if (loadingDisputes || loadingFindings) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {!isMentor && (
        <>
          <div>
            <h3 className="section-title mb-3">Rule Findings</h3>
            <p className="text-xs mb-3" style={{ color: 'var(--text-3)' }}>
              If you believe a finding is incorrect, you can submit a dispute. The original finding is always preserved in the audit trail.
            </p>
            {!findings?.length ? (
              <Empty title="No findings" message="Run rule evaluation on your journal entries to see findings here." />
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead><tr><th>Rule</th><th>Status</th><th>Explanation</th><th>Date</th><th></th></tr></thead>
                  <tbody>
                    {findings.map(f => (
                      <tr key={f.id}>
                        <td className="font-medium">{f.ruleVersion?.rule?.name}</td>
                        <td><span className={findingBadge[f.status] ?? 'badge-gray'}>{f.status.replace(/_/g, ' ')}</span></td>
                        <td className="max-w-xs text-xs text-gray-500 truncate">{f.explanation}</td>
                        <td className="text-xs text-gray-400">{formatDateTime(f.evaluatedAt)}</td>
                        <td>
                          {f.status === 'VIOLATION' && !f.disputes?.some(d => d.status === 'OPEN') && (
                            <Button size="xs" variant="secondary" icon={MessageSquare}
                              onClick={() => setDisputeModal({ findingId: f.id })}>
                              Dispute
                            </Button>
                          )}
                          {f.disputes?.some(d => d.status === 'OPEN') && (
                            <span className="badge-amber text-xs">Dispute pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <div>
        <h3 className="section-title mb-3">
          {isMentor ? 'Student Disputes to Review' : 'My Disputes'}
        </h3>
        {!disputes?.length ? (
          <Empty title="No disputes" message={isMentor ? 'No open disputes from students.' : 'You have not submitted any disputes.'} />
        ) : (
          <div className="space-y-3">
            {disputes.map(d => (
              <div key={d.id} className="card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={statusBadge[d.status] ?? 'badge-gray'}>{d.status}</span>
                      <span className="text-xs text-gray-500">{d.finding?.ruleVersion?.rule?.name}</span>
                      <span className={findingBadge[d.finding?.status] ?? 'badge-gray'}>{d.finding?.status?.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}><strong>Reason:</strong> {d.reason}</p>
                    {d.evidence && <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}><strong>Evidence:</strong> {d.evidence}</p>}
                    {d.resolution && (
                      <div className="mt-2 p-2 rounded text-xs" style={{ backgroundColor: 'var(--bg-raised)' }}>
                        <strong>Resolution:</strong> {d.resolution}
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2">{formatDateTime(d.createdAt)}</p>
                  </div>
                  {isMentor && d.status === 'OPEN' && (
                    <Button size="xs" onClick={() => setResolveModal({ disputeId: d.id })}>Review</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit dispute modal */}
      <Modal open={!!disputeModal} onClose={() => { setDisputeModal(null); setForm({ reason: '', evidence: '' }); }}
        title="Submit Dispute" size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDisputeModal(null)}>Cancel</Button>
            <Button loading={submitMutation.isPending} disabled={!form.reason.trim()}
              onClick={() => submitMutation.mutate({ findingId: disputeModal.findingId, data: form })}>
              Submit Dispute
            </Button>
          </>
        }>
        <div className="space-y-3">
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            Explain why you believe this finding is incorrect. The original finding will be preserved. Your mentor will review and resolve.
          </p>
          <div>
            <label className="label">Reason *</label>
            <textarea className="input" rows={3} placeholder="Explain your dispute..."
              value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
          </div>
          <div>
            <label className="label">Supporting Evidence (optional)</label>
            <textarea className="input" rows={2} placeholder="Any additional context or evidence..."
              value={form.evidence} onChange={e => setForm(f => ({ ...f, evidence: e.target.value }))} />
          </div>
          {submitMutation.error && (
            <p className="text-xs" style={{ color: 'var(--neg)' }}>{submitMutation.error?.response?.data?.message}</p>
          )}
        </div>
      </Modal>

      {/* Resolve dispute modal */}
      <Modal open={!!resolveModal} onClose={() => setResolveModal(null)} title="Resolve Dispute" size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResolveModal(null)}>Cancel</Button>
            <Button loading={resolveMutation.isPending}
              onClick={() => resolveMutation.mutate({ disputeId: resolveModal.disputeId, data: resolveForm })}>
              Save Resolution
            </Button>
          </>
        }>
        <div className="space-y-4">
          <div>
            <label className="label">Decision</label>
            <div className="flex gap-3">
              {['ACCEPTED', 'REJECTED'].map(s => (
                <button key={s} type="button" onClick={() => setResolveForm(f => ({ ...f, status: s }))}
                  className="flex-1 py-2 text-sm font-semibold rounded-lg transition-colors"
                  style={{
                    border: resolveForm.status === s
                      ? `2px solid ${s === 'ACCEPTED' ? 'var(--pos)' : 'var(--neg)'}`
                      : '2px solid var(--border)',
                    backgroundColor: resolveForm.status === s
                      ? s === 'ACCEPTED' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)'
                      : 'transparent',
                    color: resolveForm.status === s
                      ? s === 'ACCEPTED' ? 'var(--pos)' : 'var(--neg)'
                      : 'var(--text-3)',
                  }}>
                  {s === 'ACCEPTED' ? 'Accept Dispute' : 'Reject Dispute'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Resolution Note</label>
            <textarea className="input" rows={3} placeholder="Explain your decision..."
              value={resolveForm.resolution} onChange={e => setResolveForm(f => ({ ...f, resolution: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
