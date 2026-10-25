import axios from 'axios';
import { prisma } from '../config/prisma';
import { CONFIG } from '../config/constants';
import { redisClient } from '../config/redis';

interface SlackAlertParams {
  senderEmail: string;
  senderName?: string;
  hourlyLimit: number;
  currentCount: number;
  recipient: string;
  subject: string;
  rescheduledTo: Date;
}

class SlackService {
  private REDIS_SLACK_KEY = 'slack:active_integration';

  /**
   * Retrieves active Slack integration (from Redis cache or DB)
   */
  async getActiveIntegration() {
    try {
      const cached = await redisClient.get(this.REDIS_SLACK_KEY);
      if (cached) {
        return JSON.parse(cached);
      }

      // Check DB
      const integration = await prisma.slackIntegration.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' },
      });

      if (integration) {
        await redisClient.set(this.REDIS_SLACK_KEY, JSON.stringify(integration), 'EX', 3600);
        return integration;
      }

      // Check fallback to env
      if (CONFIG.SLACK_WEBHOOK_URL) {
        return { webhookUrl: CONFIG.SLACK_WEBHOOK_URL, isActive: true };
      }

      return null;
    } catch (err: any) {
      console.error('[SlackService] Error retrieving integration:', err.message);
      return null;
    }
  }

  /**
   * Connects an incoming webhook URL
   */
  async connectWebhook(webhookUrl: string, channelName?: string) {
    // Clear cache
    await redisClient.del(this.REDIS_SLACK_KEY);

    // Upsert integration
    const integration = await prisma.slackIntegration.upsert({
      where: { id: 'default-slack-integration' },
      update: {
        webhookUrl,
        channelName: channelName || '#general',
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        id: 'default-slack-integration',
        webhookUrl,
        channelName: channelName || '#general',
        isActive: true,
      },
    });

    await redisClient.set(this.REDIS_SLACK_KEY, JSON.stringify(integration), 'EX', 3600);
    return integration;
  }

  /**
   * Disconnects Slack
   */
  async disconnect() {
    await redisClient.del(this.REDIS_SLACK_KEY);
    await prisma.slackIntegration.updateMany({
      data: { isActive: false },
    });
    return { success: true };
  }

  /**
   * Sends a live Slack message when a sender reaches their hourly rate limit
   */
  async notifyRateLimitHit(params: SlackAlertParams): Promise<{ notified: boolean; error?: string }> {
    const integration = await this.getActiveIntegration();

    if (!integration || !integration.isActive) {
      console.log(`[Slack] No active Slack connection. Skipping notification for ${params.senderEmail}.`);
      return { notified: false, error: 'NO_ACTIVE_SLACK_INTEGRATION' };
    }

    const payload = {
      text: `⚠️ Rate Limit Alert: Sender ${params.senderEmail} reached hourly limit of ${params.hourlyLimit} emails/hr`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚨 Sender Hourly Rate Limit Exceeded',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Sender *${params.senderEmail}* has reached its maximum hourly sending threshold. To prevent domain reputation damage and adhere to provider limits, upcoming emails have been safely deferred.`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Sender:*\n\`${params.senderEmail}\``,
            },
            {
              type: 'mrkdwn',
              text: `*Hourly Limit:*\n\`${params.hourlyLimit} emails/hour\``,
            },
            {
              type: 'mrkdwn',
              text: `*Queued Recipient:*\n\`${params.recipient}\``,
            },
            {
              type: 'mrkdwn',
              text: `*Rescheduled Window:*\n\`${params.rescheduledTo.toLocaleTimeString()} (UTC)\``,
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `⚡ *ReachInbox Job Scheduler* • No emails were dropped. Preservation order active.`,
            },
          ],
        },
      ],
    };

    try {
      if (integration.webhookUrl) {
        await axios.post(integration.webhookUrl, payload, { timeout: 6000 });
        console.log(`[Slack] Successfully sent live rate-limit alert to Slack for ${params.senderEmail}!`);
        return { notified: true };
      } else if (integration.accessToken && integration.channelName) {
        await axios.post(
          'https://slack.com/api/chat.postMessage',
          {
            channel: integration.channelName,
            ...payload,
          },
          {
            headers: { Authorization: `Bearer ${integration.accessToken}` },
            timeout: 6000,
          }
        );
        console.log(`[Slack] Successfully sent live rate-limit alert via OAuth API for ${params.senderEmail}!`);
        return { notified: true };
      }

      return { notified: false, error: 'NO_VALID_DESTINATION' };
    } catch (err: any) {
      console.error('[Slack] Failed to deliver Slack notification:', err.response?.data || err.message);
      return { notified: false, error: err.message };
    }
  }

  /**
   * Test ping to verify Slack connection from UI
   */
  async sendTestMessage(): Promise<{ success: boolean; message: string }> {
    const integration = await this.getActiveIntegration();
    if (!integration || !integration.isActive) {
      throw new Error('No active Slack integration found. Please connect Slack first.');
    }

    const payload = {
      text: '🎉 ReachInbox Scheduler connected successfully to Slack!',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚡ ReachInbox Scheduler Connected',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Your Slack channel is now connected to the *ReachInbox Email Job Scheduler*. You will receive real-time notifications whenever a sender hits their configured hourly rate limit.',
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Verified at ${new Date().toISOString()}`,
            },
          ],
        },
      ],
    };

    if (integration.webhookUrl) {
      await axios.post(integration.webhookUrl, payload, { timeout: 6000 });
      return { success: true, message: 'Test message sent to Slack webhook successfully!' };
    } else if (integration.accessToken && integration.channelName) {
      await axios.post(
        'https://slack.com/api/chat.postMessage',
        {
          channel: integration.channelName,
          ...payload,
        },
        {
          headers: { Authorization: `Bearer ${integration.accessToken}` },
          timeout: 6000,
        }
      );
      return { success: true, message: 'Test message sent via Slack OAuth API successfully!' };
    }

    throw new Error('Invalid Slack integration credentials');
  }
}

export const slackService = new SlackService();
