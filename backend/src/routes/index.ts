import { Router } from 'express';
import { EmailController } from '../controllers/emailController';
import { SlackController } from '../controllers/slackController';
import { SenderController } from '../controllers/senderController';

const router = Router();

// Health
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Email endpoints
router.post('/emails/schedule', EmailController.scheduleEmails);
router.get('/emails/scheduled', EmailController.getScheduledEmails);
router.get('/emails/sent', EmailController.getSentEmails);
router.delete('/emails/:id/cancel', EmailController.cancelEmail);
router.post('/emails/:id/send-now', EmailController.sendNow);
router.get('/stats', EmailController.getStats);

// Senders endpoints
router.get('/senders', SenderController.getSenders);
router.post('/senders', SenderController.createSender);
router.patch('/senders/:id/limit', SenderController.updateHourlyLimit);

// Slack endpoints
router.get('/slack/status', SlackController.getStatus);
router.post('/slack/webhook', SlackController.connectWebhook);
router.post('/slack/disconnect', SlackController.disconnect);
router.post('/slack/test', SlackController.sendTestNotification);
router.get('/slack/oauth', SlackController.oauthAuthorize);
router.get('/slack/oauth/callback', SlackController.oauthCallback);

export default router;
