import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';

const googleAuthSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  avatar: z.string().optional(),
  googleId: z.string().optional(),
});

export class AuthController {
  /**
   * Upserts authenticated Google user in PostgreSQL database
   */
  static async handleGoogleAuth(req: Request, res: Response) {
    try {
      const parsed = googleAuthSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
      }

      const { email, name, avatar, googleId } = parsed.data;

      // Upsert user in database
      const user = await prisma.user.upsert({
        where: { email },
        update: {
          name: name || undefined,
          avatar: avatar || undefined,
          googleId: googleId || undefined,
        },
        create: {
          email,
          name: name || email.split('@')[0],
          avatar,
          googleId,
        },
      });

      console.log(`[Auth] User authenticated & saved to PostgreSQL: ${user.email} (${user.id})`);

      return res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          googleId: user.googleId,
        },
      });
    } catch (err: any) {
      console.error('[AuthController] Error saving user:', err);
      return res.status(500).json({ error: err.message || 'Authentication error' });
    }
  }

  static async getCurrentUser(req: Request, res: Response) {
    try {
      const email = req.query.email as string;
      if (!email) {
        return res.status(400).json({ error: 'Email query parameter required' });
      }

      const user = await prisma.user.findUnique({
        where: { email },
        include: { slackIntegration: true },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json(user);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
