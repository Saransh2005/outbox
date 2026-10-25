import { Worker, Job } from 'bullmq';
import { getBullMQConnection } from '../config/redis';
import { CONFIG } from '../config/constants';
import { prisma } from '../config/prisma';
import { EmailJobData, emailQueue } from '../services/queueService';
import { rateLimitService } from '../services/rateLimitService';
import { smtpService } from '../services/smtpService';
import { elasticSearchService } from '../services/elasticSearchService';
import { EmailStatus } from '@prisma/client';

export class EmailWorker {
  private worker: Worker<EmailJobData>;

  constructor() {
    console.log(
      `[Worker] Initializing Email Worker with concurrency = ${CONFIG.WORKER_CONCURRENCY}...`
    );

    this.worker = new Worker<EmailJobData>(
      CONFIG.QUEUE_NAME,
      async (job: Job<EmailJobData>) => {
        return this.processEmailJob(job);
      },
      {
        connection: getBullMQConnection(),
        concurrency: CONFIG.WORKER_CONCURRENCY,
      }
    );

    this.setupListeners();
  }

  /**
   * Main processor for each email job
   */
  private async processEmailJob(job: Job<EmailJobData>) {
    const { emailJobId, senderEmail, senderName, recipient, subject, body, delayBetweenEmails, hourlyLimit } =
      job.data;

    console.log(
      `\n🚀 [Worker] Processing Job ID: ${job.id} | Email ID: ${emailJobId} | To: ${recipient} | Sender: ${senderEmail}`
    );

    // 1. Idempotency Check: Fetch latest status from PostgreSQL
    const emailRecord = await prisma.emailJob.findUnique({
      where: { id: emailJobId },
    });

    if (!emailRecord) {
      console.warn(`[Worker] Email record ${emailJobId} not found in database. Skipping.`);
      return { status: 'NOT_FOUND' };
    }

    if (emailRecord.status === EmailStatus.CANCELLED) {
      console.log(`[Worker] Email ${emailJobId} was cancelled by user. Skipping.`);
      return { status: 'CANCELLED' };
    }

    if (emailRecord.status === EmailStatus.SENT) {
      console.log(`[Worker] Email ${emailJobId} was already sent. Skipping for idempotency.`);
      return { status: 'ALREADY_SENT', previewUrl: emailRecord.previewUrl };
    }

    // 2. Check Hourly Rate Limit across multiple workers / instances (atomic Redis counter)
    const rateLimit = await rateLimitService.checkAndIncrement(
      senderEmail,
      hourlyLimit || CONFIG.DEFAULT_HOURLY_LIMIT,
      recipient,
      subject
    );

    if (!rateLimit.allowed) {
      console.warn(
        `⏳ [Worker] Sender ${senderEmail} reached limit (${hourlyLimit}/hr). Rescheduling email ${emailJobId} to next window: ${rateLimit.rescheduledTo?.toISOString()}`
      );

      // Update DB record with new scheduled time and keep status SCHEDULED
      await prisma.emailJob.update({
        where: { id: emailJobId },
        data: {
          scheduledAt: rateLimit.rescheduledTo!,
          metadata: {
            deferredDueToRateLimit: true,
            rescheduledAt: new Date().toISOString(),
          },
        },
      });

      // Reschedule in BullMQ with remaining delay to next hour window
      const newBullJobId = `email_job_${emailJobId}_defer_${Date.now()}`;
      await emailQueue.add('send-email', job.data, {
        delay: rateLimit.rescheduleDelayMs || 3600000,
        jobId: newBullJobId,
      });

      await prisma.emailJob.update({
        where: { id: emailJobId },
        data: { bullJobId: newBullJobId },
      });

      return {
        status: 'DEFERRED_RATE_LIMIT',
        rescheduledTo: rateLimit.rescheduledTo,
      };
    }

    // 3. Enforce minimum pacing delay between consecutive sends for this sender
    const pacingSeconds = delayBetweenEmails ?? CONFIG.DEFAULT_MIN_DELAY_SECONDS;
    await rateLimitService.enforcePacingDelay(senderEmail, pacingSeconds);

    // 4. Update status to SENDING in DB
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: { status: EmailStatus.SENDING },
    });

    try {
      // 5. Send Email via fake SMTP (Ethereal Email)
      const sendResult = await smtpService.sendMail({
        senderEmail,
        senderName,
        recipient,
        subject,
        body,
      });

      const sentTime = new Date();

      // 6. Update PostgreSQL to SENT with preview URL
      const updatedEmail = await prisma.emailJob.update({
        where: { id: emailJobId },
        data: {
          status: EmailStatus.SENT,
          sentAt: sentTime,
          previewUrl: sendResult.previewUrl || null,
        },
      });

      // 7. Record last sent timestamp in Redis for pacing
      await rateLimitService.recordSend(senderEmail);

      // 8. Index sent email in Elasticsearch
      await elasticSearchService.indexEmail(updatedEmail);

      console.log(
        `✅ [Worker] Sent email ${emailJobId} to ${recipient}! Ethereal Preview: ${sendResult.previewUrl || 'N/A'}`
      );

      return {
        status: 'SUCCESS',
        previewUrl: sendResult.previewUrl,
        sentAt: sentTime,
      };
    } catch (err: any) {
      console.error(`❌ [Worker] Failed to send email ${emailJobId}:`, err.message);

      const failedEmail = await prisma.emailJob.update({
        where: { id: emailJobId },
        data: {
          status: EmailStatus.FAILED,
          failureReason: err.message,
          retryCount: { increment: 1 },
        },
      });

      await elasticSearchService.indexEmail(failedEmail);

      throw err;
    }
  }

  private setupListeners() {
    this.worker.on('completed', (job: Job) => {
      console.log(`[Worker] Job ${job.id} completed successfully.`);
    });

    this.worker.on('failed', (job: Job | undefined, err: Error) => {
      console.error(`[Worker] Job ${job?.id} failed with error:`, err.message);
    });

    this.worker.on('error', (err: Error) => {
      console.error('[Worker] Worker internal error:', err.message);
    });
  }

  async close() {
    await this.worker.close();
    console.log('[Worker] Worker stopped gracefully.');
  }
}
