import { Request, Response } from 'express';
import { z } from 'zod';
import { slackService } from '../services/slackService';
import { CONFIG } from '../config/constants';
import axios from 'axios';
import { prisma } from '../config/prisma';

const webhookSchema = z.object({
  webhookUrl: z.string().url('A valid Slack webhook URL is required (https://hooks.slack.com/...)'),
  channelName: z.string().optional().default('#general'),
});

export class SlackController {
  /**
   * Get current Slack integration status
   */
  static async getStatus(req: Request, res: Response) {
    try {
      const integration = await slackService.getActiveIntegration();

      if (!integration || !integration.isActive) {
        return res.json({
          connected: false,
          hasOAuthConfig: Boolean(CONFIG.SLACK_CLIENT_ID && CONFIG.SLACK_CLIENT_SECRET),
        });
      }

      // Mask webhook URL for security
      let maskedUrl = undefined;
      if (integration.webhookUrl) {
        const parts = integration.webhookUrl.split('/');
        maskedUrl = parts.length > 3 ? `${parts.slice(0, -1).join('/')}/••••••••` : '••••••••';
      }

      return res.json({
        connected: true,
        channelName: integration.channelName || '#general',
        teamName: integration.teamName || 'Workspace',
        maskedUrl,
        hasOAuthConfig: Boolean(CONFIG.SLACK_CLIENT_ID && CONFIG.SLACK_CLIENT_SECRET),
      });
    } catch (err: any) {
      console.error('[SlackController] Error fetching status:', err);
      return res.status(500).json({ error: err.message || 'Failed to check Slack status' });
    }
  }

  /**
   * Connect an incoming webhook directly
   */
  static async connectWebhook(req: Request, res: Response) {
    try {
      const parsed = webhookSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
      }

      const { webhookUrl, channelName } = parsed.data;
      const integration = await slackService.connectWebhook(webhookUrl, channelName);

      return res.json({
        success: true,
        message: 'Slack webhook connected successfully!',
        channel: integration.channelName,
      });
    } catch (err: any) {
      console.error('[SlackController] Error connecting webhook:', err);
      return res.status(500).json({ error: err.message || 'Failed to connect Slack webhook' });
    }
  }

  /**
   * Disconnect Slack
   */
  static async disconnect(req: Request, res: Response) {
    try {
      await slackService.disconnect();
      return res.json({ success: true, message: 'Slack disconnected successfully' });
    } catch (err: any) {
      console.error('[SlackController] Error disconnecting Slack:', err);
      return res.status(500).json({ error: err.message || 'Failed to disconnect Slack' });
    }
  }

  /**
   * Send a live test notification to verify connection
   */
  static async sendTestNotification(req: Request, res: Response) {
    try {
      const result = await slackService.sendTestMessage();
      return res.json(result);
    } catch (err: any) {
      console.error('[SlackController] Error sending test message:', err);
      return res.status(400).json({ error: err.message || 'Failed to send test message to Slack' });
    }
  }

  /**
   * Redirect to Slack OAuth authorization
   */
  static async oauthAuthorize(req: Request, res: Response) {
    if (!CONFIG.SLACK_CLIENT_ID) {
      return res.status(400).json({
        error: 'Slack OAuth Client ID is not configured in .env. Please connect via Webhook instead.',
      });
    }

    const scope = 'chat:write,incoming-webhook';
    const redirectUri = encodeURIComponent(CONFIG.SLACK_REDIRECT_URI);
    const slackUrl = `https://slack.com/oauth/v2/authorize?client_id=${CONFIG.SLACK_CLIENT_ID}&scope=${scope}&redirect_uri=${redirectUri}`;

    return res.redirect(slackUrl);
  }

  /**
   * Handles OAuth callback from Slack
   */
  static async oauthCallback(req: Request, res: Response) {
    const { code, error } = req.query;

    if (error) {
      return res.redirect(`${CONFIG.CLIENT_URL}?slack_error=${encodeURIComponent(String(error))}`);
    }

    if (!code) {
      return res.redirect(`${CONFIG.CLIENT_URL}?slack_error=No_code_provided`);
    }

    try {
      const tokenResponse = await axios.post(
        'https://slack.com/api/oauth.v2.access',
        new URLSearchParams({
          client_id: CONFIG.SLACK_CLIENT_ID,
          client_secret: CONFIG.SLACK_CLIENT_SECRET,
          code: String(code),
          redirect_uri: CONFIG.SLACK_REDIRECT_URI,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      if (!tokenResponse.data.ok) {
        throw new Error(tokenResponse.data.error || 'Slack OAuth exchange failed');
      }

      const { access_token, incoming_webhook, team } = tokenResponse.data;

      await prisma.slackIntegration.upsert({
        where: { id: 'default-slack-integration' },
        update: {
          accessToken: access_token,
          webhookUrl: incoming_webhook?.url || null,
          channelName: incoming_webhook?.channel || '#general',
          teamName: team?.name || 'Workspace',
          isActive: true,
          updatedAt: new Date(),
        },
        create: {
          id: 'default-slack-integration',
          accessToken: access_token,
          webhookUrl: incoming_webhook?.url || null,
          channelName: incoming_webhook?.channel || '#general',
          teamName: team?.name || 'Workspace',
          isActive: true,
        },
      });

      return res.redirect(`${CONFIG.CLIENT_URL}?slack_connected=true`);
    } catch (err: any) {
      console.error('[SlackController] OAuth callback error:', err.message);
      return res.redirect(`${CONFIG.CLIENT_URL}?slack_error=${encodeURIComponent(err.message)}`);
    }
  }
}
