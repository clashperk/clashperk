const Logger = require('../util/logger');
const { firebaseApp } = require('./Database');
const moment = require('moment');
require('moment-duration-format');

class Firebase {
	constructor(client, { checkRate = 5 * 60 * 1000 } = {}) {
		this.client = client;
		this.checkRate = checkRate;
	}

	async init() {
		await this.stats();
		this.client.setInterval(this.post.stats(this), this.checkRate);
	}

	async commandcounter() {
		const ref = await firebaseApp.database().ref('stats');
		const msg = await ref.once('value').then(snap => snap.val());
		firebaseApp.database().ref('stats').update({
			commands_used: msg.commands_used + 1
		}, error => {
			if (error) Logger.error(error.toString(), { level: 'FIREBASE' });
		});
	}

	async commands(command) {
		const ref = await firebaseApp.database().ref('commands');
		const data = await ref.once('value').then(snap => snap.val());
		if (!data[command]) {
			firebaseApp.database().ref('commands').update({
				[command]: 1
			}, error => {
				if (error) Logger.error(error.toString(), { level: 'FIREBASE' });
			});
		} else {
			firebaseApp.database().ref('commands').update({
				[command]: data[command] + 1
			}, error => {
				if (error) Logger.error(error.toString(), { level: 'FIREBASE' });
			});
		}

		return data ? data[command] : 1;
	}

	async users(user) {
		const ref = await firebaseApp.database().ref('users');
		const data = await ref.once('value').then(snap => snap.val());
		if (!data[user]) {
			firebaseApp.database().ref('users').update({
				[user]: 1
			}, error => {
				if (error) Logger.error(error.toString(), { level: 'FIREBASE' });
			});
		} else {
			firebaseApp.database().ref('users').update({
				[user]: data[user] + 1
			}, error => {
				if (error) Logger.error(error.toString(), { level: 'FIREBASE' });
			});
		}

		return data ? data[user] : 1;
	}

	async guilds(guild) {
		const ref = await firebaseApp.database().ref('guilds');
		const data = await ref.once('value').then(snap => snap.val());
		if (!data[guild]) {
			firebaseApp.database().ref('guilds').update({
				[guild]: 1
			}, error => {
				if (error) Logger.error(error.toString(), { level: 'FIREBASE' });
			});
		} else {
			firebaseApp.database().ref('guilds').update({
				[guild]: data[guild] + 1
			}, error => {
				if (error) Logger.error(error.toString(), { level: 'FIREBASE' });
			});
		}

		return data ? data[guild] : 1;
	}

	async stats() {
		firebaseApp.database().ref('stats').update({
			uptime: moment.duration(this.client.uptime).format('D [days], H [hrs], m [mins], s [secs]'),
			users: this.client.guilds.reduce((prev, guild) => guild.memberCount + prev, 0),
			guilds: this.client.guilds.size,
			channels: this.client.channels.size
		}, error => {
			if (error) Logger.error(error.toString(), { level: 'FIREBASE' });
		});
	}
}

module.exports = Firebase;
