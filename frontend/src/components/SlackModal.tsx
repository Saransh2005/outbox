import React, { useState } from 'react';
import { SlackStatus } from '../types';
import {
  X,
  Slack,
  CheckCircle2,
  AlertTriangle,
  Send,
  Trash2,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

interface SlackModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SlackStatus | null;
  onConnectWebhook: (url: string, channel: string) => Promise<void>;
  onDisconnect: () => Promise<void>;
  onSendTest: () => Promise<string>;
  onSuccessToast: (title: string, desc?: string) => void;
  onErrorToast: (title: string, desc?: string) => void;
}

export const SlackModal: React.FC<SlackModalProps> = ({
  isOpen,
  onClose,
  status,
  onConnectWebhook,
  onDisconnect,
  onSendTest,
  onSuccessToast,
  onErrorToast,
}) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [channelName, setChannelName] = useState('#email-alerts');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
      onErrorToast('Invalid Webhook URL', 'Slack incoming webhook URLs start with https://hooks.slack.com/...');
      return;
    }

    setLoading(true);
    try {
      await onConnectWebhook(webhookUrl, channelName);
      onSuccessToast('Slack Connected!', `Notifications will be routed to ${channelName}`);
      setWebhookUrl('');
    } catch (err: any) {
      onErrorToast('Connection Failed', err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const msg = await onSendTest();
      onSuccessToast('Live Test Notification Sent!', msg);
    } catch (err: any) {
      onErrorToast('Test Ping Failed', err.response?.data?.error || err.message);
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await onDisconnect();
      onSuccessToast('Slack Disconnected', 'Rate limit events will no longer post to Slack.');
    } catch (err: any) {
      onErrorToast('Failed to disconnect', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="glass-panel w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4A154B]/30 border border-[#E01E5A]/30 flex items-center justify-center text-[#ECB22E]">
              <Slack className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Slack Integration</h3>
              <p className="text-xs text-slate-400">Real-time alert dispatch on rate limit hit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Active Status Banner */}
          {status?.connected ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-emerald-300">Slack is Connected & Active</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  Channel: {status.channelName}
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                When any sender reaches their configured hourly limit, a rich Slack Block Kit message is dispatched immediately with sender metrics, deferred recipient, and next window details.
              </p>
              <div className="pt-2 flex items-center justify-between border-t border-emerald-500/20">
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition-colors disabled:opacity-50"
                >
                  <Send className="w-3 h-3" />
                  <span>{testing ? 'Sending Ping...' : 'Send Live Test Ping'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-slate-300 text-[11px] leading-relaxed">
                <strong className="text-amber-300">Slack is not connected.</strong> Rate limit hits will safely defer emails in BullMQ, but Slack alerts will be suppressed without crashing the queue.
              </div>
            </div>
          )}

          {/* Webhook Connection Form */}
          <form onSubmit={handleConnect} className="space-y-3 pt-1">
            <h4 className="font-semibold text-white">Connect via Incoming Webhook URL</h4>
            <div>
              <label className="block text-slate-400 mb-1">Slack Webhook URL</label>
              <input
                type="url"
                placeholder="https://hooks.slack.com/services/T.../B.../..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 text-xs font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Target Channel Display Name</label>
              <input
                type="text"
                placeholder="#email-alerts or #outreach"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-md shadow-brand-600/30 disabled:opacity-50"
            >
              {loading ? 'Connecting...' : status?.connected ? 'Update Webhook' : 'Save & Connect Slack'}
            </button>
          </form>

          {/* OAuth option if configured */}
          {status?.hasOAuthConfig && (
            <div className="pt-2 border-t border-white/10 text-center">
              <a
                href="/api/slack/oauth"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-medium transition-colors"
              >
                <Slack className="w-3.5 h-3.5 text-emerald-400" />
                <span>Connect via Slack App OAuth Flow</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
