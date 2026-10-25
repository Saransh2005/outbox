import { redisClient } from '../config/redis';
import { slackService } from './slackService';
import { prisma } from '../config/prisma';

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  hourlyLimit: number;
  rescheduledTo?: Date;
  rescheduleDelayMs?: number;
}

class RateLimitService {
  /**
   * Formats the current UTC hour window string: YYYY-MM-DD-HH
   */
  getHourWindow(date: Date = new Date()): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    const h = String(date.getUTCHours()).padStart(2, '0');
    return `${y}-${m}-${d}-${h}`;
  }

  /**
   * Calculates the exact start time of the next UTC hour window
   */
  getNextHourWindowStart(date: Date = new Date()): Date {
    const next = new Date(date);
    next.setUTCHours(next.getUTCHours() + 1);
    next.setUTCMinutes(0, 0, 0);
    return next;
  }

  /**
   * Atomically checks and increments the sender's hourly send counter in Redis.
   * If limit is reached, does NOT increment and returns allowed: false with rescheduling time.
   */
  async checkAndIncrement(
    senderEmail: string,
    hourlyLimit: number,
    recipient: string,
    subject: string
  ): Promise<RateLimitCheckResult> {
    const hourWindow = this.getHourWindow();
    const redisKey = `ratelimit:${senderEmail}:${hourWindow}`;

    // Redis Lua Script for atomic check-and-increment
    const luaScript = `
      local current = redis.call('GET', KEYS[1])
      local limit = tonumber(ARGV[1])
      if current and tonumber(current) >= limit then
        return {0, tonumber(current)}
      else
        local new_count = redis.call('INCR', KEYS[1])
        if new_count == 1 then
          redis.call('EXPIRE', KEYS[1], 7200)
        end
        return {1, new_count}
      end
    `;

    try {
      const result = (await redisClient.eval(
        luaScript,
        1,
        redisKey,
        hourlyLimit.toString()
      )) as [number, number];

      const allowed = result[0] === 1;
      const currentCount = result[1];

      if (allowed) {
        return {
          allowed: true,
          currentCount,
          hourlyLimit,
        };
      }

      // Limit reached!
      const nextHourStart = this.getNextHourWindowStart();
      // Add slight random jitter (1-5s) so deferred jobs don't all execute simultaneously at the hour boundary
      const jitterMs = Math.floor(Math.random() * 4000) + 1000;
      const rescheduleDelayMs = Math.max(2000, nextHourStart.getTime() - Date.now() + jitterMs);
      const rescheduledTo = new Date(Date.now() + rescheduleDelayMs);

      // Trigger Slack notification (guaranteed 1 live notification per hour window per sender)
      await this.handleRateLimitHitAlert({
        senderEmail,
        hourlyLimit,
        currentCount,
        recipient,
        subject,
        rescheduledTo,
        hourWindow,
      });

      // Update rate limit log in DB asynchronously for persistent audit records
      this.recordRateLimitEventInDb(senderEmail, hourWindow, hourlyLimit, currentCount).catch(
        (err) => console.error('[RateLimitService] DB log error:', err.message)
      );

      return {
        allowed: false,
        currentCount,
        hourlyLimit,
        rescheduledTo,
        rescheduleDelayMs,
      };
    } catch (err: any) {
      console.error('[RateLimitService] Redis evaluation error:', err.message);
      // Fallback: allow to avoid blocking entire queue on temporary Redis glitch
      return { allowed: true, currentCount: 0, hourlyLimit };
    }
  }

  /**
   * Handles sending a live Slack notification when the limit is exceeded.
   * Dedupes notifications per sender per hour window using Redis.
   */
  private async handleRateLimitHitAlert(params: {
    senderEmail: string;
    hourlyLimit: number;
    currentCount: number;
    recipient: string;
    subject: string;
    rescheduledTo: Date;
    hourWindow: string;
  }) {
    const alertKey = `slack_alerted:${params.senderEmail}:${params.hourWindow}`;
    const alreadyAlerted = await redisClient.get(alertKey);

    if (!alreadyAlerted) {
      // Mark as alerted for this hour window (expire in 2 hours)
      await redisClient.set(alertKey, '1', 'EX', 7200);

      console.log(
        `🚨 [RateLimitService] Sender ${params.senderEmail} hit hourly limit (${params.hourlyLimit}/hr). Triggering Slack alert...`
      );

      // Call Slack service
      await slackService.notifyRateLimitHit({
        senderEmail: params.senderEmail,
        hourlyLimit: params.hourlyLimit,
        currentCount: params.currentCount,
        recipient: params.recipient,
        subject: params.subject,
        rescheduledTo: params.rescheduledTo,
      });
    }
  }

  /**
   * Enforces minimum delay between consecutive emails from the same sender
   */
  async enforcePacingDelay(senderEmail: string, minDelaySeconds: number): Promise<void> {
    if (minDelaySeconds <= 0) return;

    const lastSentKey = `last_sent:${senderEmail}`;
    const lastSentStr = await redisClient.get(lastSentKey);

    if (lastSentStr) {
      const lastSentTime = parseInt(lastSentStr, 10);
      const elapsedMs = Date.now() - lastSentTime;
      const minDelayMs = minDelaySeconds * 1000;

      if (elapsedMs < minDelayMs) {
        const waitTimeMs = minDelayMs - elapsedMs;
        console.log(
          `[Pacing] Delaying send for ${senderEmail} by ${waitTimeMs}ms to respect ${minDelaySeconds}s minimum pacing.`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTimeMs));
      }
    }
  }

  /**
   * Updates last sent timestamp for pacing
   */
  async recordSend(senderEmail: string): Promise<void> {
    const lastSentKey = `last_sent:${senderEmail}`;
    await redisClient.set(lastSentKey, Date.now().toString(), 'EX', 3600);
  }

  /**
   * Records or updates rate limit audit log in DB
   */
  private async recordRateLimitEventInDb(
    senderEmail: string,
    hourWindow: string,
    limit: number,
    currentCount: number
  ) {
    await prisma.rateLimitLog.upsert({
      where: {
        senderEmail_hourWindow: {
          senderEmail,
          hourWindow,
        },
      },
      update: {
        currentCount,
        deferredCount: { increment: 1 },
        notifiedSlack: true,
      },
      create: {
        senderEmail,
        hourWindow,
        limit,
        currentCount,
        deferredCount: 1,
        notifiedSlack: true,
      },
    });
  }

  /**
   * Retrieves telemetry status for a sender
   */
  async getSenderTelemetry(senderEmail: string, configuredLimit: number) {
    const hourWindow = this.getHourWindow();
    const redisKey = `ratelimit:${senderEmail}:${hourWindow}`;
    const countStr = await redisClient.get(redisKey);
    const count = countStr ? parseInt(countStr, 10) : 0;
    const remaining = Math.max(0, configuredLimit - count);
    const nextReset = this.getNextHourWindowStart();

    return {
      senderEmail,
      hourWindow,
      hourlyLimit: configuredLimit,
      sentThisHour: count,
      remainingQuota: remaining,
      resetsAt: nextReset,
      isLimited: count >= configuredLimit,
    };
  }
}

export const rateLimitService = new RateLimitService();
