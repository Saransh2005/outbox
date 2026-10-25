import React, { useState, useRef } from 'react';
import { Sender } from '../types';
import {
  X,
  Upload,
  Clock,
  Send,
  FileText,
  AlertCircle,
  Check,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { format, addSeconds, addMinutes, addDays, setHours, setMinutes } from 'date-fns';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  senders: Sender[];
  onScheduleSuccess: (count: number) => void;
  onScheduleError: (err: string) => void;
  onScheduleApi: (data: any) => Promise<any>;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  senders,
  onScheduleSuccess,
  onScheduleError,
  onScheduleApi,
}) => {
  const [selectedSenderEmail, setSelectedSenderEmail] = useState<string>(
    senders.find((s) => s.isDefault)?.email || senders[0]?.email || 'alex@reachinbox.ai'
  );
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState(
    'Hi {{name}},\n\nI noticed your work at {{company}} and wanted to reach out regarding our AI-driven email workflows.\n\nBest regards,\nReachInbox Outreach Team'
  );
  const [recipients, setRecipients] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [scheduledAt, setScheduledAt] = useState<string>(
    format(addMinutes(new Date(), 1), "yyyy-MM-dd'T'HH:mm")
  );
  const [delayBetweenEmails, setDelayBetweenEmails] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(50);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Extract email regex helper
  const extractEmails = (text: string): string[] => {
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const matches = text.match(emailRegex) || [];
    return Array.from(new Set(matches.map((m) => m.toLowerCase())));
  };

  // Handle CSV/TXT File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const found = extractEmails(content);
      if (found.length > 0) {
        setRecipients((prev) => Array.from(new Set([...prev, ...found])));
      }
    };
    reader.readAsText(file);
  };

  // Add manual recipient
  const handleAddManualEmail = () => {
    if (!manualInput.trim()) return;
    const found = extractEmails(manualInput);
    if (found.length > 0) {
      setRecipients((prev) => Array.from(new Set([...prev, ...found])));
      setManualInput('');
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients((prev) => prev.filter((r) => r !== email));
  };

  // Quick scheduling presets
  const applyPreset = (preset: '10s' | '1m' | '5m' | 'tomorrow') => {
    const now = new Date();
    let target = now;
    if (preset === '10s') target = addSeconds(now, 10);
    if (preset === '1m') target = addMinutes(now, 1);
    if (preset === '5m') target = addMinutes(now, 5);
    if (preset === 'tomorrow') {
      target = setHours(setMinutes(addDays(now, 1), 0), 9);
    }
    setScheduledAt(format(target, "yyyy-MM-dd'T'HH:mm"));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let allRecipients = [...recipients];
    if (manualInput.trim()) {
      const extra = extractEmails(manualInput);
      allRecipients = Array.from(new Set([...allRecipients, ...extra]));
    }

    if (allRecipients.length === 0) {
      onScheduleError('Please add at least one recipient email address or upload a CSV file.');
      return;
    }

    if (!subject.trim()) {
      onScheduleError('Please enter an email subject.');
      return;
    }

    if (!body.trim()) {
      onScheduleError('Please enter email body content.');
      return;
    }

    setIsSubmitting(true);
    try {
      const sender = senders.find((s) => s.email === selectedSenderEmail);

      await onScheduleApi({
        recipients: allRecipients,
        subject,
        body,
        senderEmail: selectedSenderEmail,
        senderName: sender?.name,
        scheduledAt: new Date(scheduledAt).toISOString(),
        delayBetweenEmails,
        hourlyLimit,
      });

      onScheduleSuccess(allRecipients.length);
      onClose();
    } catch (err: any) {
      onScheduleError(err.response?.data?.error || err.message || 'Failed to schedule emails');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
      <div className="glass-panel w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Compose New Campaign</h2>
              <p className="text-xs text-slate-400">
                Scheduled email sequence with BullMQ delayed queue
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Sender Account Selection */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5 flex items-center justify-between">
              <span>Send From Account</span>
              <span className="text-[11px] text-slate-400">Multi-sender supported</span>
            </label>
            <select
              value={selectedSenderEmail}
              onChange={(e) => {
                setSelectedSenderEmail(e.target.value);
                const s = senders.find((snd) => snd.email === e.target.value);
                if (s) setHourlyLimit(s.hourlyLimit);
              }}
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-brand-500"
            >
              {senders.map((s) => (
                <option key={s.id} value={s.email} className="bg-slate-900 text-white">
                  {s.name} ({s.email}) — Limit: {s.hourlyLimit}/hr
                </option>
              ))}
            </select>
          </div>

          {/* Lead Recipients Section: CSV Upload & Tag list */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-medium flex items-center gap-2">
                <span>Target Recipients</span>
                <span className="px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-semibold text-[10px]">
                  {recipients.length} lead{recipients.length === 1 ? '' : 's'} added
                </span>
              </label>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-white/10 text-slate-300 hover:text-white transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-brand-400" />
                <span>Upload CSV / TXT Leads</span>
              </button>
            </div>

            {uploadedFileName && (
              <div className="flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                <Check className="w-3.5 h-3.5" />
                <span>Uploaded: <strong>{uploadedFileName}</strong> ({recipients.length} email addresses parsed)</span>
              </div>
            )}

            {/* Recipient Chips */}
            {recipients.length > 0 && (
              <div className="max-h-24 overflow-y-auto flex flex-wrap gap-1.5 p-2 bg-slate-950/40 rounded-xl border border-white/5">
                {recipients.slice(0, 50).map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 text-slate-200 border border-white/10 text-[11px]"
                  >
                    <span>{r}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRecipient(r)}
                      className="text-slate-400 hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {recipients.length > 50 && (
                  <span className="px-2 py-1 text-slate-400 text-[11px] font-medium">
                    +{recipients.length - 50} more
                  </span>
                )}
              </div>
            )}

            {/* Manual input line */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Or type/paste email address..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddManualEmail();
                  }
                }}
                className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 text-xs"
              />
              <button
                type="button"
                onClick={handleAddManualEmail}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 text-xs font-medium"
              >
                Add
              </button>
            </div>
          </div>

          {/* Subject Line */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">Subject Line</label>
            <input
              type="text"
              placeholder="e.g. Transforming cold email outreach with ReachInbox AI"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 text-xs"
              required
            />
          </div>

          {/* Body Content */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 font-medium">Email Body (HTML / Plaintext)</label>
              <div className="flex gap-1.5">
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-slate-400">
                  Tag: {'{{name}}'}
                </span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-slate-400">
                  Tag: {'{{company}}'}
                </span>
              </div>
            </div>
            <textarea
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 text-xs font-mono"
              required
            />
          </div>

          {/* Scheduling Controls & Rates */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
            <h4 className="font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-400" />
              <span>Scheduling & Rate Limiting Parameters</span>
            </h4>

            {/* Start Time with Presets */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-300 font-medium">Start Sending At</label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => applyPreset('10s')}
                    className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 border border-white/10"
                  >
                    In 10s
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('1m')}
                    className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 border border-white/10"
                  >
                    In 1m
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('5m')}
                    className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 border border-white/10"
                  >
                    In 5m
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('tomorrow')}
                    className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 border border-white/10"
                  >
                    Tomorrow 9 AM
                  </button>
                </div>
              </div>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-brand-500"
                required
              />
            </div>

            {/* Delay Pacing & Hourly Limit Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Minimum Delay Between Emails (Seconds)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={delayBetweenEmails}
                  onChange={(e) => setDelayBetweenEmails(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-brand-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Spaces out batch sends to avoid provider throttling.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Hourly Sending Limit (Per Sender)
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={hourlyLimit}
                  onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-brand-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  💡 Tip: Set to 2 or 3 to test live rate limit deferral & Slack alerts!
                </p>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 border border-transparent font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-lg shadow-brand-500/25 border border-brand-400/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Scheduling in BullMQ...' : 'Schedule Campaign'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
