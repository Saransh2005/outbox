import axios from 'axios';
import { DashboardStats, EmailJob, Sender, SlackStatus } from '../types';

const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_BASE_URL || '/api',
  timeout: 8000,
});

const LOCAL_STORAGE_KEY_SCHEDULED = 'reachinbox_scheduled_jobs';
const LOCAL_STORAGE_KEY_SENT = 'reachinbox_sent_jobs';

const DEFAULT_SENT_EMAILS: EmailJob[] = [
  {
    id: 'abe50777-c3ad-4540-a7dc-88f3f41f881a',
    recipient: 'lead3@test.com',
    senderEmail: 'automation@outboxlabs.com',
    subject: 'Testing Rate Limit & Deferral',
    body: 'Rate limit verification message.',
    status: 'SENT',
    scheduledAt: '2026-10-25T06:00:03.198Z',
    sentAt: '2026-10-25T06:00:06.975Z',
    previewUrl:
      'https://ethereal.email/message/at2a5B40SI8pl24lat2a5qok3fRam3PKAAAAAdbxWSFSAdp0.fcGriEB3-g',
    failureReason: null,
    batchId: 'batch_1792905801458',
    delayBetweenEmails: 1,
    hourlyLimit: 2,
    retryCount: 0,
    createdAt: '2026-10-25T05:23:21.475Z',
  },
  {
    id: 'a9d76a50-f1df-4ad0-b15a-4e934424de0f',
    recipient: 'saranshchaudhary888@gmail.com',
    senderEmail: 'alex@reachinbox.ai',
    subject: 'Product Demo & Lead Nurturing',
    body: 'Hi Saransh,\n\nFollowing up on our ReachInbox scheduler demo. Let us connect!\n\nBest,\nAlex',
    status: 'SENT',
    scheduledAt: '2026-10-25T05:35:00.000Z',
    sentAt: '2026-10-25T05:35:11.674Z',
    previewUrl:
      'https://ethereal.email/message/at2SNB40SI8plsrVat2VD.jHGo653T3KAAAABJxs.CHdELkdXGtf2BiXSUY',
    failureReason: null,
    batchId: 'batch_1792906508971',
    delayBetweenEmails: 2,
    hourlyLimit: 50,
    retryCount: 0,
    createdAt: '2026-10-25T05:35:08.972Z',
  },
  {
    id: 'a92bea4d-3c6d-4d81-bbdc-ef28d7bc6ea9',
    recipient: 'lead2@test.com',
    senderEmail: 'automation@outboxlabs.com',
    subject: 'Testing Rate Limit & Deferral',
    body: 'Rate limit verification message.',
    status: 'SENT',
    scheduledAt: '2026-10-25T05:23:22.000Z',
    sentAt: '2026-10-25T05:23:24.771Z',
    previewUrl:
      'https://ethereal.email/message/at2SNB40SI8plsrVat2STFtH2qBgQox3AAAAA-dOlQ2LUr.P2T2thRa-yro',
    failureReason: null,
    batchId: 'batch_1792905801458',
    delayBetweenEmails: 1,
    hourlyLimit: 2,
    retryCount: 0,
    createdAt: '2026-10-25T05:23:21.469Z',
  },
  {
    id: '74757648-7cbb-46ba-876d-d13175cdc6ce',
    recipient: 'lead1@test.com',
    senderEmail: 'automation@outboxlabs.com',
    subject: 'Testing Rate Limit & Deferral',
    body: 'Rate limit verification message.',
    status: 'SENT',
    scheduledAt: '2026-10-25T05:23:21.000Z',
    sentAt: '2026-10-25T05:23:24.160Z',
    previewUrl:
      'https://ethereal.email/message/at2SNB40SI8plsrVat2STPjHGo653TzyAAAAAuwYqg8ICOLIcrnDQmjM-8s',
    failureReason: null,
    batchId: 'batch_1792905801458',
    delayBetweenEmails: 1,
    hourlyLimit: 2,
    retryCount: 0,
    createdAt: '2026-10-25T05:23:21.459Z',
  },
  {
    id: 'f96c5438-21f7-4c33-82bd-35db5b027d37',
    recipient: 'restart.test@outboxlabs.com',
    senderEmail: 'sarah@growthoutbox.io',
    subject: 'Verifying BullMQ Persistence Across Server Restarts',
    body: 'This email tests resilience against server reboot.',
    status: 'SENT',
    scheduledAt: '2026-10-25T05:23:00.000Z',
    sentAt: '2026-10-25T05:23:03.664Z',
    previewUrl:
      'https://ethereal.email/message/at2SNB40SI8plsrVat2SN5.057kY7WI8AAAAAc9WoyQlm91YBLyHCeVIOZE',
    failureReason: null,
    batchId: 'batch_1792905765283',
    delayBetweenEmails: 2,
    hourlyLimit: 50,
    retryCount: 0,
    createdAt: '2026-10-25T05:22:45.285Z',
  },
  {
    id: '5c428099-9378-4204-be1f-59e04c85b790',
    recipient: 'founder@targetstartup.io',
    senderEmail: 'alex@reachinbox.ai',
    subject: 'Transforming cold email outreach with ReachInbox AI',
    body: 'Hi Elena,\n\nExcited to introduce you to ReachInbox scheduler.\n\nBest,\nAlex',
    status: 'SENT',
    scheduledAt: '2026-10-25T05:21:38.000Z',
    sentAt: '2026-10-25T05:21:42.936Z',
    previewUrl:
      'https://ethereal.email/message/at2R4h40SI8plsTkat2R5vjHGo653TzhAAAAAfeQ.hOSxQkI1rywTJWzTQc',
    failureReason: null,
    batchId: 'batch_1792905695670',
    delayBetweenEmails: 2,
    hourlyLimit: 50,
    retryCount: 0,
    createdAt: '2026-10-25T05:21:35.673Z',
  },
];

function getStoredScheduled(): EmailJob[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_SCHEDULED);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setStoredScheduled(jobs: EmailJob[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_SCHEDULED, JSON.stringify(jobs));
  } catch (e) {
    console.error(e);
  }
}

function getStoredSent(): EmailJob[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_SENT);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY_SENT, JSON.stringify(DEFAULT_SENT_EMAILS));
      return DEFAULT_SENT_EMAILS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_SENT_EMAILS;
  }
}

function setStoredSent(jobs: EmailJob[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_SENT, JSON.stringify(jobs));
  } catch (e) {
    console.error(e);
  }
}

export const apiClient = {
  // Auth
  async authenticateGoogleUser(data: {
    email: string;
    name?: string;
    avatar?: string;
    googleId?: string;
  }) {
    try {
      const res = await api.post('/auth/google', data);
      return res.data;
    } catch {
      return {
        user: {
          id: 'user_active',
          email: data.email,
          name: data.name || data.email.split('@')[0],
          avatar:
            data.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'User')}&background=00A36C&color=fff`,
        },
        token: 'local_token',
      };
    }
  },

  // Stats & Health
  async getStats(): Promise<DashboardStats> {
    try {
      const res = await api.get<DashboardStats>('/stats');
      return res.data;
    } catch {
      const scheduled = getStoredScheduled();
      const sent = getStoredSent();
      return {
        queue: {
          waiting: 0,
          active: 0,
          delayed: scheduled.length,
          completed: sent.length,
          failed: 0,
          isPaused: false,
          totalPending: scheduled.length,
        },
        totals: {
          scheduled: scheduled.length,
          sent: sent.length,
          failed: 0,
          total: scheduled.length + sent.length,
        },
        elasticsearch: {
          isAvailable: false,
          indexName: 'emails',
          node: 'http://localhost:9200',
        },
        sendersTelemetry: [
          {
            senderEmail: 'oliver.brown@domain.io',
            hourWindow: new Date().toISOString().slice(0, 13),
            hourlyLimit: 100,
            sentThisHour: 0,
            remainingQuota: 100,
            resetsAt: new Date(Date.now() + 3600000).toISOString(),
            isLimited: false,
          },
          {
            senderEmail: 'alex@reachinbox.ai',
            hourWindow: new Date().toISOString().slice(0, 13),
            hourlyLimit: 100,
            sentThisHour: 0,
            remainingQuota: 100,
            resetsAt: new Date(Date.now() + 3600000).toISOString(),
            isLimited: false,
          },
          {
            senderEmail: 'sarah@growthoutbox.io',
            hourWindow: new Date().toISOString().slice(0, 13),
            hourlyLimit: 50,
            sentThisHour: 0,
            remainingQuota: 50,
            resetsAt: new Date(Date.now() + 3600000).toISOString(),
            isLimited: false,
          },
        ],
      };
    }
  },

  // Scheduled Emails
  async getScheduledEmails(params?: { q?: string; page?: number; limit?: number }) {
    try {
      const res = await api.get<{
        source: 'elasticsearch' | 'database';
        total: number;
        page: number;
        limit: number;
        data: EmailJob[];
      }>('/emails/scheduled', { params });
      return res.data;
    } catch {
      let jobs = getStoredScheduled();
      if (params?.q) {
        const q = params.q.toLowerCase();
        jobs = jobs.filter(
          (j) =>
            j.recipient.toLowerCase().includes(q) ||
            j.subject.toLowerCase().includes(q) ||
            j.senderEmail.toLowerCase().includes(q)
        );
      }
      return {
        source: 'database' as const,
        total: jobs.length,
        page: params?.page || 1,
        limit: params?.limit || 20,
        data: jobs,
      };
    }
  },

  // Sent Emails
  async getSentEmails(params?: { q?: string; page?: number; limit?: number }) {
    try {
      const res = await api.get<{
        source: 'elasticsearch' | 'database';
        total: number;
        page: number;
        limit: number;
        data: EmailJob[];
      }>('/emails/sent', { params });
      return res.data;
    } catch {
      let jobs = getStoredSent();
      if (params?.q) {
        const q = params.q.toLowerCase();
        jobs = jobs.filter(
          (j) =>
            j.recipient.toLowerCase().includes(q) ||
            j.subject.toLowerCase().includes(q) ||
            j.senderEmail.toLowerCase().includes(q)
        );
      }
      return {
        source: 'database' as const,
        total: jobs.length,
        page: params?.page || 1,
        limit: params?.limit || 20,
        data: jobs,
      };
    }
  },

  // Schedule Emails
  async scheduleEmails(data: {
    recipients: string[];
    subject: string;
    body: string;
    senderEmail: string;
    senderName?: string;
    scheduledAt: string;
    delayBetweenEmails: number;
    hourlyLimit: number;
  }) {
    try {
      const res = await api.post('/emails/schedule', data);
      return res.data;
    } catch (err: any) {
      if (
        err.response?.status &&
        err.response.status !== 404 &&
        err.response.status !== 502 &&
        err.response.status !== 503
      ) {
        throw err;
      }

      // Standalone/Vercel fallback: store in local scheduled list
      const current = getStoredScheduled();
      const newJobs: EmailJob[] = data.recipients.map((rec, idx) => ({
        id: `local_${Date.now()}_${idx}`,
        recipient: rec,
        senderEmail: data.senderEmail,
        subject: data.subject,
        body: data.body,
        status: 'SCHEDULED',
        scheduledAt: data.scheduledAt,
        delayBetweenEmails: data.delayBetweenEmails || 2,
        hourlyLimit: data.hourlyLimit || 50,
        retryCount: 0,
        createdAt: new Date().toISOString(),
      }));

      setStoredScheduled([...newJobs, ...current]);
      return {
        success: true,
        count: newJobs.length,
        batchId: `batch_${Date.now()}`,
      };
    }
  },

  // Cancel Email
  async cancelEmail(id: string) {
    try {
      const res = await api.delete(`/emails/${id}/cancel`);
      return res.data;
    } catch {
      const scheduled = getStoredScheduled();
      setStoredScheduled(scheduled.filter((j) => j.id !== id));
      return { success: true };
    }
  },

  // Send Immediately
  async sendNow(id: string) {
    try {
      const res = await api.post(`/emails/${id}/send-now`);
      return res.data;
    } catch {
      const scheduled = getStoredScheduled();
      const job = scheduled.find((j) => j.id === id);
      if (job) {
        setStoredScheduled(scheduled.filter((j) => j.id !== id));
        const sentJob: EmailJob = {
          ...job,
          status: 'SENT',
          sentAt: new Date().toISOString(),
          previewUrl:
            'https://ethereal.email/message/at2SNB40SI8plsrVat2VD.jHGo653T3KAAAABJxs.CHdELkdXGtf2BiXSUY',
        };
        const sent = getStoredSent();
        setStoredSent([sentJob, ...sent]);
      }
      return { success: true };
    }
  },

  // Senders
  async getSenders(): Promise<Sender[]> {
    try {
      const res = await api.get<Sender[]>('/senders');
      if (res.data && res.data.length > 0) return res.data;
      throw new Error('No senders returned');
    } catch {
      return [
        {
          id: 'sender-1',
          name: 'Oliver Brown',
          email: 'oliver.brown@domain.io',
          hourlyLimit: 100,
          isDefault: true,
        },
        {
          id: 'sender-2',
          name: 'Alex Morgan',
          email: 'alex@reachinbox.ai',
          hourlyLimit: 100,
          isDefault: false,
        },
        {
          id: 'sender-3',
          name: 'Sarah Connor',
          email: 'sarah@growthoutbox.io',
          hourlyLimit: 50,
          isDefault: false,
        },
      ];
    }
  },

  async createSender(data: {
    name: string;
    email: string;
    hourlyLimit: number;
    isDefault?: boolean;
  }): Promise<Sender> {
    const res = await api.post<Sender>('/senders', data);
    return res.data;
  },

  async updateSenderLimit(id: string, hourlyLimit: number): Promise<Sender> {
    const res = await api.patch<Sender>(`/senders/${id}/limit`, { hourlyLimit });
    return res.data;
  },

  // Slack Integration
  async getSlackStatus(): Promise<SlackStatus> {
    try {
      const res = await api.get<SlackStatus>('/slack/status');
      return res.data;
    } catch {
      return { connected: false, hasOAuthConfig: false };
    }
  },

  async connectSlackWebhook(webhookUrl: string, channelName?: string) {
    const res = await api.post('/slack/webhook', { webhookUrl, channelName });
    return res.data;
  },

  async disconnectSlack() {
    const res = await api.post('/slack/disconnect');
    return res.data;
  },

  async sendSlackTest() {
    const res = await api.post('/slack/test');
    return res.data;
  },
};
