import 'reflect-metadata';

import { fileURLToPath, URL } from 'node:url';
import Discord from 'discord.js';

class Manager extends Discord.ShardingManager {
	public constructor() {
		super(fileURLToPath(new URL('main.js', import.meta.url)), {
			token: process.env.TOKEN!,
			execArgv: ['--enable-source-maps', '--trace-warnings']
		});
	}

	public async init() {
		return this.spawn({ timeout: 60000 });
	}
}

const ShardingManager = new Manager();

process.on('unhandledRejection', (error) => {
	console.error(error);
});

console.log(process.env);

ShardingManager.init();
