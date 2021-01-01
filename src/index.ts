import Env from 'dotenv';
Env.config();

import Discord from 'discord.js';
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

ShardingManager.init();
