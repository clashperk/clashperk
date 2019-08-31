const request = require('request');
const Logger = require('../util/logger');

class PostStats {
	constructor(client, { checkRate = 30 * 60 * 1000 } = {}) {
		this.client = client;
		this.checkRate = checkRate;
	}

	async init() {
		await this.post();
		this.client.setInterval(this.post.bind(this), this.checkRate);
	}

	async post() {
		// https://discordbots.org
		request({
			headers: {
				Authorization: process.env.DBL,
				'Content-Type': 'application/json'
			},
			url: `https://discordbots.org/api/bots/${this.client.user.id}/stats`,
			method: 'POST',
			form: {
				server_count: this.client.guilds.size
			}
		}, (error, response, body) => {
			if (error) Logger.error(error.toString(), { level: 'https://discord.bots.gg' });
		});

		// https://discord.bots.gg
		request({
			headers: {
				'Content-Type': 'application/json',
				Authorization: process.env.DISCORD_BOTS_GG
			},
			url: `https://discord.bots.gg/api/v1/bots/${this.client.user.id}/stats`,
			method: 'POST',
			json: {
				guildCount: this.client.guilds.size
			}
		}, (error, response, body) => {
			if (error) Logger.error(error, { level: 'https://discord.bots.gg' });
		});


		// https://discordbotlist.com
		request({
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bot ${process.env.DISCORD_BOT_LIST}`
			},
			url: `https://discordbotlist.com/api/bots/${this.client.user.id}/stats`,
			method: 'POST',
			json: {
				guilds: this.client.guilds.size,
				users: this.client.guilds.reduce((prev, guild) => guild.memberCount + prev, 0)
			}
		}, (error, response, body) => {
			if (error) Logger.error(error, { level: 'https://discordbotlist.com' });
		});
	}
}

module.exports = PostStats;
