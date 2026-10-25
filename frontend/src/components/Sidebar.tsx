import React, { useState } from 'react';
import { UserProfile, SlackStatus, QueueStats } from '../types';
import {
  Clock,
  Send,
  Plus,
  ChevronDown,
  LogOut,
  Slack,
  Layers,
  Activity,
  ExternalLink,
} from 'lucide-react';

interface SidebarProps {
  user: UserProfile;
  activeTab: 'scheduled' | 'sent';
  onTabChange: (tab: 'scheduled' | 'sent') => void;
  onOpenCompose: () => void;
  onOpenSlack: () => void;
  onOpenSenders: () => void;
  onLogout: () => void;
  scheduledCount: number;
  sentCount: number;
  slackStatus: SlackStatus | null;
  queueStats: QueueStats | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeTab,
  onTabChange,
  onOpenCompose,
  onOpenSlack,
  onOpenSenders,
  onLogout,
  scheduledCount,
  sentCount,
  slackStatus,
  queueStats,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <aside className="w-60 h-screen bg-white border-r border-gray-100 flex flex-col justify-between shrink-0 select-none">
      {/* Top Portion */}
      <div className="p-4 space-y-4">
        {/* Brand Logo */}
        <div className="flex items-center justify-between px-1">
          <span className="font-extrabold text-2xl tracking-tight text-gray-950 font-sans">
            ONB
          </span>
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            ReachInbox
          </span>
        </div>

        {/* User Profile Card */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-full flex items-center justify-between p-1.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <img
                src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0"
              />
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-gray-900 truncate leading-tight">
                  {user.name}
                </p>
                <p className="text-[10px] text-gray-400 truncate leading-tight mt-0.5 font-mono">
                  {user.email}
                </p>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1" />
          </button>

          {/* Logout dropdown */}
          {showProfileMenu && (
            <div
              className="absolute left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg p-1 z-50 animate-in fade-in"
              onMouseLeave={() => setShowProfileMenu(false)}
            >
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Compose Pill Button */}
        <div>
          <button
            onClick={onOpenCompose}
            className="w-full border border-[#00A36C] text-[#00A36C] hover:bg-emerald-50/60 font-semibold py-1.5 px-4 rounded-full text-xs text-center flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <span>Compose</span>
          </button>
        </div>

        {/* CORE Navigation Menu */}
        <div>
          <p className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase px-2 mb-1.5">
            CORE
          </p>
          <nav className="space-y-1">
            {/* Scheduled Emails Tab */}
            <button
              onClick={() => onTabChange('scheduled')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'scheduled'
                  ? 'bg-[#EBF8F2] text-[#15803D]'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Scheduled</span>
              </div>
              <span className="text-[11px] font-mono font-semibold">
                {scheduledCount}
              </span>
            </button>

            {/* Sent Emails Tab */}
            <button
              onClick={() => onTabChange('sent')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'sent'
                  ? 'bg-[#EBF8F2] text-[#15803D]'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Send className="w-4 h-4 text-emerald-600" />
                <span>Sent</span>
              </div>
              <span className="text-[11px] font-mono font-semibold">
                {sentCount}
              </span>
            </button>
          </nav>
        </div>
      </div>

      {/* Bottom Sidebar Portion */}
      <div className="p-3 border-t border-gray-100 space-y-1.5 text-xs">
        {/* Slack Status Pill */}
        <button
          onClick={onOpenSlack}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-[11px] transition-colors ${
            slackStatus?.connected
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
              : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Slack className="w-3.5 h-3.5 text-emerald-600" />
            <span className="truncate">
              {slackStatus?.connected ? slackStatus.channelName : 'Connect Slack'}
            </span>
          </div>
          <span
            className={`w-2 h-2 rounded-full ${
              slackStatus?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'
            }`}
          />
        </button>

        {/* Senders & Rate Limits Button */}
        <button
          onClick={onOpenSenders}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-100 text-[11px] text-gray-700 transition-colors"
        >
          <Layers className="w-3.5 h-3.5 text-emerald-600" />
          <span>Senders & Quotas</span>
        </button>

        {/* BullMQ Live Monitor */}
        <a
          href="/admin/queues"
          target="_blank"
          rel="noreferrer"
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-100 text-[11px] text-gray-700 transition-colors group"
        >
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span>BullMQ Monitor</span>
          </div>
          <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-gray-600" />
        </a>
      </div>
    </aside>
  );
};
