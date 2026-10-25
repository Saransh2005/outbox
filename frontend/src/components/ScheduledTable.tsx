import React, { useState } from 'react';
import { EmailJob } from '../types';
import {
  Search,
  Clock,
  Send,
  XCircle,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface ScheduledTableProps {
  emails: EmailJob[];
  loading: boolean;
  total: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onCancel: (id: string) => Promise<void>;
  onSendNow: (id: string) => Promise<void>;
  onOpenCompose: () => void;
  onRefresh: () => void;
  page: number;
  limit: number;
  onPageChange: (newPage: number) => void;
}

export const ScheduledTable: React.FC<ScheduledTableProps> = ({
  emails,
  loading,
  total,
  searchQuery,
  onSearchChange,
  onCancel,
  onSendNow,
  onOpenCompose,
  onRefresh,
  page,
  limit,
  onPageChange,
}) => {
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const handleAction = async (action: 'sendNow' | 'cancel', id: string) => {
    setActionInProgress(id);
    try {
      if (action === 'sendNow') {
        await onSendNow(id);
      } else {
        await onCancel(id);
      }
    } finally {
      setActionInProgress(null);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Scheduled Emails Queue</h2>
            <p className="text-xs text-slate-400">
              {total} email{total === 1 ? '' : 's'} waiting in BullMQ delayed queue
            </p>
          </div>
        </div>

        {/* Search bar & Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by recipient, subject..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-slate-900/90 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-slate-950/40 text-slate-400 font-medium">
              <th className="py-3 px-4">Recipient</th>
              <th className="py-3 px-4">Subject</th>
              <th className="py-3 px-4">Sender</th>
              <th className="py-3 px-4">Scheduled For</th>
              <th className="py-3 px-4">Pacing / Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading && emails.length === 0 ? (
              // Loading Skeleton
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-4">
                    <div className="h-4 bg-white/10 rounded w-36 mb-1" />
                    <div className="h-3 bg-white/5 rounded w-20" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-white/10 rounded w-48" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-white/10 rounded w-28" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-white/10 rounded w-32" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-5 bg-white/10 rounded-full w-20" />
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="h-6 bg-white/10 rounded w-16 ml-auto" />
                  </td>
                </tr>
              ))
            ) : emails.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={6} className="py-12 px-4 text-center">
                  <div className="max-w-sm mx-auto flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-white">No scheduled emails</h3>
                    <p className="text-xs text-slate-400 mt-1 mb-4 text-center">
                      {searchQuery
                        ? 'No scheduled emails matched your search query.'
                        : 'Your queue is empty! Schedule email outreach campaigns with delayed job persistence.'}
                    </p>
                    <button
                      onClick={onOpenCompose}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/30 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Schedule New Email</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              emails.map((email) => {
                const schedDate = new Date(email.scheduledAt);
                const isPast = schedDate.getTime() < Date.now();

                return (
                  <tr
                    key={email.id}
                    className="hover:bg-white/[0.02] transition-colors group text-slate-300"
                  >
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-white block">{email.recipient}</span>
                      {email.batchId && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          Batch: {email.batchId}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-200 max-w-xs truncate">
                      {email.subject}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-slate-400">{email.senderEmail}</span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-white font-medium">
                        {format(schedDate, 'MMM d, yyyy • h:mm:ss a')}
                      </div>
                      <div className="text-[10px] text-amber-400/90 font-mono mt-0.5">
                        {isPast ? 'Executing now...' : `In ${formatDistanceToNow(schedDate)}`}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          SCHEDULED
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Pacing: {email.delayBetweenEmails}s | Limit: {email.hourlyLimit}/hr
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleAction('sendNow', email.id)}
                          disabled={actionInProgress === email.id}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-[11px] font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                          title="Send immediately bypassing delay"
                        >
                          <Send className="w-3 h-3" />
                          <span>Send Now</span>
                        </button>

                        <button
                          onClick={() => handleAction('cancel', email.id)}
                          disabled={actionInProgress === email.id}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-[11px] font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                          title="Cancel and remove from queue"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} emails
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="text-white font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
