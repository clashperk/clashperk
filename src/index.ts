import 'reflect-metadata';

import { DiscordjsErrorCodes, ShardingManager } from 'discord.js';
import { createServer } from 'node:http';
import { URL, fileURLToPath } from 'node:url';
import Logger from './bot/util/_Logger.js';

class Manager extends ShardingManager {
  private _retry = 0;
  private _readyShards = 0;

  private logger = new Logger(null);

  public constructor() {
    super(fileURLToPath(new URL('main.js', import.meta.url)), {
      token: process.env.TOKEN!,
      execArgv: ['--enable-source-maps', '--trace-warnings']
    });
  }

  public isReady() {
    return this._readyShards > 0;
  }

  public async init() {
    try {
      await this.spawn();
      this._readyShards = this.shards.size;
      this.log(`All Shards (${this.shards.size}) Ready`);
    } catch (error: any) {
      this.logger.error(error, { label: ShardingManager.name.toString() });

      if (error.code === DiscordjsErrorCodes.ShardingAlreadySpawned) {
        this._retry = 0;
      } else if (error.code === DiscordjsErrorCodes.TokenInvalid) {
        process.exit(1);
      } else {
        this._retry++;
        setTimeout(() => this.init(), this._retry * 5500);
      }
    }
  }

  public log(message: string) {
    this.logger.debug(message, { label: ShardingManager.name });
  }
}

const manager = new Manager();

process.on('unhandledRejection', (error) => {
  console.error(error);
});

manager.init();

const server = createServer((req, res) => {
  const isReady = manager.isReady();
  res.writeHead(isReady ? 200 : 500, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ isReady }));
});

server.listen(process.env.PORT || 8080, () => {
  manager.log('Listening on http://localhost:8080');
});
