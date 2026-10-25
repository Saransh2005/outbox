import React, { useState } from 'react';
import { UserProfile, SlackStatus, QueueStats } from '../types';
import {
  Mail,
  Plus,
  LogOut,
  Slack,
  ExternalLink,
  Activity,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface HeaderProps {
  user: UserProfile;
  onLogout: () => void;
  onOpenCompose: () => void;
  onOpenSlack: () => void;
  onOpenSenders: () => void;
  slackStatus: SlackStatus | null;
  queueStats: QueueStats | null;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  onOpenCompose,
  onOpenSlack,
  onOpenSenders,
  slackStatus,
  queueStats,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B0F19]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-violet-500 flex items-center justify-center shadow-lg shadow-brand-500/25 border border-white/10">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">ReachInbox</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  Scheduler
                </span>
              </div>
              <p className="text-xs text-slate-400">Outbox Labs Architecture</p>
            </div>
          </div>

          {/* BullMQ Live Queue Link */}
          <a
            href="/admin/queues"
            target="_blank"
            rel="noreferrer"
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-850 border border-white/10 hover:border-brand-500/40 text-xs text-slate-300 hover:text-white transition-all group"
            title="Open real-time BullMQ Dashboard"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>BullMQ Live Monitor</span>
            {queueStats && (
              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">
                {queueStats.totalPending} pending
              </span>
            )}
            <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition-colors" />
          </a>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Senders & Rate Limits Button */}
          <button
            onClick={onOpenSenders}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-850 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white transition-all"
          >
            <Layers className="w-3.5 h-3.5 text-brand-400" />
            <span>Senders & Quotas</span>
          </button>

          {/* Slack Integration Status Button */}
          <button
            onClick={onOpenSlack}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
              slackStatus?.connected
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/50'
                : 'bg-slate-850/80 border-white/10 text-slate-300 hover:border-brand-500/40 hover:text-white'
            }`}
          >
            <Slack className={`w-3.5 h-3.5 ${slackStatus?.connected ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">
              {slackStatus?.connected ? (
                <>Slack: <span className="font-semibold">{slackStatus.channelName || 'Connected'}</span></>
              ) : (
                'Connect Slack'
              )}
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                slackStatus?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
          </button>

          {/* Primary Compose CTA */}
          <button
            onClick={onOpenCompose}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-lg shadow-brand-600/30 border border-brand-400/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Compose Email</span>
          </button>

          {/* User Profile & Logout */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
            >
              <img
                src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={user.name}
                className="w-8 h-8 rounded-lg object-cover border border-white/20"
              />
              <div className="hidden md:block text-left text-xs leading-tight">
                <p className="font-medium text-slate-200">{user.name}</p>
                <p className="text-[11px] text-slate-400 truncate max-w-[120px]">{user.email}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-xl glass-panel shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2"
                onMouseLeave={() => setShowDropdown(false)}
              >
                <div className="px-3 py-2 border-b border-white/10">
                  <p className="text-xs font-semibold text-white">{user.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                </div>
                <div className="pt-1">
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
