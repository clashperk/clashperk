const request = require('request');
const https = require('https');
const apiKey = '8c675e60-3f0c-486b-9891-5e44c57adbb2';
const pageId = '4yfhbwkxvrf6';
const metricId = 'ffzb3v8k3clv';
const authHeader = { 'Authorization': `OAuth ${apiKey}` };
const options = { method: 'POST', headers: authHeader };

class PostStats {
	constructor(client, { postRate = 2.5 * 60 * 1000 } = {}) {
		this.client = client;
		this.postRate = postRate;
		this.command = [];
	}

	commands() {
		return this.command.push(1);
	}

	status() {
		const data = {
			timestamp: Math.floor(new Date() / 1000),
			value: this.command.reduce((p, c) => p + c, 0)
		};

		this.command = [];

		const request = https.request(`https://api.statuspage.io/v1/pages/${pageId}/metrics/${metricId}/data.json`, options, res => {
			res.on('data', () => {
				// console.log('/');
			});
			res.on('end', () => {
				setTimeout(this.status.bind(this), this.postRate);
			});
		});

		return request.end(JSON.stringify({ data }));
	}

	async post() {
		let [guilds, users] = [0, 0];
		const values = await this.client.shard.broadcastEval(
			`[
				this.guilds.cache.size,
				this.guilds.cache.reduce((previous, current) => current.memberCount + previous, 0),
			]`
		);

		for (const value of values) {
			guilds += value[0];
			users += value[1];
		}

		// https://top.gg/
		request({
			headers: {
				Authorization: process.env.DBL,
				'Content-Type': 'application/json'
			},
			url: `https://top.gg/api/bots/${this.client.user.id}/stats`,
			method: 'POST',
			form: { server_count: guilds, shard_count: this.client.shard.count }
		}, (error, response, body) => {
			if (error) this.client.logger.error(error.toString(), { level: 'https://top.gg' });
		});

		// https://discord.bots.gg/
		request({
			headers: {
				'Content-Type': 'application/json',
				Authorization: process.env.DISCORD_BOTS_GG
			},
			url: `https://discord.bots.gg/api/v1/bots/${this.client.user.id}/stats`,
			method: 'POST',
			json: { guildCount: guilds }
		}, (error, response, body) => {
			if (error) this.client.logger.error(error, { level: 'https://discord.bots.gg' });
		});


		// https://discordbotlist.com/
		request({
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bot ${process.env.DISCORD_BOT_LIST}`
			},
			url: `https://discordbotlist.com/api/bots/${this.client.user.id}/stats`,
			method: 'POST',
			json: { guilds, users }
		}, (error, response, body) => {
			if (error) this.client.logger.error(error, { level: 'https://discordbotlist.com' });
		});
	}
}

module.exports = PostStats;
