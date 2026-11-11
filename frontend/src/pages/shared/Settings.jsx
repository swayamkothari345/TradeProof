import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { authApi } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/ui/Button.jsx';

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const qc = useQueryClient();
  const profile = user?.profile ?? {};

  const [form, setForm] = useState({
    firstName: profile.firstName ?? '',
    lastName: profile.lastName ?? '',
    phone: profile.phone ?? '',
    city: profile.city ?? '',
    state: profile.state ?? '',
    bio: profile.bio ?? '',
  });
  const [saved, setSaved] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data) => authApi.updateProfile(data),
    onSuccess: () => {
      refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  return (
    <div className="max-w-xl space-y-6">
      <div className="card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Profile Information</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">First Name</label>
            <input className="input" value={form.firstName}
              onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
          </div>
          <div>
            <label className="label">Last Name</label>
            <input className="input" value={form.lastName}
              onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <label className="label">City</label>
            <input className="input" value={form.city}
              onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
          </div>
          <div>
            <label className="label">State</label>
            <input className="input" value={form.state}
              onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
          </div>
        </div>

        <div>
          <label className="label">Bio</label>
          <textarea className="input" rows={3} value={form.bio}
            onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
        </div>

        <div className="flex items-center gap-3">
          <Button icon={Save} loading={updateMutation.isPending}
            onClick={() => updateMutation.mutate(form)}>
            Save Changes
          </Button>
          {saved && <span className="text-sm text-green-600 dark:text-green-400">Saved.</span>}
          {updateMutation.error && (
            <span className="text-sm text-red-600 dark:text-red-400">
              {updateMutation.error?.response?.data?.message || 'Failed to save.'}
            </span>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Account</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-gray-500">Email</span>
            <span className="text-gray-900 dark:text-gray-100">{user?.email}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-gray-500">Role</span>
            <span className="text-gray-900 dark:text-gray-100">{user?.role}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Account ID</span>
            <span className="font-mono text-xs text-gray-400">{user?.id}</span>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Platform Notice</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          TradeProof is an educational platform for simulated trading practice and learning. No real-money trading occurs on this platform. All portfolio balances and trade records are simulated and for educational purposes only. This platform does not provide financial advice, trading signals or investment recommendations.
        </p>
      </div>
    </div>
  );
}
