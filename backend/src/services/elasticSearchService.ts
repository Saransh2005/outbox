import { Client } from '@elastic/elasticsearch';
import { CONFIG } from '../config/constants';
import { prisma } from '../config/prisma';
import { EmailStatus } from '@prisma/client';

export interface EmailDocument {
  id: string;
  recipient: string;
  senderEmail: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: string;
  sentAt?: string | null;
  previewUrl?: string | null;
  failureReason?: string | null;
  createdAt: string;
}

class ElasticSearchService {
  private client: Client;
  private isAvailable: boolean = false;
  private indexName = CONFIG.ELASTICSEARCH_INDEX;

  constructor() {
    this.client = new Client({
      node: CONFIG.ELASTICSEARCH_URL,
      requestTimeout: 3000,
      maxRetries: 1,
    });
  }

  /**
   * Initializes connection and ensures index mappings exist
   */
  async init() {
    try {
      await this.client.ping();
      this.isAvailable = true;
      console.log('✅ Elasticsearch connected at', CONFIG.ELASTICSEARCH_URL);

      const indexExists = await this.client.indices.exists({ index: this.indexName });
      if (!indexExists) {
        await this.client.indices.create({
          index: this.indexName,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                recipient: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword' } },
                },
                senderEmail: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword' } },
                },
                subject: { type: 'text' },
                body: { type: 'text' },
                status: { type: 'keyword' },
                scheduledAt: { type: 'date' },
                sentAt: { type: 'date' },
                previewUrl: { type: 'keyword' },
                createdAt: { type: 'date' },
              },
            },
          },
        });
        console.log(`[Elasticsearch] Index '${this.indexName}' created successfully.`);
      }
    } catch (err: any) {
      this.isAvailable = false;
      console.log(`ℹ️ [Elasticsearch] Not reachable (${err.message}). Using PostgreSQL resilient search engine.`);
    }
  }

  /**
   * Indexes or updates an email job document
   */
  async indexEmail(email: {
    id: string;
    recipient: string;
    senderEmail: string;
    subject: string;
    body: string;
    status: string;
    scheduledAt: Date;
    sentAt?: Date | null;
    previewUrl?: string | null;
    failureReason?: string | null;
    createdAt?: Date;
  }) {
    if (!this.isAvailable) return;

    try {
      const doc: EmailDocument = {
        id: email.id,
        recipient: email.recipient,
        senderEmail: email.senderEmail,
        subject: email.subject,
        body: email.body,
        status: email.status,
        scheduledAt: email.scheduledAt.toISOString(),
        sentAt: email.sentAt ? email.sentAt.toISOString() : null,
        previewUrl: email.previewUrl || null,
        failureReason: email.failureReason || null,
        createdAt: (email.createdAt || new Date()).toISOString(),
      };

      await this.client.index({
        index: this.indexName,
        id: email.id,
        document: doc,
        refresh: 'wait_for',
      });
    } catch (err: any) {
      console.error(`[Elasticsearch] Index error for email ${email.id}:`, err.message);
    }
  }

  /**
   * Search emails by keyword across subject, recipient, body, senderEmail
   * Supports filtering by status and pagination
   */
  async searchEmails(params: {
    query?: string;
    status?: EmailStatus;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const from = (page - 1) * limit;

    // If Elasticsearch is online, use it
    if (this.isAvailable) {
      try {
        const mustClauses: any[] = [];

        if (params.status) {
          mustClauses.push({ term: { status: params.status } });
        }

        if (params.query && params.query.trim().length > 0) {
          mustClauses.push({
            multi_match: {
              query: params.query.trim(),
              fields: ['recipient^3', 'senderEmail^2', 'subject^2', 'body'],
              fuzziness: 'AUTO',
            },
          });
        }

        const esResponse = await this.client.search({
          index: this.indexName,
          from,
          size: limit,
          query: mustClauses.length > 0 ? { bool: { must: mustClauses } } : { match_all: {} },
          sort: [{ scheduledAt: { order: 'desc' } }],
        });

        const hits = esResponse.hits.hits;
        const total = typeof esResponse.hits.total === 'number'
          ? esResponse.hits.total
          : esResponse.hits.total?.value || 0;

        return {
          source: 'elasticsearch',
          total,
          page,
          limit,
          data: hits.map((hit) => hit._source),
        };
      } catch (err: any) {
        console.error('[Elasticsearch] Search query error, falling back to DB:', err.message);
      }
    }

    // Fallback: Database full search
    const where: any = {};
    if (params.status) {
      where.status = params.status;
    }
    if (params.query && params.query.trim().length > 0) {
      const q = params.query.trim();
      where.OR = [
        { recipient: { contains: q, mode: 'insensitive' } },
        { senderEmail: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
        { body: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.emailJob.count({ where }),
      prisma.emailJob.findMany({
        where,
        orderBy: { scheduledAt: 'desc' },
        skip: from,
        take: limit,
      }),
    ]);

    return {
      source: 'database',
      total,
      page,
      limit,
      data,
    };
  }

  getHealth() {
    return {
      isAvailable: this.isAvailable,
      indexName: this.indexName,
      node: CONFIG.ELASTICSEARCH_URL,
    };
  }
}

export const elasticSearchService = new ElasticSearchService();
