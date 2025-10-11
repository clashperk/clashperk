import 'reflect-metadata';

import sentry from './util/sentry.js';
sentry();

import { createServer } from 'node:http';

import { ClusterManager } from 'discord-hybrid-sharding';
import { fileURLToPath } from 'node:url';
import { Logger } from './util/logger.js';

const logger = new Logger(null);

class Manager extends ClusterManager {
  public constructor() {
    super(fileURLToPath(new URL('main.js', import.meta.url)), {
      mode: 'process',
      totalShards: 'auto',
      shardsPerClusters: 2,
      token: process.env.DISCORD_TOKEN!
    });
  }

  public isReady() {
    return this.clusters.size > 0;
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
