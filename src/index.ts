import 'reflect-metadata';

import Discord, { DiscordjsErrorCodes, fetchRecommendedShardCount } from 'discord.js';
import { createServer } from 'node:http';
import { URL, fileURLToPath } from 'node:url';
import Logger from './bot/util/Logger.js';

class Manager extends Discord.ShardingManager {
	private _retry = 0;
	private _shardCount = 0;
	private _readyShards = 0;

	private logger = new Logger(null);

	public constructor() {
		super(fileURLToPath(new URL('main.js', import.meta.url)), {
			token: process.env.TOKEN!,
			execArgv: ['--enable-source-maps', '--trace-warnings']
		});

		this.on('shardCreate', (shard) => {
			shard.on('ready', () => {
				this._readyShards += 1;
				this.log(`Shard ${shard.id} is ready`);
			});
			this.log(`Shard ${shard.id} is created`);
		});
	}

	public isReady() {
		if (!this._shardCount) return false;
		return this._readyShards >= this._shardCount;
	}

	public async init() {
		this._shardCount = await fetchRecommendedShardCount(process.env.TOKEN!);
		this.log(`Recommended shard is ${this._shardCount}`);

		try {
			await this.spawn();
			this.log(`All shards ready (${this.shards.size})`);
		} catch (error: any) {
			this.logger.error(error, { label: Discord.ShardingManager.name.toString() });

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
		this.logger.debug(message, { label: Discord.ShardingManager.name });
	}
}

const ShardingManager = new Manager();

process.on('unhandledRejection', (error) => {
	console.error(error);
});

ShardingManager.init();

const server = createServer((req, res) => {
	const isReady = ShardingManager.isReady();
	res.writeHead(isReady ? 200 : 400, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify({ isReady }));
});

server.listen(8080, 'localhost', () => {
	ShardingManager.log('Listening on http://localhost:8080');
});
