import React from 'react';
import { EmailJob } from '../types';
import {
  ArrowLeft,
  ExternalLink,
  Star,
  CornerUpLeft,
  MoreVertical,
  Paperclip,
  CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';

interface EmailDetailViewProps {
  email: EmailJob;
  onBack: () => void;
}

export const EmailDetailView: React.FC<EmailDetailViewProps> = ({ email, onBack }) => {
  const isSent = email.status === 'SENT';
  const displayDate = email.sentAt
    ? format(new Date(email.sentAt), 'MMM d, yyyy, h:mm a')
    : format(new Date(email.scheduledAt), 'MMM d, yyyy, h:mm a');

  return (
    <div className="flex-1 bg-white flex flex-col h-screen overflow-y-auto">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-gray-100 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            title="Back to inbox"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-semibold text-gray-900 tracking-tight truncate max-w-xl">
            {email.subject || 'Oliver, hello there! | M/NYT/64 (04#12#D)'}
          </h1>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-3">
          {email.previewUrl && (
            <a
              href={email.previewUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF8F2] border border-[#A7E8C7] text-[#15803D] hover:bg-[#DDF3E8] text-xs font-medium transition-colors"
              title="Open rendered email in Ethereal web viewer"
            >
              <span>View in Ethereal</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          <button className="text-gray-400 hover:text-amber-500 p-1">
            <Star className="w-4 h-4" />
          </button>
          <button className="text-gray-400 hover:text-gray-700 p-1">
            <CornerUpLeft className="w-4 h-4" />
          </button>
          <button className="text-gray-400 hover:text-gray-700 p-1">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Email Header Card */}
      <div className="p-8 max-w-4xl space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3.5">
            {/* Green Avatar Circle */}
            <div className="w-9 h-9 rounded-full bg-[#16A34A] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
              {email.senderEmail ? email.senderEmail.charAt(0).toUpperCase() : 'A'}
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold text-gray-900">
                  {email.senderEmail || 'Amanda Ross'}
                </span>
                <span className="text-[11px] text-gray-400 font-mono">
                  &lt;{email.senderEmail}&gt;
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                <span>to</span>
                <span className="font-medium text-gray-700">{email.recipient}</span>
                <span className="text-gray-400">▾</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-gray-400">{displayDate}</span>
            {isSent && (
              <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-600 font-medium mt-0.5">
                <CheckCircle2 className="w-3 h-3" />
                <span>Delivered</span>
              </div>
            )}
          </div>
        </div>

        {/* Email Body Content */}
        <div className="text-xs text-gray-800 leading-relaxed space-y-4 pt-2">
          {/* Custom Body or Styled Figma Default */}
          <div
            dangerouslySetInnerHTML={{
              __html: email.body.replace(/\n/g, '<br/>'),
            }}
          />

          {/* Figma-style Highlight Box */}
          <div className="bg-[#FEFCE8] border-l-4 border-[#FACC15] p-4 rounded-r-xl my-4 text-xs text-gray-800 space-y-1.5 shadow-sm">
            <p className="font-semibold text-gray-900">
              • Extremely Exclusive — Only 4 Spots Worldwide For Year 2025/2026 Investment
            </p>
            <p className="text-gray-700">
              • To explore secret liquid private transformation, simply reply right now with &quot;INVESTOR&quot;
            </p>
          </div>

          <p className="text-gray-700">
            Your coach for world-class performance,
            <br />
            <br />
            <strong>ReachInbox Team</strong>
            <br />
            <span className="italic text-gray-500">
              P.S. Always remember that you can develop world-class technique! 🚀
            </span>
          </p>

          {/* Attached Images Section */}
          <div className="pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-gray-700">
              <Paperclip className="w-3.5 h-3.5 text-gray-500" />
              <span>Attachments (2)</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Attachment card 1 */}
              <div className="border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors bg-white shadow-sm">
                <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xs font-semibold relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px] opacity-20" />
                  <span>Tennis_Coach_Profile</span>
                </div>
                <div className="p-2 text-[11px]">
                  <p className="font-medium text-gray-800 truncate">Tennis_Coach_Profile.png</p>
                  <p className="text-gray-400 text-[10px]">1.2 MB</p>
                </div>
              </div>

              {/* Attachment card 2 */}
              <div className="border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors bg-white shadow-sm">
                <div className="h-24 bg-gradient-to-r from-indigo-700 to-blue-500 flex items-center justify-center text-white text-xs font-semibold relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px] opacity-20" />
                  <span>ReachInbox_Metrics</span>
                </div>
                <div className="p-2 text-[11px]">
                  <p className="font-medium text-gray-800 truncate">ReachInbox_Metrics.pdf</p>
                  <p className="text-gray-400 text-[10px]">840 KB</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
