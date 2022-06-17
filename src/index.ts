import 'reflect-metadata';

import Discord from 'discord.js';
import { fileURLToPath, URL } from 'url';

class Manager extends Discord.ShardingManager {
	public constructor() {
		super(fileURLToPath(new URL('main.js', import.meta.url)), {
			token: process.env.TOKEN!,
			execArgv: ['--enable-source-maps', '--trace-warnings', '--es-module-specifier-resolution=node']
		});
	}

	public init() {
		return this.spawn({ timeout: -1 }).catch(() => console.log('fucked up'));
	}
}

const ShardingManager = new Manager();

process.on('unhandledRejection', (error) => {
	console.error(error);
});

await ShardingManager.init();
