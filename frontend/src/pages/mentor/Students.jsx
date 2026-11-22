import React, { useEffect, useState } from 'react';
import { connectionsApi, feedbackApi } from '../../services/api.js';
import { formatDateTime } from '../../utils/format.js';
import Empty from '../../components/ui/Empty.jsx';
import Button from '../../components/ui/Button.jsx';

export default function MentorStudents() {
  const [conns, setConns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    connectionsApi.list()
      .then(r => setConns(r.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-gray-400">Loading...</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: 'var(--text-2)' }}>
        Students you are connected to. All access is consent-based.
      </p>
      {!conns.length ? (
        <Empty title="No students connected" message="Share an invitation code from the Invitations page." />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Email</th>
                <th>Connected</th>
                <th>Permissions</th>
              </tr>
            </thead>
            <tbody>
              {conns.map(c => (
                <tr key={c.id}>
                  <td className="font-medium">
                    {c.student?.profile?.firstName} {c.student?.profile?.lastName}
                  </td>
                  <td className="text-gray-500 text-sm">{c.student?.email}</td>
                  <td className="text-xs text-gray-400">{formatDateTime(c.connectedAt)}</td>
                  <td className="text-xs text-gray-500">
                    {c.permissions?.viewJournal && <span className="badge-blue mr-1">Journal</span>}
                    {c.permissions?.viewFindings && <span className="badge-amber mr-1">Findings</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function MentorFeedbackPage() {
  const [form, setForm] = useState({ studentId: '', content: '', feedbackType: 'GENERAL' });
  const [conns, setConns] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    connectionsApi.list().then(r => setConns(r.data.data ?? [])).catch(() => {});
  }, []);

  const send = async () => {
    if (!form.studentId || !form.content) { setErr('Select a student and enter feedback.'); return; }
    setErr('');
    try {
      await feedbackApi.give(form);
      setMsg('Feedback sent.');
      setForm(f => ({ ...f, content: '' }));
      setTimeout(() => setMsg(''), 3000);
    } catch (e) { setErr(e?.response?.data?.message || 'Failed to send.'); }
  };

  return (
    <div className="max-w-lg space-y-4">
      <p className="text-sm" style={{ color: 'var(--text-2)' }}>Send written feedback to a connected student.</p>
      <div className="card p-5 space-y-4">
        <div>
          <label className="label">Student</label>
          <select className="input" value={form.studentId}
            onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))}>
            <option value="">Select student...</option>
            {conns.map(c => (
              <option key={c.id} value={c.student?.id}>
                {c.student?.profile?.firstName} {c.student?.profile?.lastName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Feedback Type</label>
          <select className="input" value={form.feedbackType}
            onChange={e => setForm(f => ({ ...f, feedbackType: e.target.value }))}>
            {['GENERAL', 'TRADE_REVIEW', 'TEST_REVIEW', 'EXERCISE'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Feedback</label>
          <textarea className="input" rows={4} placeholder="Write your feedback..."
            value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
        </div>
        {err && <p className="text-xs" style={{ color: 'var(--neg)' }}>{err}</p>}
        {msg && <p className="text-xs" style={{ color: 'var(--pos)' }}>{msg}</p>}
        <Button onClick={send}>Send Feedback</Button>
      </div>
    </div>
  );
}
