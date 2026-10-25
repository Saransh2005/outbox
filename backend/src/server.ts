import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { CONFIG } from './config/constants';
import { emailQueue, queueService } from './services/queueService';
import { elasticSearchService } from './services/elasticSearchService';
import { EmailWorker } from './workers/emailWorker';
import routes from './routes';
import { redisClient } from './config/redis';
import { prisma } from './config/prisma';

dotenv.config();

const app = express();

// Middlewares
app.use(
  cors({
    origin: '*', // Allow frontend development
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Setup Bull-Board for Queue Visibility
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(emailQueue as any) as any],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

// Mount API Routes
app.use('/api', routes);

// Base route info
app.get('/', (req, res) => {
  res.json({
    service: 'ReachInbox Email Scheduler Service',
    status: 'online',
    version: '1.0.0',
    documentation: {
      bullBoard: '/admin/queues',
      apiHealth: '/api/health',
      stats: '/api/stats',
    },
  });
});

let workerInstance: EmailWorker | null = null;

async function bootstrap() {
  try {
    console.log('----------------------------------------------------');
    console.log('🚀 Starting ReachInbox Email Job Scheduler Service...');
    console.log('----------------------------------------------------');

    // 1. Initialize Elasticsearch
    await elasticSearchService.init();

    // 2. Run restart persistence reconciliation
    // Any scheduled emails from before a server reboot are re-enqueued seamlessly
    await queueService.reconcileScheduledJobs();

    // 3. Start BullMQ Worker
    workerInstance = new EmailWorker();

    // 4. Start HTTP Server
    const server = app.listen(CONFIG.PORT, () => {
      console.log(`\n📡 Backend server running on: http://localhost:${CONFIG.PORT}`);
      console.log(`📊 Live BullMQ Dashboard available at: http://localhost:${CONFIG.PORT}/admin/queues`);
      console.log(`⚡ Concurrency: ${CONFIG.WORKER_CONCURRENCY} workers`);
      console.log(`⏱️ Default delay pacing: ${CONFIG.DEFAULT_MIN_DELAY_SECONDS}s between emails`);
      console.log('----------------------------------------------------\n');
    });

    // Graceful shutdown
    const handleShutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        if (workerInstance) {
          await workerInstance.close();
        }
        await emailQueue.close();
        await redisClient.quit();
        await prisma.$disconnect();
        console.log('👋 All services closed. Exiting process.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (err: any) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();
