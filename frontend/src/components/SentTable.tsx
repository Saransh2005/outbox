import React from 'react';
import { EmailJob } from '../types';
import {
  Search,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Send,
  Eye,
  AlertOctagon,
} from 'lucide-react';
import { format } from 'date-fns';

interface SentTableProps {
  emails: EmailJob[];
  loading: boolean;
  total: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  page: number;
  limit: number;
  onPageChange: (newPage: number) => void;
}

export const SentTable: React.FC<SentTableProps> = ({
  emails,
  loading,
  total,
  searchQuery,
  onSearchChange,
  onRefresh,
  page,
  limit,
  onPageChange,
}) => {
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Sent Emails History</h2>
            <p className="text-xs text-slate-400">
              {total} email{total === 1 ? '' : 's'} successfully dispatched via Ethereal fake SMTP
            </p>
          </div>
        </div>

        {/* Search bar & Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search sent emails..."
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
              <th className="py-3 px-4">Sent At</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Ethereal Preview</th>
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
                    <div className="h-5 bg-white/10 rounded-full w-16" />
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="h-6 bg-white/10 rounded w-24 ml-auto" />
                  </td>
                </tr>
              ))
            ) : emails.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={6} className="py-12 px-4 text-center">
                  <div className="max-w-sm mx-auto flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                      <Send className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-white">No sent emails yet</h3>
                    <p className="text-xs text-slate-400 mt-1 text-center">
                      {searchQuery
                        ? 'No sent emails matched your search query.'
                        : 'Emails sent by BullMQ workers with Ethereal live preview links will appear here.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              emails.map((email) => {
                const isSent = email.status === 'SENT';

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
                      {email.sentAt ? (
                        <div className="text-white font-medium">
                          {format(new Date(email.sentAt), 'MMM d, yyyy • h:mm:ss a')}
                        </div>
                      ) : (
                        <span className="text-slate-500">Pending</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {isSent ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          SENT
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30">
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          FAILED
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {email.previewUrl ? (
                        <a
                          href={email.previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/30 hover:border-brand-500/50 text-[11px] font-semibold transition-all group/btn shadow-sm"
                          title="View rendered email in Ethereal Email browser"
                        >
                          <Eye className="w-3.5 h-3.5 text-brand-400 group-hover/btn:scale-110 transition-transform" />
                          <span>View Email</span>
                          <ExternalLink className="w-3 h-3 text-brand-400 opacity-70" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">No preview URL</span>
                      )}
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
