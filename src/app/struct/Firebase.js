const Logger = require('../util/logger');
const firebase = require('firebase-admin');
const os = require('os-utils');
const moment = require('moment');
require('moment-duration-format');
const Clans = require('../models/Clans');

const firebaseApp = firebase.initializeApp({
	credential: firebase.credential.cert({
		projectId: process.env.PROJECT_ID,
		clientEmail: process.env.CLIENT_EMAIL,
		privateKey: process.env.PRIVATE_KEY.replace(/\\n/g, '\n')
	}),
	databaseURL: process.env.FIREBASE_DBURL
});

class Firebase {
	constructor(client, { checkRate = 5 * 60 * 1000 } = {}) {
		this.client = client;
		this.checkRate = checkRate;
	}

	async commandcounter() {
		const ref = await firebaseApp.database().ref(process.env.FIREBASE_DB);
		const msg = await ref.once('value').then(snap => snap.val());
		firebaseApp.database().ref(process.env.FIREBASE_DB).update({
			commands_used: msg.commands_used + 1
		}, error => {
			if (error) Logger.error(error.toString(), { level: 'FIREBASE' });
		});
	}

	async init() {
		await this.post();
		this.client.setInterval(this.post.bind(this), this.checkRate);
	}

	async post() {
		firebaseApp.database().ref(process.env.FIREBASE_DB).update({
			uptime: moment.duration(this.client.uptime).format('M [months], W [weeks], D [days], H [hrs], m [mins], s [secs]'),
			users: this.client.guilds.reduce((prev, guild) => guild.memberCount + prev, 0),
			guilds: this.client.guilds.size,
			channels: this.client.channels.size
		}, error => {
			if (error) Logger.error(error.toString(), { level: 'FIREBASE' });
		});
	}
}

module.exports = Firebase;
