import { Queue } from 'bullmq';
import { getBullMQConnection } from '../config/redis';
import { CONFIG } from '../config/constants';
import { prisma } from '../config/prisma';
import { EmailStatus } from '@prisma/client';

export interface EmailJobData {
  emailJobId: string;
  senderEmail: string;
  senderName?: string;
  recipient: string;
  subject: string;
  body: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  scheduledAt: string;
}

export const emailQueue = new Queue<EmailJobData>(CONFIG.QUEUE_NAME, {
  connection: getBullMQConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: false, // Keep completed jobs in Redis for Bull-board inspection
    removeOnFail: false,     // Keep failed jobs for inspection
  },
});

class QueueService {
  /**
   * Adds an email job to BullMQ with a calculated delay.
   * Uses deterministic jobId `email_job_${emailJobId}` for strict idempotency.
   */
  async scheduleEmailJob(data: EmailJobData, targetTime: Date): Promise<string> {
    const now = Date.now();
    const delay = Math.max(0, targetTime.getTime() - now);
    const jobId = `email_job_${data.emailJobId}`;

    const job = await emailQueue.add('send-email', data, {
      delay,
      jobId, // Idempotent key
    });

    console.log(
      `[Queue] Enqueued job ${job.id} for recipient ${data.recipient} with delay ${delay}ms (target: ${targetTime.toISOString()})`
    );

    return job.id!;
  }

  /**
   * Reschedules an existing job to a new time
   */
  async rescheduleJob(emailJobId: string, data: EmailJobData, newDelayMs: number): Promise<string> {
    const existingJobId = `email_job_${emailJobId}`;

    // Remove existing if present
    const existingJob = await emailQueue.getJob(existingJobId);
    if (existingJob) {
      try {
        await existingJob.remove();
      } catch (err: any) {
        console.warn(`[Queue] Could not remove old job before reschedule: ${err.message}`);
      }
    }

    // Add new job with delay
    const job = await emailQueue.add('send-email', data, {
      delay: newDelayMs,
      jobId: existingJobId,
    });

    console.log(`[Queue] Rescheduled job ${job.id} to run in ${newDelayMs}ms`);
    return job.id!;
  }

  /**
   * Cancels a scheduled job
   */
  async cancelJob(bullJobId: string): Promise<boolean> {
    try {
      const job = await emailQueue.getJob(bullJobId);
      if (job) {
        await job.remove();
        console.log(`[Queue] Removed job ${bullJobId} from BullMQ queue.`);
        return true;
      }
      return false;
    } catch (err: any) {
      console.error(`[Queue] Failed to remove job ${bullJobId}:`, err.message);
      return false;
    }
  }

  /**
   * Server restart reconciliation:
   * Scans PostgreSQL for all SCHEDULED email jobs.
   * If a job is missing from BullMQ or if server rebooted while emails were waiting,
   * ensures they are accurately enqueued in BullMQ without duplicates or resets.
   */
  async reconcileScheduledJobs(): Promise<void> {
    console.log('🔄 [Queue] Running server restart persistence reconciliation...');

    try {
      const scheduledEmails = await prisma.emailJob.findMany({
        where: {
          status: EmailStatus.SCHEDULED,
        },
      });

      console.log(`[Queue] Found ${scheduledEmails.length} pending scheduled emails in database.`);

      let reconciledCount = 0;

      for (const email of scheduledEmails) {
        const expectedJobId = `email_job_${email.id}`;
        const existingJob = await emailQueue.getJob(expectedJobId);

        const isJobActiveOrDelayed =
          existingJob &&
          (await existingJob.getState()) !== 'completed' &&
          (await existingJob.getState()) !== 'failed';

        if (!existingJob || !isJobActiveOrDelayed) {
          const now = Date.now();
          const targetTime = email.scheduledAt.getTime();
          // If scheduled time already passed, send immediately (delay: 0), otherwise remaining delay
          const delay = Math.max(0, targetTime - now);

          const jobData: EmailJobData = {
            emailJobId: email.id,
            senderEmail: email.senderEmail,
            recipient: email.recipient,
            subject: email.subject,
            body: email.body,
            delayBetweenEmails: email.delayBetweenEmails,
            hourlyLimit: email.hourlyLimit,
            scheduledAt: email.scheduledAt.toISOString(),
          };

          await emailQueue.add('send-email', jobData, {
            delay,
            jobId: expectedJobId,
          });

          // Ensure DB has matching bullJobId
          if (email.bullJobId !== expectedJobId) {
            await prisma.emailJob.update({
              where: { id: email.id },
              data: { bullJobId: expectedJobId },
            });
          }

          reconciledCount++;
        }
      }

      console.log(
        `✅ [Queue] Persistence reconciliation complete. ${reconciledCount} jobs reconciled and ready.`
      );
    } catch (err: any) {
      console.error('❌ [Queue] Error during restart reconciliation:', err.message);
    }
  }

  /**
   * Fetches real-time queue health counts for dashboard
   */
  async getQueueStats() {
    const [waiting, active, delayed, completed, failed, paused] = await Promise.all([
      emailQueue.getWaitingCount(),
      emailQueue.getActiveCount(),
      emailQueue.getDelayedCount(),
      emailQueue.getCompletedCount(),
      emailQueue.getFailedCount(),
      emailQueue.isPaused(),
    ]);

    return {
      waiting,
      active,
      delayed,
      completed,
      failed,
      isPaused: paused,
      totalPending: waiting + delayed + active,
    };
  }
}

export const queueService = new QueueService();
