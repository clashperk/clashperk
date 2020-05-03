const request = require('request');

class PostStats {
	constructor(client, { postRate = 30 * 60 * 1000 } = {}) {
		this.client = client;
		this.postRate = postRate;
	}

	async init() {
		await this.post();
		this.client.setInterval(this.post.bind(this), this.postRate);
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
