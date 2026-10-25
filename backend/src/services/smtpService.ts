import nodemailer, { Transporter } from 'nodemailer';
import { CONFIG } from '../config/constants';

interface SenderAccount {
  user: string;
  pass: string;
  transporter: Transporter;
}

class SmtpService {
  private accountsCache: Map<string, SenderAccount> = new Map();
  private defaultTransporter: Transporter | null = null;

  /**
   * Initializes or gets the SMTP transporter for a specific sender email.
   * If sender has custom credentials or if using Ethereal, manages credentials gracefully.
   */
  async getTransporter(senderEmail: string): Promise<{ transporter: Transporter; fromEmail: string }> {
    // Check if we already have a transporter cached for this sender
    const cached = this.accountsCache.get(senderEmail);
    if (cached) {
      return { transporter: cached.transporter, fromEmail: cached.user };
    }

    // Check if configured via env
    if (CONFIG.ETHEREAL_USER && CONFIG.ETHEREAL_PASS) {
      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: CONFIG.ETHEREAL_USER,
          pass: CONFIG.ETHEREAL_PASS,
        },
      });

      this.accountsCache.set(senderEmail, {
        user: CONFIG.ETHEREAL_USER,
        pass: CONFIG.ETHEREAL_PASS,
        transporter,
      });

      return { transporter, fromEmail: senderEmail };
    }

    // If no credentials configured, create an Ethereal test account dynamically
    try {
      console.log(`[SMTP] Creating dynamic Ethereal test account for sender: ${senderEmail}...`);
      const testAccount = await nodemailer.createTestAccount();
      console.log(`[SMTP] Ethereal account created: ${testAccount.user}`);

      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      this.accountsCache.set(senderEmail, {
        user: testAccount.user,
        pass: testAccount.pass,
        transporter,
      });

      return { transporter, fromEmail: senderEmail };
    } catch (err: any) {
      console.error('[SMTP] Failed to create Ethereal test account:', err.message);
      // Fallback: create json transport if offline/firewalled
      const fallbackTransporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      return { transporter: fallbackTransporter, fromEmail: senderEmail };
    }
  }

  /**
   * Sends an email and returns the messageId and Ethereal preview URL.
   */
  async sendMail(params: {
    senderEmail: string;
    senderName?: string;
    recipient: string;
    subject: string;
    body: string;
  }): Promise<{ messageId: string; previewUrl: string | false }> {
    const { transporter } = await this.getTransporter(params.senderEmail);

    const fromHeader = params.senderName
      ? `"${params.senderName}" <${params.senderEmail}>`
      : params.senderEmail;

    const info = await transporter.sendMail({
      from: fromHeader,
      to: params.recipient,
      subject: params.subject,
      html: params.body,
      text: params.body.replace(/<[^>]*>/g, ''), // Plaintext fallback
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[SMTP] Email sent to ${params.recipient}. Preview URL: ${previewUrl || 'N/A'}`);

    return {
      messageId: info.messageId,
      previewUrl,
    };
  }
}

export const smtpService = new SmtpService();
