const { firebase } = require('./Database');
const moment = require('moment');
require('moment-duration-format');

class Firebase {
	constructor(client, { checkRate = 1 * 60 * 1000 } = {}) {
		this.client = client;
		this.checkRate = checkRate;
	}

	async init() {
		await this.stats();
		this.client.setInterval(this.stats.bind(this), this.checkRate);
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

	async guilds(guild) {
		return firebase.ref('guilds')
			.child(guild)
			.transaction(usage => {
				if (usage === null) return 1;
				return usage + 1;
			}, error => {
				if (error) this.client.logger.error(error, { label: 'FIREBASE' });
			});
	}

	async stats() {
		return firebase.ref('stats').update({
			uptime: moment.duration(process.uptime() * 1000).format('D [days], H [hrs], m [mins], s [secs]', { trim: 'both mid' }),
			users: this.client.guilds.cache.reduce((prev, guild) => guild.memberCount + prev, 0) || this.client.users.cache.size,
			guilds: this.client.guilds.cache.size,
			channels: this.client.channels.cache.size
		}, error => {
			if (error) this.client.logger.error(error, { label: 'FIREBASE' });
		});
	}
}

module.exports = Firebase;
