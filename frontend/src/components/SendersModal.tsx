import React, { useState } from 'react';
import { Sender, SenderTelemetry } from '../types';
import { X, Layers, Plus, ShieldCheck, Check, Edit2 } from 'lucide-react';

interface SendersModalProps {
  isOpen: boolean;
  onClose: () => void;
  senders: Sender[];
  telemetry: SenderTelemetry[];
  onCreateSender: (name: string, email: string, limit: number) => Promise<void>;
  onUpdateLimit: (id: string, limit: number) => Promise<void>;
  onSuccessToast: (title: string, desc?: string) => void;
  onErrorToast: (title: string, desc?: string) => void;
}

export const SendersModal: React.FC<SendersModalProps> = ({
  isOpen,
  onClose,
  senders,
  telemetry,
  onCreateSender,
  onUpdateLimit,
  onSuccessToast,
  onErrorToast,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newLimit, setNewLimit] = useState(100);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLimitValue, setEditLimitValue] = useState<number>(100);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onCreateSender(newName, newEmail, newLimit);
      onSuccessToast('Sender Added', `${newEmail} is now ready for outreach.`);
      setShowAddForm(false);
      setNewName('');
      setNewEmail('');
    } catch (err: any) {
      onErrorToast('Failed to Add Sender', err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLimit = async (id: string) => {
    setLoading(true);
    try {
      await onUpdateLimit(id, editLimitValue);
      onSuccessToast('Limit Updated', `Hourly rate limit set to ${editLimitValue} emails/hr.`);
      setEditingId(null);
    } catch (err: any) {
      onErrorToast('Failed to Update Limit', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="glass-panel w-full max-w-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Senders & Rate Limits
              </h3>
              <p className="text-xs text-slate-400">Multi-tenant / per-sender quota management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
          {/* Senders List */}
          <div className="space-y-2.5">
            {senders.map((sender) => {
              const telem = telemetry.find((t) => t.senderEmail === sender.email);
              const isEditing = editingId === sender.id;

              return (
                <div
                  key={sender.id}
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{sender.name}</span>
                      {sender.isDefault && (
                        <span className="px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 text-[10px] font-semibold border border-brand-500/30">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 font-mono text-[11px] mt-0.5">{sender.email}</p>
                    {telem && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        Current Hour: <strong className="text-white">{telem.sentThisHour}</strong> / {telem.hourlyLimit} sent ({telem.remainingQuota} remaining)
                      </p>
                    )}
                  </div>

                  {/* Limit control */}
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={editLimitValue}
                          onChange={(e) => setEditLimitValue(parseInt(e.target.value, 10) || 1)}
                          className="w-20 bg-slate-900 border border-brand-500 rounded-lg px-2 py-1 text-white text-xs"
                        />
                        <button
                          onClick={() => handleSaveLimit(sender.id)}
                          className="p-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold"
                          title="Save"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(sender.id);
                          setEditLimitValue(sender.hourlyLimit);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
                        <span>Limit: {sender.hourlyLimit}/hr</span>
                        <Edit2 className="w-3 h-3 text-slate-500 ml-1" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Sender Form Toggle */}
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-2.5 rounded-xl border border-dashed border-white/20 hover:border-brand-500/50 text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4 text-brand-400" />
              <span>Add Another Sender Account</span>
            </button>
          ) : (
            <form onSubmit={handleCreate} className="p-4 rounded-2xl bg-slate-900/80 border border-brand-500/30 space-y-3">
              <h4 className="font-semibold text-white">Create New Sender Account</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Display Name</label>
                  <input
                    type="text"
                    placeholder="e.g. David Ross (Sales)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="david@outboxlabs.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Hourly Rate Limit (emails/hr)</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={newLimit}
                  onChange={(e) => setNewLimit(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium"
                >
                  Save Sender
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
