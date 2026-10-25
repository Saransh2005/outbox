import React, { useState, useRef } from 'react';
import { Sender } from '../types';
import {
  ArrowLeft,
  Upload,
  Calendar,
  X,
  Trash2,
  Edit3,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Paperclip,
  Image as ImageIcon,
  RotateCcw,
  RotateCw,
  ChevronDown,
  Check,
} from 'lucide-react';
import { format, addMinutes, addDays, setHours, setMinutes } from 'date-fns';

interface ComposeViewProps {
  onBack: () => void;
  senders: Sender[];
  onScheduleApi: (data: any) => Promise<any>;
  onScheduleSuccess: (count: number) => void;
  onScheduleError: (err: string) => void;
}

export const ComposeView: React.FC<ComposeViewProps> = ({
  onBack,
  senders,
  onScheduleApi,
  onScheduleSuccess,
  onScheduleError,
}) => {
  // Fallback senders so dropdown is never empty even if API is loading
  const availableSenders =
    senders.length > 0
      ? senders
      : [
          {
            id: 'default-1',
            name: 'Oliver Brown',
            email: 'oliver.brown@domain.io',
            isDefault: true,
            hourlyLimit: 100,
          },
          {
            id: 'default-2',
            name: 'Alex Morgan',
            email: 'alex@reachinbox.ai',
            isDefault: false,
            hourlyLimit: 100,
          },
          {
            id: 'default-3',
            name: 'Sarah Connor',
            email: 'sarah@growthoutbox.io',
            isDefault: false,
            hourlyLimit: 50,
          },
        ];

  const [selectedSenderEmail, setSelectedSenderEmail] = useState<string>(
    availableSenders.find((s) => s.isDefault)?.email || availableSenders[0]?.email || 'oliver.brown@domain.io'
  );
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [delayBetweenEmails, setDelayBetweenEmails] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(50);

  // Date time popover state (Screen 5)
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<string>(
    format(addMinutes(new Date(), 2), "yyyy-MM-dd'T'HH:mm")
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Preset handlers
  const handlePresetSelect = (preset: 'tomorrow' | '10am' | '11am' | '2pm') => {
    const tomorrow = addDays(new Date(), 1);
    let target = tomorrow;
    if (preset === '10am') target = setHours(setMinutes(tomorrow, 0), 10);
    if (preset === '11am') target = setHours(setMinutes(tomorrow, 0), 11);
    if (preset === '2pm') target = setHours(setMinutes(tomorrow, 0), 14);
    if (preset === 'tomorrow') target = setHours(setMinutes(tomorrow, 0), 9);

    setScheduledAt(format(target, "yyyy-MM-dd'T'HH:mm"));
  };

  // Submit Handler
  const handleScheduleSubmit = async () => {
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

    setIsSubmitting(true);
    try {
      const sender = senders.find((s) => s.email === selectedSenderEmail);

      await onScheduleApi({
        recipients: allRecipients,
        subject,
        body: body.trim() || 'Hi,\n\nFollowing up on our conversation.\n\nBest,\nReachInbox Team',
        senderEmail: selectedSenderEmail,
        senderName: sender?.name,
        scheduledAt: new Date(scheduledAt).toISOString(),
        delayBetweenEmails,
        hourlyLimit,
      });

      onScheduleSuccess(allRecipients.length);
      onBack();
    } catch (err: any) {
      onScheduleError(err.response?.data?.error || err.message || 'Failed to schedule emails');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 bg-white flex flex-col h-screen overflow-y-auto relative">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-gray-100 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-semibold text-gray-900 tracking-tight">
            Compose New Email
          </h1>
        </div>

        {/* Top Right Action Icons & Send Later Button */}
        <div className="flex items-center gap-3 relative">
          <button className="text-gray-400 hover:text-gray-700 p-1" title="Draft saved">
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setRecipients([]);
              setSubject('');
              setBody('');
            }}
            className="text-gray-400 hover:text-rose-600 p-1"
            title="Discard"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Send Later Pill Button */}
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            disabled={isSubmitting}
            className="border border-[#00A36C] text-[#00A36C] hover:bg-emerald-50/70 font-semibold px-4 py-1.5 text-xs rounded-full transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>{isSubmitting ? 'Scheduling...' : 'Send Later'}</span>
          </button>

          {/* Date & Time Picker Popover (Screen 5) */}
          {showDatePicker && (
            <div className="absolute right-0 top-11 w-72 bg-white border border-gray-200/80 rounded-2xl shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
              <h3 className="text-xs font-semibold text-gray-900 mb-3">Select date &amp; time</h3>

              {/* Native Date Picker */}
              <div className="relative mb-3">
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#00A36C]"
                />
              </div>

              {/* Preset options */}
              <div className="divide-y divide-gray-100 text-xs text-gray-700 mb-4">
                <button
                  type="button"
                  onClick={() => handlePresetSelect('tomorrow')}
                  className="w-full text-left py-2 hover:text-[#00A36C] transition-colors"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetSelect('10am')}
                  className="w-full text-left py-2 hover:text-[#00A36C] transition-colors"
                >
                  Tomorrow, 10:00 AM
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetSelect('11am')}
                  className="w-full text-left py-2 hover:text-[#00A36C] transition-colors"
                >
                  Tomorrow, 11:00 AM
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetSelect('2pm')}
                  className="w-full text-left py-2 hover:text-[#00A36C] transition-colors"
                >
                  Tomorrow, 2:00 PM
                </button>
              </div>

              {/* Popover footer */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowDatePicker(false)}
                  className="text-xs text-gray-500 hover:text-gray-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDatePicker(false);
                    handleScheduleSubmit();
                  }}
                  className="border border-[#00A36C] text-[#00A36C] hover:bg-emerald-50 px-4 py-1 text-xs rounded-full font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Compose Form Fields */}
      <div className="p-8 max-w-4xl space-y-4">
        {/* From Field */}
        <div className="flex items-center gap-4 text-xs">
          <span className="w-12 text-gray-400 font-medium">From</span>
          <div className="relative">
            <select
              value={selectedSenderEmail}
              onChange={(e) => setSelectedSenderEmail(e.target.value)}
              className="appearance-none bg-gray-100/90 hover:bg-gray-100 border border-transparent rounded-lg pl-3 pr-8 py-1.5 text-xs font-medium text-gray-800 focus:outline-none focus:border-gray-300 cursor-pointer"
            >
              {availableSenders.map((s) => (
                <option key={s.id} value={s.email}>
                  {s.email}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* To Field (With Green Tags & Upload CSV on Right) */}
        <div className="flex items-start gap-4 text-xs border-b border-gray-100 pb-3">
          <span className="w-12 text-gray-400 font-medium pt-1.5">To</span>
          <div className="flex-1 flex flex-wrap items-center gap-1.5 min-h-[32px]">
            {/* Tagged email pills matching Screen 7 */}
            {recipients.map((r) => (
              <span
                key={r}
                className="inline-flex items-center gap-1.5 bg-[#EBF8F2] text-[#15803D] border border-[#86EFAC] px-3 py-1 rounded-full text-xs font-medium"
              >
                <span>{r}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveRecipient(r)}
                  className="hover:text-emerald-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* Manual input */}
            <input
              type="text"
              placeholder={recipients.length === 0 ? 'recipient@example.com' : 'Add more...'}
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  handleAddManualEmail();
                }
              }}
              className="flex-1 min-w-[180px] bg-transparent text-xs text-gray-800 placeholder-gray-400 focus:outline-none py-1"
            />
          </div>

          {/* Upload CSV Link Button on Right */}
          <div className="shrink-0 pt-1">
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
              className="text-[#00A36C] hover:text-[#008f5d] font-medium text-xs flex items-center gap-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload CSV</span>
            </button>
          </div>
        </div>

        {/* Subject Field */}
        <div className="flex items-center gap-4 text-xs border-b border-gray-100 pb-3">
          <span className="w-12 text-gray-400 font-medium">Subject</span>
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-1 bg-transparent text-xs text-gray-800 placeholder-gray-400 focus:outline-none"
          />
        </div>

        {/* Inline Delay & Hourly Limit Controls */}
        <div className="flex items-center gap-6 text-xs pt-1 pb-2 text-gray-600">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Delay between 2 emails:</span>
            <div className="relative inline-flex items-center">
              <input
                type="number"
                min="0"
                max="60"
                value={delayBetweenEmails}
                onChange={(e) => setDelayBetweenEmails(parseInt(e.target.value, 10) || 0)}
                className="w-14 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-center text-xs font-medium text-gray-800 focus:outline-none focus:border-[#00A36C]"
              />
              <span className="ml-1 text-gray-500 text-[11px]">s</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400">Hourly Limit:</span>
            <input
              type="number"
              min="1"
              max="1000"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 1)}
              className="w-16 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-center text-xs font-medium text-gray-800 focus:outline-none focus:border-[#00A36C]"
            />
          </div>
        </div>

        {/* Rich Text Editor Box (Screen 6 & 7) */}
        <div className="border border-gray-100 rounded-2xl bg-[#FAFAFA]/70 overflow-hidden shadow-sm">
          {/* Text Area */}
          <textarea
            rows={10}
            placeholder="Type Your Reply..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full p-4 bg-transparent text-xs text-gray-800 placeholder-gray-400 focus:outline-none resize-none leading-relaxed"
          />

          {/* Rich Text Toolbar Matching Figma */}
          <div className="h-11 bg-white border-t border-gray-100 px-4 flex items-center justify-between text-gray-500 overflow-x-auto">
            <div className="flex items-center gap-1 sm:gap-2">
              <button className="p-1 hover:text-gray-900 transition-colors">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button className="p-1 hover:text-gray-900 transition-colors">
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <span className="w-px h-3.5 bg-gray-200 mx-1" />
              <button className="p-1 hover:text-gray-900 transition-colors">
                <Type className="w-3.5 h-3.5" />
              </button>
              <button className="p-1 hover:text-gray-900 font-bold transition-colors">
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button className="p-1 hover:text-gray-900 italic transition-colors">
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button className="p-1 hover:text-gray-900 underline transition-colors">
                <Underline className="w-3.5 h-3.5" />
              </button>
              <button className="p-1 hover:text-gray-900 line-through transition-colors">
                <Strikethrough className="w-3.5 h-3.5" />
              </button>
              <span className="w-px h-3.5 bg-gray-200 mx-1" />
              <button className="p-1 hover:text-gray-900 transition-colors">
                <Link className="w-3.5 h-3.5" />
              </button>
              <button className="p-1 hover:text-gray-900 transition-colors">
                <List className="w-3.5 h-3.5" />
              </button>
              <button className="p-1 hover:text-gray-900 transition-colors">
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
              <span className="w-px h-3.5 bg-gray-200 mx-1" />
              <button className="p-1 hover:text-gray-900 transition-colors">
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button className="p-1 hover:text-gray-900 transition-colors">
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button className="p-1 hover:text-gray-900 transition-colors">
                <AlignRight className="w-3.5 h-3.5" />
              </button>
              <span className="w-px h-3.5 bg-gray-200 mx-1" />
              <button className="p-1 hover:text-gray-900 transition-colors">
                <Paperclip className="w-3.5 h-3.5" />
              </button>
              <button className="p-1 hover:text-gray-900 transition-colors">
                <ImageIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {uploadedFileName && (
          <div className="flex items-center gap-2 text-[11px] text-[#00A36C] bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200">
            <Check className="w-3.5 h-3.5" />
            <span>
              Loaded <strong>{uploadedFileName}</strong> ({recipients.length} lead addresses parsed)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
