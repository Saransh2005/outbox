import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { queueService } from '../services/queueService';
import { elasticSearchService } from '../services/elasticSearchService';
import { rateLimitService } from '../services/rateLimitService';
import { CONFIG } from '../config/constants';
import { EmailStatus } from '@prisma/client';

const scheduleSchema = z.object({
  recipients: z.array(z.string().email()).min(1, 'At least one recipient is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  senderEmail: z.string().email('Valid sender email required'),
  senderName: z.string().optional(),
  scheduledAt: z.string().datetime().or(z.string()).refine((val) => !isNaN(Date.parse(val)), {
    message: 'Valid scheduled date/time is required',
  }),
  delayBetweenEmails: z.number().int().min(0).default(CONFIG.DEFAULT_MIN_DELAY_SECONDS),
  hourlyLimit: z.number().int().min(1).default(CONFIG.DEFAULT_HOURLY_LIMIT),
});

export class EmailController {
  /**
   * Schedules one or multiple emails (e.g. from lead upload)
   */
  static async scheduleEmails(req: Request, res: Response) {
    try {
      const parsed = scheduleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
      }

      const { recipients, subject, body, senderEmail, senderName, scheduledAt, delayBetweenEmails, hourlyLimit } =
        parsed.data;

      const baseStartTime = new Date(scheduledAt);
      const batchId = `batch_${Date.now()}`;
      const scheduledRecords = [];

      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i].trim().toLowerCase();

        // Calculate individual staggered target send time (pacing across batch)
        const targetTime = new Date(baseStartTime.getTime() + i * delayBetweenEmails * 1000);

        // Create record in DB
        const emailRecord = await prisma.emailJob.create({
          data: {
            recipient,
            senderEmail,
            subject,
            body,
            status: EmailStatus.SCHEDULED,
            scheduledAt: targetTime,
            batchId,
            delayBetweenEmails,
            hourlyLimit,
          },
        });

        // Enqueue delayed job in BullMQ
        const bullJobId = await queueService.scheduleEmailJob(
          {
            emailJobId: emailRecord.id,
            senderEmail,
            senderName,
            recipient,
            subject,
            body,
            delayBetweenEmails,
            hourlyLimit,
            scheduledAt: targetTime.toISOString(),
          },
          targetTime
        );

        // Save bullJobId back to DB
        const updatedRecord = await prisma.emailJob.update({
          where: { id: emailRecord.id },
          data: { bullJobId },
        });

        // Index in Elasticsearch
        await elasticSearchService.indexEmail(updatedRecord);

        scheduledRecords.push(updatedRecord);
      }

      return res.status(201).json({
        success: true,
        message: `Successfully scheduled ${recipients.length} email(s)`,
        batchId,
        count: scheduledRecords.length,
        emails: scheduledRecords,
      });
    } catch (err: any) {
      console.error('[EmailController] Error scheduling emails:', err);
      return res.status(500).json({ error: err.message || 'Failed to schedule emails' });
    }
  }

  /**
   * Get all scheduled emails with Elasticsearch search & pagination
   */
  static async getScheduledEmails(req: Request, res: Response) {
    try {
      const query = typeof req.query.q === 'string' ? req.query.q : undefined;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const results = await elasticSearchService.searchEmails({
        query,
        status: EmailStatus.SCHEDULED,
        page,
        limit,
      });

      return res.json(results);
    } catch (err: any) {
      console.error('[EmailController] Error fetching scheduled emails:', err);
      return res.status(500).json({ error: err.message || 'Failed to fetch scheduled emails' });
    }
  }

  /**
   * Get all sent emails with Elasticsearch search & pagination
   */
  static async getSentEmails(req: Request, res: Response) {
    try {
      const query = typeof req.query.q === 'string' ? req.query.q : undefined;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const results = await elasticSearchService.searchEmails({
        query,
        status: EmailStatus.SENT,
        page,
        limit,
      });

      return res.json(results);
    } catch (err: any) {
      console.error('[EmailController] Error fetching sent emails:', err);
      return res.status(500).json({ error: err.message || 'Failed to fetch sent emails' });
    }
  }

  /**
   * Cancels a scheduled email
   */
  static async cancelEmail(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const email = await prisma.emailJob.findUnique({ where: { id } });
      if (!email) {
        return res.status(404).json({ error: 'Email job not found' });
      }

      if (email.status === EmailStatus.SENT) {
        return res.status(400).json({ error: 'Cannot cancel an email that was already sent' });
      }

      // Remove from BullMQ queue
      if (email.bullJobId) {
        await queueService.cancelJob(email.bullJobId);
      }

      // Update status in PostgreSQL
      const updated = await prisma.emailJob.update({
        where: { id },
        data: { status: EmailStatus.CANCELLED },
      });

      // Update in Elasticsearch
      await elasticSearchService.indexEmail(updated);

      return res.json({ success: true, message: 'Email cancelled successfully', email: updated });
    } catch (err: any) {
      console.error('[EmailController] Error cancelling email:', err);
      return res.status(500).json({ error: err.message || 'Failed to cancel email' });
    }
  }

  /**
   * Force sends a scheduled email immediately
   */
  static async sendNow(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const email = await prisma.emailJob.findUnique({ where: { id } });
      if (!email) {
        return res.status(404).json({ error: 'Email job not found' });
      }

      if (email.status === EmailStatus.SENT) {
        return res.status(400).json({ error: 'Email was already sent' });
      }

      const immediateTime = new Date();

      // Reschedule in BullMQ with 0ms delay
      const newBullJobId = await queueService.rescheduleJob(
        email.id,
        {
          emailJobId: email.id,
          senderEmail: email.senderEmail,
          recipient: email.recipient,
          subject: email.subject,
          body: email.body,
          delayBetweenEmails: 0,
          hourlyLimit: email.hourlyLimit,
          scheduledAt: immediateTime.toISOString(),
        },
        0
      );

      const updated = await prisma.emailJob.update({
        where: { id },
        data: { scheduledAt: immediateTime, bullJobId: newBullJobId },
      });

      return res.json({ success: true, message: 'Email queued for immediate sending', email: updated });
    } catch (err: any) {
      console.error('[EmailController] Error in sendNow:', err);
      return res.status(500).json({ error: err.message || 'Failed to send email immediately' });
    }
  }

  /**
   * Dashboard statistics & queue telemetry
   */
  static async getStats(req: Request, res: Response) {
    try {
      const [queueStats, scheduledCount, sentCount, failedCount, senders] = await Promise.all([
        queueService.getQueueStats(),
        prisma.emailJob.count({ where: { status: EmailStatus.SCHEDULED } }),
        prisma.emailJob.count({ where: { status: EmailStatus.SENT } }),
        prisma.emailJob.count({ where: { status: EmailStatus.FAILED } }),
        prisma.sender.findMany(),
      ]);

      // Telemetry per sender
      const sendersTelemetry = await Promise.all(
        senders.map((s) => rateLimitService.getSenderTelemetry(s.email, s.hourlyLimit))
      );

      return res.json({
        queue: queueStats,
        totals: {
          scheduled: scheduledCount,
          sent: sentCount,
          failed: failedCount,
          total: scheduledCount + sentCount + failedCount,
        },
        elasticsearch: elasticSearchService.getHealth(),
        sendersTelemetry,
      });
    } catch (err: any) {
      console.error('[EmailController] Error fetching stats:', err);
      return res.status(500).json({ error: err.message || 'Failed to fetch dashboard stats' });
    }
  }
}
