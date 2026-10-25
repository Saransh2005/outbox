export type EmailStatus = 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED';

export interface EmailJob {
  id: string;
  recipient: string;
  senderEmail: string;
  subject: string;
  body: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt?: string | null;
  previewUrl?: string | null;
  failureReason?: string | null;
  batchId?: string | null;
  delayBetweenEmails: number;
  hourlyLimit: number;
  retryCount?: number;
  createdAt: string;
}

export interface Sender {
  id: string;
  name: string;
  email: string;
  isDefault: boolean;
  hourlyLimit: number;
}

export interface SenderTelemetry {
  senderEmail: string;
  hourWindow: string;
  hourlyLimit: number;
  sentThisHour: number;
  remainingQuota: number;
  resetsAt: string;
  isLimited: boolean;
}

export interface QueueStats {
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
  isPaused: boolean;
  totalPending: number;
}

export interface DashboardStats {
  queue: QueueStats;
  totals: {
    scheduled: number;
    sent: number;
    failed: number;
    total: number;
  };
  elasticsearch: {
    isAvailable: boolean;
    indexName: string;
    node: string;
  };
  sendersTelemetry: SenderTelemetry[];
}

export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  googleId?: string;
}

export interface SlackStatus {
  connected: boolean;
  channelName?: string;
  teamName?: string;
  maskedUrl?: string;
  hasOAuthConfig: boolean;
}
