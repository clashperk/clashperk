import 'reflect-metadata';

import sentry from './util/sentry.js';
sentry();

import { createServer } from 'node:http';

import { ClusterManager } from 'discord-hybrid-sharding';
import { fileURLToPath } from 'node:url';
import type { Client } from './struct/client.js';
import { Logger } from './util/logger.js';

const logger = new Logger(null);

const DB_CHECK_INTERVAL_MS = 30_000;
const DB_CHECK_TIMEOUT_MS = 10_000;
const UNHEALTHY_AFTER_MS = 2 * 60_000;
const EXIT_AFTER_MS = 10 * 60_000;

class Manager extends ClusterManager {
  private lastHealthyAt: number | null = null;

  public constructor() {
    super(fileURLToPath(new URL('main.js', import.meta.url)), {
      mode: 'process',
      totalShards: 'auto',
      shardsPerClusters: 2,
      token: process.env.DISCORD_TOKEN!
    });
  }

  public isReady() {
    if (this.lastHealthyAt === null) return this.clusters.size > 0;
    return Date.now() - this.lastHealthyAt < UNHEALTHY_AFTER_MS;
  }

  public async init() {
    try {
      await this.spawn({ timeout: -1 });

      logger.log(`All Shards (${this.clusters.size}) Ready`, { label: 'Cluster' });
    } catch (error) {
      logger.error(error, { label: 'Cluster' });

      if (error.message === 'DISCORD_TOKEN_INVALID') {
        process.exit(1);
      }
    }

    this.lastHealthyAt = Date.now();
    setInterval(() => this.checkDatabase(), DB_CHECK_INTERVAL_MS);
  }

  // Docker never restarts an unhealthy container on its own, so exiting is what gets
  // a cluster that lost MongoDB (and never recovered) back via the restart policy.
  private async checkDatabase() {
    try {
      await this.broadcastEval(
        (client) => (client as unknown as Client).db.command({ ping: 1 }).then(() => true),
        { timeout: DB_CHECK_TIMEOUT_MS }
      );
      this.lastHealthyAt = Date.now();
    } catch (error) {
      const downForMs = Date.now() - this.lastHealthyAt!;
      logger.warn(`MongoDB unreachable for ${Math.round(downForMs / 1000)}s: ${error}`, {
        label: 'Health'
      });

      if (downForMs > EXIT_AFTER_MS) {
        logger.error('MongoDB unreachable for too long, exiting to restart', { label: 'Health' });
        process.exit(1);
      }
    }
  }
}

const manager = new Manager();
manager.init();

process.on('unhandledRejection', (error) => {
  console.error(error);
});

const server = createServer((_, res) => {
  const isReady = manager.isReady();
  res.writeHead(isReady ? 200 : 503, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ isReady }));
});

const port = process.env.PORT || 8070;
server.listen(port, () => {
  logger.log(`Listening on http://localhost:${port}`, { label: 'Server' });
});
