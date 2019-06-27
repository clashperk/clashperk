const DBL = require('dblapi.js');
const dbl = new DBL(process.env.DBL);
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
		dbl.postStats(this.client.guilds.size);

		// https://discord.bots.gg
		const options = {
			headers: {
				'Content-Type': 'application/json',
				Authorization: process.env.DISCORD_BOTS_GG
			},
			url: `https://discord.bots.gg/api/v1/bots/${this.client.user.id}/stats`,
			method: 'POST',
			json: {
				guildCount: this.client.guilds.size
			}
		};
		request(options, (error, response, body) => {
			if (error) Logger.warn(error, { tag: 'ROUTES' });
		});


		// https://discordbotlist.com
		const opt = {
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
		};
		request(opt, (error, response, body) => {
			if (error) Logger.warn(error, { tag: 'ROUTES' });
		});
	}
}

module.exports = PostStats;
