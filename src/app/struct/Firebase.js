const { firebase, mongodb } = require('./Database');
const moment = require('moment');
require('moment-duration-format');
const https = require('https');
const qs = require('querystring');
const [apiKey, pageId, metricId] = [process.env.API_KEY, process.env.PAGE_ID, process.env.METRIC_ID];

class Firebase {
	constructor(client, { postRate = 2.5 * 60 * 1000 } = {}) {
		this.client = client;
		this.postRate = postRate;
		this.count = 0;
		this.clans = 0;
	}

	async init() {
		await this.stats();
		this.client.setInterval(this.stats.bind(this), this.postRate);
	}

	counter() {
		return this.count += 1;
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

	async commandcounter() {
		return firebase.ref('stats')
			.child('commands_used')
			.transaction(usage => {
				if (usage === null) return 1;
				return usage + 1;
			}, error => {
				if (error) this.client.logger.error(error, { label: 'FIREBASE' });
			});
	}

	async commands(command) {
		return firebase.ref('commands')
			.child(command)
			.transaction(usage => {
				if (usage === null) return 1;
				return usage + 1;
			}, error => {
				if (error) this.client.logger.error(error, { label: 'FIREBASE' });
			});
	}

	async ranks(user) {
		return firebase.ref('ranks')
			.child(user)
			.transaction(point => {
				if (point === null) return { xp: Math.floor(Math.random() * 5) };
				point.xp += Math.floor(Math.random() * 5);
				return point;
			}, error => {
				if (error) this.client.logger.error(error, { label: 'FIREBASE' });
			});
	}

	async deletion() {
		const now = new Date(new Date().getTime() + 198e5);
		const id = [now.getFullYear(), now.getMonth() + 1, now.getDate()].join('-');
		return firebase.ref('growth')
			.child(id)
			.transaction(data => {
				if (data === null) return { deletion: -1, addition: 0, retention: 0 };
				data.deletion -= 1;
				return data;
			}, error => {
				if (error) this.client.logger.error(error, { label: 'FIREBASE' });
			});
	}

	async addition(guild) {
		const now = new Date(new Date().getTime() + 198e5);
		const id = [now.getFullYear(), now.getMonth() + 1, now.getDate()].join('-');
		const old = await firebase.ref('guilds')
			.child(guild)
			.once('value')
			.then(snap => snap.exists());
		return firebase.ref('growth')
			.child(id)
			.transaction(data => {
				if (data === null) return { addition: 1, deletion: 0, retention: old ? 1 : 0 };
				if (old) data.retention += 1;
				data.addition += 1;
				return data;
			}, error => {
				if (error) this.client.logger.error(error, { label: 'FIREBASE' });
			});
	}

	async users(user) {
		return firebase.ref('users')
			.child(user)
			.transaction(usage => {
				if (usage === null) return 1;
				return usage + 1;
			}, error => {
				if (error) this.client.logger.error(error, { label: 'FIREBASE' });
			});
	}

	async guilds(guild, count = 1) {
		return firebase.ref('guilds')
			.child(guild)
			.transaction(usage => {
				if (usage === null) return count;
				return usage + count;
			}, error => {
				if (error) this.client.logger.error(error, { label: 'FIREBASE' });
			});
	}

	async dbCount() {
		if (this.clans && this.players) return { clans: this.clans, players: this.players };

		this.clans = await mongodb.db('clashperk')
			.collection('clanstores')
			.find()
			.count();

		this.players = await mongodb.db('clashperk')
			.collection('lastonlines')
			.find()
			.count();

		const id = setTimeout(() => {
			this.clans = 0;
			this.players = 0;
			clearTimeout(id);
		}, 60 * 60 * 1000);

		return { clans: this.clans, players: this.players };
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

		let [guilds, users, channels] = [0, 0, 0];
		const values = await this.client.shard.broadcastEval(
			`[
				this.guilds.cache.size,
				this.guilds.cache.reduce((previous, current) => current.memberCount + previous, 0),
				this.channels.cache.size
			]`
		);

		for (const value of values) {
			guilds += value[0];
			users += value[1];
			channels += value[2];
		}

		const { clans, players } = await this.dbCount();
		return firebase.ref('stats').update({
			uptime: moment.duration(process.uptime() * 1000).format('D[d] H[h] m[m] s[s]', { trim: 'both mid' }),
			users,
			guilds,
			channels,
			clans,
			players
		}, error => {
			if (error) this.client.logger.error(error, { label: 'FIREBASE' });
		});
	}
}

module.exports = Firebase;
