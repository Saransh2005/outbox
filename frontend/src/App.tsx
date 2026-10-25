import React, { useState, useEffect, useCallback } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { UserProfile, DashboardStats, Sender, SlackStatus, EmailJob } from './types';
import { apiClient } from './lib/api';
import { Sidebar } from './components/Sidebar';
import { EmailListView } from './components/EmailListView';
import { ComposeView } from './components/ComposeView';
import { EmailDetailView } from './components/EmailDetailView';
import { SlackModal } from './components/SlackModal';
import { SendersModal } from './components/SendersModal';
import { LoginView } from './components/LoginView';
import { ToastContainer, ToastMessage } from './components/Toast';

const GOOGLE_CLIENT_ID =
  (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
  '1029384756-reachinbox-mock-oauth-client.apps.googleusercontent.com';

export const App: React.FC = () => {
  // Auth state - starts null so user sees Login Screen first
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('reachinbox_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Current view: 'inbox' | 'compose' | 'detail'
  const [currentView, setCurrentView] = useState<'inbox' | 'compose' | 'detail'>('inbox');
  const [selectedEmail, setSelectedEmail] = useState<EmailJob | null>(null);

  // Active tab in inbox: 'scheduled' | 'sent'
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');

  // Modals state
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

  // Sent emails
  const [sentEmails, setSentEmails] = useState<EmailJob[]>([]);
  const [sentLoading, setSentLoading] = useState(false);
  const [sentTotal, setSentTotal] = useState(0);
  const [sentSearch, setSentSearch] = useState('');

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, description?: any) => {
    const id = `${Date.now()}_${Math.random()}`;
    const descStr =
      typeof description === 'object'
        ? description?.message || JSON.stringify(description)
        : typeof description === 'string'
        ? description
        : '';
    setToasts((prev) => [...prev, { id, type, title: String(title || ''), description: descStr }]);
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
        page: 1,
        limit: 50,
      });
      setScheduledEmails(res.data);
      setScheduledTotal(res.total);
    } catch (err) {
      console.error('Error fetching scheduled emails:', err);
    } finally {
      setScheduledLoading(false);
    }
  }, [scheduledSearch]);

  // Fetch Sent Emails
  const loadSentEmails = useCallback(async () => {
    setSentLoading(true);
    try {
      const res = await apiClient.getSentEmails({
        q: sentSearch,
        page: 1,
        limit: 50,
      });
      setSentEmails(res.data);
      setSentTotal(res.total);
    } catch (err) {
      console.error('Error fetching sent emails:', err);
    } finally {
      setSentLoading(false);
    }
  }, [sentSearch]);

  // Initial Load and Polling
  useEffect(() => {
    if (!user) return;

    loadGlobalData();
    loadScheduledEmails();
    loadSentEmails();

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
      addToast('success', 'Email Dispatched', 'Bypassed delay and sent to worker immediately.');
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
    addToast('info', 'Logged Out', 'You have been signed out.');
  };

  // If not authenticated, show Screen 1 Login
  if (!user) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <LoginView
          onLoginSuccess={(u) => {
            setUser(u);
            addToast('success', `Welcome back, ${u.name}!`);
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
      <div className="flex h-screen bg-white overflow-hidden text-gray-900 font-sans">
        {/* Left Sidebar (Matches Figma across all home screens) */}
        <Sidebar
          user={user}
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setCurrentView('inbox');
          }}
          onOpenCompose={() => setCurrentView('compose')}
          onOpenSlack={() => setIsSlackOpen(true)}
          onOpenSenders={() => setIsSendersOpen(true)}
          onLogout={handleLogout}
          scheduledCount={stats?.totals.scheduled ?? scheduledTotal}
          sentCount={stats?.totals.sent ?? sentTotal}
          slackStatus={slackStatus}
          queueStats={stats?.queue || null}
        />

        {/* Right Main Content Area */}
        {currentView === 'compose' ? (
          /* Screens 5, 6, 7: Compose New Email */
          <ComposeView
            onBack={() => setCurrentView('inbox')}
            senders={senders}
            onScheduleApi={apiClient.scheduleEmails}
            onScheduleSuccess={(count) => {
              addToast(
                'success',
                'Email Scheduled Successfully!',
                `${count} email(s) queued with BullMQ delayed job persistence.`
              );
              loadScheduledEmails();
              loadGlobalData();
              setCurrentView('inbox');
            }}
            onScheduleError={(err) => addToast('error', 'Scheduling Failed', err)}
          />
        ) : currentView === 'detail' && selectedEmail ? (
          /* Screen 4: Email Detail Screen */
          <EmailDetailView
            email={selectedEmail}
            onBack={() => setCurrentView('inbox')}
          />
        ) : (
          /* Screens 2 & 3: Email List (Scheduled or Sent) */
          <EmailListView
            type={activeTab}
            emails={activeTab === 'scheduled' ? scheduledEmails : sentEmails}
            loading={activeTab === 'scheduled' ? scheduledLoading : sentLoading}
            searchQuery={activeTab === 'scheduled' ? scheduledSearch : sentSearch}
            onSearchChange={(q) => {
              if (activeTab === 'scheduled') setScheduledSearch(q);
              else setSentSearch(q);
            }}
            onSelectEmail={(email) => {
              setSelectedEmail(email);
              setCurrentView('detail');
            }}
            onSendNow={activeTab === 'scheduled' ? handleSendNow : undefined}
            onCancel={activeTab === 'scheduled' ? handleCancelEmail : undefined}
            onRefresh={() => {
              if (activeTab === 'scheduled') loadScheduledEmails();
              else loadSentEmails();
              loadGlobalData();
            }}
            onOpenCompose={() => setCurrentView('compose')}
          />
        )}

        {/* Slack Modal */}
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

        {/* Senders & Quotas Modal */}
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

        {/* Toast Container */}
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </div>
    </GoogleOAuthProvider>
  );
};

export default App;
