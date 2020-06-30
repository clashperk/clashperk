const { ShardingManager } = require("discord.js");
const path = require("path");

class Manager extends ShardingManager {
	constructor() {
		super(path.join(__dirname, "main.js"), {
			token: process.env.TOKEN
		});
	}

	init() {
		return this.spawn();
	}
}

module.exports = Manager;
