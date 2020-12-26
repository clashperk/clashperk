const https = require('https');
const qs = require('querystring');
const { mongodb } = require('./Database');
const [apiKey, pageId, metricId] = [process.env.API_KEY, process.env.PAGE_ID, process.env.METRIC_ID];

class Stats {
	constructor(client, { postRate = 2.5 * 60 * 1000 } = {}) {
		this.client = client;
		this.postRate = postRate;
		this.count = 0;
	}

	async init() {
		await this.stats();
		this.client.setInterval(this.stats.bind(this), this.postRate);
	}

	counter() {
		return this.count += 1;
	}

	get ISTDate() {
		return new Date(Date.now() + 198e5).toISOString().substring(0, 10);
	}

	async post() {
		let guilds = 0;
		const values = await this.client.shard.broadcastEval(
			`[
				this.guilds.cache.size
			]`
		);

		for (const value of values) {
			guilds += value[0];
		}

		// https://top.gg/
		const form = qs.stringify({ server_count: guilds, shard_count: this.client.shard.count });
		https.request(`https://top.gg/api/bots/${this.client.user.id}/stats`, {
			method: 'POST', headers: {
				Authorization: process.env.DBL,
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': form.length
			}
		}, res => {
			res.on('data', d => {
				if (res.statusCode !== 200) {
					this.client.logger.error(d.toString(), { label: 'https://top.gg' });
				}
			});
		}).end(form);
	}

	async historic() {
		return mongodb.db('clashperk')
			.collection('botusage')
			.updateOne({ ISTDate: this.ISTDate }, {
				$inc: {
					usage: 1
				},
				$set: {
					ISTDate: this.ISTDate
				},
				$min: {
					createdAt: new Date()
				}
			}, { upsert: true });
	}

	async commands(command) {
		await mongodb.db('clashperk')
			.collection('botstats')
			.updateOne({ id: 'stats' }, {
				$set: { id: 'stats' },
				$inc: {
					commands_used: 1,
					[`commands.${command}`]: 1
				}
			}, { upsert: true });

		return this.historic();
	}

	async deletion() {
		return mongodb.db('clashperk')
			.collection('botgrowth')
			.updateOne({ ISTDate: this.ISTDate }, {
				$inc: {
					addition: 0,
					deletion: 1,
					retention: 0
				},
				$set: { ISTDate: this.ISTDate },
				$min: {
					createdAt: new Date()
				}
			}, { upsert: true });
	}

	async addition(guild) {
		const old = await mongodb.db('clashperk')
			.collection('botguilds')
			.countDocuments({ guild });

		return mongodb.db('clashperk')
			.collection('botgrowth')
			.updateOne({ ISTDate: this.ISTDate }, {
				$inc: {
					addition: 1,
					deletion: 0,
					retention: old ? 1 : 0
				},
				$set: { ISTDate: this.ISTDate },
				$min: {
					createdAt: new Date()
				}
			}, { upsert: true });
	}

	async users(user) {
		return mongodb.db('clashperk')
			.collection('botusers')
			.updateOne({ user }, {
				$set: { user },
				$inc: { usage: 1 },
				$min: { createdAt: new Date() }
			}, { upsert: true });
	}

	async guilds(guild, count = 1) {
		return mongodb.db('clashperk')
			.collection('botguilds')
			.updateOne({ guild }, {
				$set: { guild },
				$inc: { usage: count },
				$min: { createdAt: new Date() }
			}, { upsert: true });
	}

	async stats() {
		if (this.client.user.id !== '526971716711350273') return;
		const data = {
			timestamp: Math.floor(new Date() / 1000),
			value: this.count
		};

		try {
			https.request(`https://api.statuspage.io/v1/pages/${pageId}/metrics/${metricId}/data.json`, {
				method: 'POST', headers: { 'Authorization': `OAuth ${apiKey}` }
			}, res => {
				res.on('data', d => {
					if (res.statusCode !== 201) {
						this.client.logger.warn(d.toString(), { label: 'STATUS_PAGE' });
					}
				});
				res.on('end', () => {
					this.count = 0;
				});
			}).end(JSON.stringify({ data }));
		} catch (error) {
			this.client.logger.error(error, { label: 'STATUS_PAGE' });
		}
	}
}

module.exports = Stats;
