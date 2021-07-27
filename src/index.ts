import Env from 'dotenv';
Env.config();

import Discord from 'discord.js';
import shell from 'shelljs';
import path from 'path';

class Manager extends Discord.ShardingManager {
	public constructor() {
		super(path.join(__dirname, 'main.js'), {
			token: process.env.TOKEN,
			execArgv: ['--enable-source-maps']
		});
	}

	public init() {
		return this.spawn();
	}
}

const ShardingManager = new Manager();

setInterval(() => {
	if ((process.memoryUsage().heapUsed / 1024 / 1024) < 250) {
		shell.exec('pm2 restart rpc bot');
	}
}, 60 * 1000);

ShardingManager.init();
