import React from 'react';
import { EmailJob } from '../types';
import {
  Search,
  SlidersHorizontal,
  RefreshCw,
  Clock,
  Send,
  XCircle,
  ExternalLink,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import { format } from 'date-fns';

interface EmailListViewProps {
  type: 'scheduled' | 'sent';
  emails: EmailJob[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectEmail: (email: EmailJob) => void;
  onSendNow?: (id: string) => Promise<void>;
  onCancel?: (id: string) => Promise<void>;
  onRefresh: () => void;
  onOpenCompose: () => void;
}

export const EmailListView: React.FC<EmailListViewProps> = ({
  type,
  emails,
  loading,
  searchQuery,
  onSearchChange,
  onSelectEmail,
  onSendNow,
  onCancel,
  onRefresh,
  onOpenCompose,
}) => {
  const isScheduled = type === 'scheduled';

  return (
    <div className="flex-1 bg-white flex flex-col h-screen overflow-hidden">
      {/* Top Search & Filter Bar */}
      <div className="h-14 border-b border-gray-100 px-6 flex items-center justify-between shrink-0">
        {/* Search Input Pill */}
        <div className="relative max-w-md w-full">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#F9FAFB] border border-gray-200/70 rounded-full pl-9 pr-4 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#00A36C] focus:bg-white transition-all"
          />
        </div>

        {/* Filter & Refresh Icons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#00A36C]' : ''}`} />
          </button>
          <button className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Email List Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && emails.length === 0 ? (
          // Skeleton loader
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-6 animate-pulse">
                <div className="w-32 h-4 bg-gray-100 rounded" />
                <div className="w-28 h-5 bg-orange-50 rounded-full" />
                <div className="flex-1 h-4 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : emails.length === 0 ? (
          // Empty state
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#00A36C] mb-3">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">
              No {isScheduled ? 'scheduled' : 'sent'} emails
            </h3>
            <p className="text-xs text-gray-400 max-w-sm mt-1 mb-4">
              {searchQuery
                ? 'No matching emails found for this query.'
                : isScheduled
                ? 'Your scheduled pipeline is clear. Compose and schedule a new email campaign!'
                : 'Emails processed by BullMQ workers will appear here with live preview links.'}
            </p>
            {isScheduled && (
              <button
                onClick={onOpenCompose}
                className="border border-[#00A36C] text-[#00A36C] hover:bg-emerald-50 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors"
              >
                Compose Email
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {emails.map((email) => {
              const formattedDate = email.scheduledAt
                ? format(new Date(email.scheduledAt), 'MMM d, hh:mm a')
                : '';
              const sentDate = email.sentAt
                ? format(new Date(email.sentAt), 'hh:mm a')
                : '16:21';

              return (
                <div
                  key={email.id}
                  onClick={() => onSelectEmail(email)}
                  className="px-6 py-3.5 hover:bg-[#F9FAFB] cursor-pointer flex items-center justify-between gap-4 transition-colors group select-none text-xs"
                >
                  <div className="flex items-center gap-6 flex-1 min-w-0">
                    {/* Recipient */}
                    <div className="w-40 font-semibold text-gray-900 truncate shrink-0">
                      To: {email.recipient.split('@')[0]}
                    </div>

                    {/* Badge */}
                    {isScheduled ? (
                      <div className="shrink-0 inline-flex items-center gap-1.5 bg-[#FFF4ED] text-[#EA580C] border border-[#FDBA74]/50 rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                        <Clock className="w-3 h-3 text-[#EA580C]" />
                        <span>{formattedDate}</span>
                      </div>
                    ) : (
                      <div className="shrink-0 inline-flex items-center bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                        <span>{sentDate}</span>
                      </div>
                    )}

                    {/* Subject & Preview Snippet */}
                    <div className="flex-1 min-w-0 flex items-baseline gap-1.5 truncate">
                      <span className="font-semibold text-gray-900 truncate shrink-0 max-w-xs">
                        {email.subject}
                      </span>
                      <span className="text-gray-400 shrink-0">-</span>
                      <span className="text-gray-500 truncate">
                        {email.body.replace(/<[^>]*>/g, '').slice(0, 100)}...
                      </span>
                    </div>
                  </div>

                  {/* Actions & Chevron on Right */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Ethereal preview button if sent */}
                    {!isScheduled && email.previewUrl && (
                      <a
                        href={email.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2.5 py-1 rounded-full bg-[#EBF8F2] border border-[#A7E8C7] text-[#15803D] hover:bg-[#DDF3E8] text-[11px] font-medium flex items-center gap-1 transition-colors"
                        title="View rendered email in Ethereal"
                      >
                        <span>View</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}

                    {/* Send Now and Cancel if scheduled */}
                    {isScheduled && onSendNow && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSendNow(email.id);
                        }}
                        className="p-1 text-gray-400 hover:text-emerald-600 transition-colors opacity-0 group-hover:opacity-100"
                        title="Send now"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isScheduled && onCancel && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCancel(email.id);
                        }}
                        className="p-1 text-gray-400 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                        title="Cancel"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
