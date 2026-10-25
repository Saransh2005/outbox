import dotenv from 'dotenv';

dotenv.config();

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '5001', 10),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  QUEUE_NAME: 'email-scheduler-queue',
  WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  DEFAULT_MIN_DELAY_SECONDS: parseInt(process.env.DEFAULT_MIN_DELAY_SECONDS || '2', 10),
  DEFAULT_HOURLY_LIMIT: parseInt(process.env.DEFAULT_HOURLY_LIMIT || '100', 10),
  ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  ELASTICSEARCH_INDEX: 'emails',
  SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL || '',
  SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID || '',
  SLACK_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET || '',
  SLACK_REDIRECT_URI: process.env.SLACK_REDIRECT_URI || 'http://localhost:5001/api/slack/oauth/callback',
  ETHEREAL_USER: process.env.ETHEREAL_USER || '',
  ETHEREAL_PASS: process.env.ETHEREAL_PASS || '',
};
