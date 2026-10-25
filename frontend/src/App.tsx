import React, { useState, useEffect, useCallback } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { UserProfile, DashboardStats, Sender, SlackStatus, EmailJob } from './types';
import { apiClient } from './lib/api';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { ScheduledTable } from './components/ScheduledTable';
import { SentTable } from './components/SentTable';
import { ComposeModal } from './components/ComposeModal';
import { SlackModal } from './components/SlackModal';
import { SendersModal } from './components/SendersModal';
import { LoginView } from './components/LoginView';
import { ToastContainer, ToastMessage } from './components/Toast';
import {
  Calendar,
  Send,
  Layers,
  Activity,
  ShieldCheck,
  Search,
  ExternalLink,
  Plus,
} from 'lucide-react';

// Use env client ID or fallback default for demo
const GOOGLE_CLIENT_ID =
  (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
  '1029384756-reachinbox-mock-oauth-client.apps.googleusercontent.com';

export const App: React.FC = () => {
  // Auth state
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('reachinbox_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Active tab: 'scheduled' | 'sent'
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');

  // Modals state
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSlackOpen, setIsSlackOpen] = useState(false);
  const [isSendersOpen, setIsSendersOpen] = useState(false);

  // Data states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null);

  // Scheduled emails
  const [scheduledEmails, setScheduledEmails] = useState<EmailJob[]>([]);
  const [scheduledLoading, setScheduledLoading] = useState(false);
  const [scheduledTotal, setScheduledTotal] = useState(0);
  const [scheduledSearch, setScheduledSearch] = useState('');
  const [scheduledPage, setScheduledPage] = useState(1);

  // Sent emails
  const [sentEmails, setSentEmails] = useState<EmailJob[]>([]);
  const [sentLoading, setSentLoading] = useState(false);
  const [sentTotal, setSentTotal] = useState(0);
  const [sentSearch, setSentSearch] = useState('');
  const [sentPage, setSentPage] = useState(1);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, description?: string) => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, description }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch Stats & Global State
  const loadGlobalData = useCallback(async () => {
    try {
      const [statsData, sendersData, slackData] = await Promise.all([
        apiClient.getStats().catch(() => null),
        apiClient.getSenders().catch(() => []),
        apiClient.getSlackStatus().catch(() => null),
      ]);

      if (statsData) setStats(statsData);
      if (sendersData) setSenders(sendersData);
      if (slackData) setSlackStatus(slackData);
    } catch (err) {
      console.error('Error loading global data:', err);
    }
  }, []);

  // Fetch Scheduled Emails
  const loadScheduledEmails = useCallback(async () => {
    setScheduledLoading(true);
    try {
      const res = await apiClient.getScheduledEmails({
        q: scheduledSearch,
        page: scheduledPage,
        limit: 15,
      });
      setScheduledEmails(res.data);
      setScheduledTotal(res.total);
    } catch (err) {
      console.error('Error fetching scheduled emails:', err);
    } finally {
      setScheduledLoading(false);
    }
  }, [scheduledSearch, scheduledPage]);

  // Fetch Sent Emails
  const loadSentEmails = useCallback(async () => {
    setSentLoading(true);
    try {
      const res = await apiClient.getSentEmails({
        q: sentSearch,
        page: sentPage,
        limit: 15,
      });
      setSentEmails(res.data);
      setSentTotal(res.total);
    } catch (err) {
      console.error('Error fetching sent emails:', err);
    } finally {
      setSentLoading(false);
    }
  }, [sentSearch, sentPage]);

  // Initial Load and Polling
  useEffect(() => {
    if (!user) return;

    loadGlobalData();
    loadScheduledEmails();
    loadSentEmails();

    // Auto-refresh interval (polling every 4 seconds for live worker updates)
    const interval = setInterval(() => {
      loadGlobalData();
      if (activeTab === 'scheduled') {
        loadScheduledEmails();
      } else {
        loadSentEmails();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [user, activeTab, loadGlobalData, loadScheduledEmails, loadSentEmails]);

  // Actions
  const handleCancelEmail = async (id: string) => {
    try {
      await apiClient.cancelEmail(id);
      addToast('success', 'Email Cancelled', 'The job was removed from the BullMQ delayed queue.');
      loadScheduledEmails();
      loadGlobalData();
    } catch (err: any) {
      addToast('error', 'Failed to Cancel Email', err.response?.data?.error || err.message);
    }
  };

  const handleSendNow = async (id: string) => {
    try {
      await apiClient.sendNow(id);
      addToast('success', 'Email Dispatched', 'Bypassed remaining delay and sent to BullMQ worker.');
      loadScheduledEmails();
      loadSentEmails();
      loadGlobalData();
    } catch (err: any) {
      addToast('error', 'Failed to Send Now', err.response?.data?.error || err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('reachinbox_user');
    setUser(null);
    addToast('info', 'Logged Out', 'You have been signed out successfully.');
  };

  if (!user) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <LoginView
          onLoginSuccess={(u) => {
            setUser(u);
            addToast('success', `Welcome back, ${u.name}!`, 'Signed in successfully.');
          }}
          onErrorToast={(title, desc) => addToast('error', title, desc)}
          googleClientId={GOOGLE_CLIENT_ID}
        />
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </GoogleOAuthProvider>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen flex flex-col">
        {/* Top Header */}
        <Header
          user={user}
          onLogout={handleLogout}
          onOpenCompose={() => setIsComposeOpen(true)}
          onOpenSlack={() => setIsSlackOpen(true)}
          onOpenSenders={() => setIsSendersOpen(true)}
          slackStatus={slackStatus}
          queueStats={stats?.queue || null}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Summary Metric Widgets */}
          <StatsCards stats={stats} />

          {/* Main Navigation Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-900/80 border border-white/10 w-fit">
              <button
                onClick={() => setActiveTab('scheduled')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'scheduled'
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Scheduled Emails</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    activeTab === 'scheduled' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {stats?.totals.scheduled ?? scheduledTotal}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('sent')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'sent'
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>Sent Emails</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    activeTab === 'sent' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {stats?.totals.sent ?? sentTotal}
                </span>
              </button>
            </div>

            {/* Quick Senders & Queue quick-stats */}
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                BullMQ: <strong className="text-white">Active</strong>
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                SMTP: <strong className="text-white">Ethereal Live</strong>
              </span>
            </div>
          </div>

          {/* Active Tab View */}
          {activeTab === 'scheduled' ? (
            <ScheduledTable
              emails={scheduledEmails}
              loading={scheduledLoading}
              total={scheduledTotal}
              searchQuery={scheduledSearch}
              onSearchChange={(q) => {
                setScheduledSearch(q);
                setScheduledPage(1);
              }}
              onCancel={handleCancelEmail}
              onSendNow={handleSendNow}
              onOpenCompose={() => setIsComposeOpen(true)}
              onRefresh={() => {
                loadScheduledEmails();
                loadGlobalData();
              }}
              page={scheduledPage}
              limit={15}
              onPageChange={setScheduledPage}
            />
          ) : (
            <SentTable
              emails={sentEmails}
              loading={sentLoading}
              total={sentTotal}
              searchQuery={sentSearch}
              onSearchChange={(q) => {
                setSentSearch(q);
                setSentPage(1);
              }}
              onRefresh={() => {
                loadSentEmails();
                loadGlobalData();
              }}
              page={sentPage}
              limit={15}
              onPageChange={setSentPage}
            />
          )}
        </main>

        {/* Compose Modal */}
        <ComposeModal
          isOpen={isComposeOpen}
          onClose={() => setIsComposeOpen(false)}
          senders={senders}
          onScheduleApi={apiClient.scheduleEmails}
          onScheduleSuccess={(count) => {
            addToast(
              'success',
              'Campaign Scheduled Successfully!',
              `${count} email(s) queued with BullMQ delayed job persistence.`
            );
            loadScheduledEmails();
            loadGlobalData();
          }}
          onScheduleError={(err) => addToast('error', 'Scheduling Failed', err)}
        />

        {/* Slack Integration Modal */}
        <SlackModal
          isOpen={isSlackOpen}
          onClose={() => setIsSlackOpen(false)}
          status={slackStatus}
          onConnectWebhook={async (url, ch) => {
            await apiClient.connectSlackWebhook(url, ch);
            loadGlobalData();
          }}
          onDisconnect={async () => {
            await apiClient.disconnectSlack();
            loadGlobalData();
          }}
          onSendTest={async () => {
            const res = await apiClient.sendSlackTest();
            return res.message;
          }}
          onSuccessToast={(title, desc) => addToast('success', title, desc)}
          onErrorToast={(title, desc) => addToast('error', title, desc)}
        />

        {/* Senders & Rate Limits Modal */}
        <SendersModal
          isOpen={isSendersOpen}
          onClose={() => setIsSendersOpen(false)}
          senders={senders}
          telemetry={stats?.sendersTelemetry || []}
          onCreateSender={async (name, email, limit) => {
            await apiClient.createSender({ name, email, hourlyLimit: limit });
            loadGlobalData();
          }}
          onUpdateLimit={async (id, limit) => {
            await apiClient.updateSenderLimit(id, limit);
            loadGlobalData();
          }}
          onSuccessToast={(title, desc) => addToast('success', title, desc)}
          onErrorToast={(title, desc) => addToast('error', title, desc)}
        />

        {/* Toast Notification Container */}
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </div>
    </GoogleOAuthProvider>
  );
};

export default App;
