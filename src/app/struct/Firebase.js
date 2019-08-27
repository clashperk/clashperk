const Logger = require('../util/logger');
const { firebase } = require('./Database');
const moment = require('moment');
require('moment-duration-format');

class Firebase {
	constructor(client, { checkRate = 1 * 60 * 10000 } = {}) {
		this.client = client;
		this.checkRate = checkRate;
	}

	async init() {
		await this.stats();
		this.client.setInterval(this.stats.bind(this), this.checkRate);
	}

	async commandcounter() {
		const ref = await firebase.ref('stats');
		const msg = await ref.once('value').then(snap => snap.val());
		firebase.ref('stats').update({
			commands_used: msg.commands_used + 1
		}, error => {
			if (error) Logger.error(error.toString(), { level: 'FIREBASE' });
		});
	}

	async commands(command) {
		const ref = await firebase.ref('commands');
		const data = await ref.once('value').then(snap => snap.val());
		if (!data[command]) {
			firebase.ref('commands').update({
				[command]: 1
			}, error => {
				if (error) Logger.error(error.toString(), { level: 'FIREBASE' });
			});
		} else {
			firebase.ref('commands').update({
				[command]: data[command] + 1
			}, error => {
				if (error) Logger.error(error.toString(), { level: 'FIREBASE' });
			});
		}

		return data ? data[command] : 1;
	}

	async users(user) {
		const ref = await firebase.ref('users');
		const data = await ref.once('value').then(snap => snap.val());
		if (!data[user]) {
			firebase.ref('users').update({
				[user]: 1
			}, error => {
				if (error) Logger.error(error.toString(), { level: 'FIREBASE' });
			});
		} else {
			firebase.ref('users').update({
				[user]: data[user] + 1
			}, error => {
				if (error) Logger.error(error.toString(), { level: 'FIREBASE' });
			});
		}

		return data ? data[user] : 1;
	}

	async guilds(guild) {
		const ref = await firebase.ref('guilds');
		const data = await ref.once('value').then(snap => snap.val());
		if (!data[guild]) {
			firebase.ref('guilds').update({
				[guild]: 1
			}, error => {
				if (error) Logger.error(error.toString(), { level: 'FIREBASE' });
			});
		} else {
			firebase.ref('guilds').update({
				[guild]: data[guild] + 1
			}, error => {
				if (error) Logger.error(error.toString(), { level: 'FIREBASE' });
			});
		}

		return data ? data[guild] : 1;
	}

	async stats() {
		firebase.ref('stats').update({
			uptime: moment.duration(this.client.uptime).format('D [days], H [hrs], m [mins], s [secs]'),
			users: this.client.guilds.reduce((prev, guild) => guild.memberCount + prev, 0) || this.client.users.size,
			guilds: this.client.guilds.size,
			channels: this.client.channels.size
		}, error => {
			if (error) Logger.error(error.toString(), { level: 'FIREBASE' });
		});
	}
}

module.exports = Firebase;
