import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';

const createSenderSchema = z.object({
  name: z.string().min(1, 'Sender name is required'),
  email: z.string().email('Valid sender email is required'),
  hourlyLimit: z.number().int().min(1).default(100),
  isDefault: z.boolean().optional().default(false),
});

export class SenderController {
  static async getSenders(req: Request, res: Response) {
    try {
      const senders = await prisma.sender.findMany({
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      });
      return res.json(senders);
    } catch (err: any) {
      console.error('[SenderController] Error fetching senders:', err);
      return res.status(500).json({ error: err.message || 'Failed to fetch senders' });
    }
  }

  static async createSender(req: Request, res: Response) {
    try {
      const parsed = createSenderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
      }

      const { name, email, hourlyLimit, isDefault } = parsed.data;

      if (isDefault) {
        // Reset any existing default
        await prisma.sender.updateMany({
          data: { isDefault: false },
        });
      }

      const sender = await prisma.sender.upsert({
        where: { email },
        update: { name, hourlyLimit, isDefault },
        create: { name, email, hourlyLimit, isDefault },
      });

      return res.status(201).json(sender);
    } catch (err: any) {
      console.error('[SenderController] Error creating sender:', err);
      return res.status(500).json({ error: err.message || 'Failed to create sender' });
    }
  }

  static async updateHourlyLimit(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { hourlyLimit } = req.body;

      if (!hourlyLimit || typeof hourlyLimit !== 'number' || hourlyLimit < 1) {
        return res.status(400).json({ error: 'Valid hourlyLimit number >= 1 required' });
      }

      const updated = await prisma.sender.update({
        where: { id },
        data: { hourlyLimit },
      });

      return res.json(updated);
    } catch (err: any) {
      console.error('[SenderController] Error updating sender limit:', err);
      return res.status(500).json({ error: err.message || 'Failed to update sender limit' });
    }
  }
}
