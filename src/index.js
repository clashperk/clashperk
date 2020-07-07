require('dotenv').config();
const Discord = require('discord.js');
const path = require('path');

class Manager extends Discord.ShardingManager {
	constructor() {
		super(path.join(__dirname, 'main.js'), {
			token: process.env.TOKEN
		});
	}

	init() {
		return this.spawn();
	}
}

const ShardingManager = new Manager();

ShardingManager.init();
