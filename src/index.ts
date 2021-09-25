import Env from 'dotenv';
Env.config();

import Discord from 'discord.js';
import shell from 'shelljs';
import path from 'path';
import os from 'os';

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
	if ((os.freemem() / (1024 * 1024)) < 1024) {
		shell.exec('sync; echo 1 > /proc/sys/vm/drop_caches');
	}
}, 60 * 1000);

ShardingManager.init();
