import 'reflect-metadata';

import Discord, { DiscordjsErrorCodes } from 'discord.js';
import { fileURLToPath, URL } from 'node:url';

class Manager extends Discord.ShardingManager {
	private retry = 0;

	public constructor() {
		super(fileURLToPath(new URL('main.js', import.meta.url)), {
			token: process.env.TOKEN!,
			execArgv: ['--enable-source-maps', '--trace-warnings']
		});
	}

	public async init() {
		try {
			await this.spawn();
			this.retry = 0;
		} catch (error: any) {
			if (error.code === DiscordjsErrorCodes.ShardingAlreadySpawned) {
				this.retry = 0;
			} else if (error.code === DiscordjsErrorCodes.TokenInvalid) {
				process.exit(1);
			} else {
				this.retry++;
				setTimeout(() => this.init(), this.retry * 5500);
			}
			console.error(error);
		}
	}
}

const ShardingManager = new Manager();

process.on('unhandledRejection', (error) => {
	console.error(error);
});

ShardingManager.init();
