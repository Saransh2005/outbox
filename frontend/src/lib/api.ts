import axios from 'axios';
import { DashboardStats, EmailJob, Sender, SlackStatus } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const apiClient = {
  // Auth
  async authenticateGoogleUser(data: {
    email: string;
    name?: string;
    avatar?: string;
    googleId?: string;
  }) {
    const res = await api.post('/auth/google', data);
    return res.data;
  },

  // Stats & Health
  async getStats(): Promise<DashboardStats> {
    const res = await api.get<DashboardStats>('/stats');
    return res.data;
  },

  // Scheduled Emails
  async getScheduledEmails(params?: { q?: string; page?: number; limit?: number }) {
    const res = await api.get<{
      source: 'elasticsearch' | 'database';
      total: number;
      page: number;
      limit: number;
      data: EmailJob[];
    }>('/emails/scheduled', { params });
    return res.data;
  },

  // Sent Emails
  async getSentEmails(params?: { q?: string; page?: number; limit?: number }) {
    const res = await api.get<{
      source: 'elasticsearch' | 'database';
      total: number;
      page: number;
      limit: number;
      data: EmailJob[];
    }>('/emails/sent', { params });
    return res.data;
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
    const res = await api.post('/emails/schedule', data);
    return res.data;
  },

  // Cancel Email
  async cancelEmail(id: string) {
    const res = await api.delete(`/emails/${id}/cancel`);
    return res.data;
  },

  // Send Immediately
  async sendNow(id: string) {
    const res = await api.post(`/emails/${id}/send-now`);
    return res.data;
  },

  // Senders
  async getSenders(): Promise<Sender[]> {
    const res = await api.get<Sender[]>('/senders');
    return res.data;
  },

  async createSender(data: { name: string; email: string; hourlyLimit: number; isDefault?: boolean }): Promise<Sender> {
    const res = await api.post<Sender>('/senders', data);
    return res.data;
  },

  async updateSenderLimit(id: string, hourlyLimit: number): Promise<Sender> {
    const res = await api.patch<Sender>(`/senders/${id}/limit`, { hourlyLimit });
    return res.data;
  },

  // Slack Integration
  async getSlackStatus(): Promise<SlackStatus> {
    const res = await api.get<SlackStatus>('/slack/status');
    return res.data;
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
