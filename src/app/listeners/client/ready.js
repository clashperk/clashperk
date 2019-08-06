const { Listener } = require('discord-akairo');
const Logger = require('../../util/logger');

class ReadyListener extends Listener {
	constructor() {
		super('ready', {
			event: 'ready',
			emitter: 'client',
			category: 'client'
		});
	}

	async exec() {
		Logger.info(`${this.client.user.tag} (${this.client.user.id})`, { level: 'READY' });

		this.client.user.setActivity(`@${this.client.user.username} help`);

		if (this.client.user.id === process.env.CLIENT_ID) {
			this.client.firebase.init();
			this.client.postStats.init();
		}

		// this.client.tracker.init();
	}
}

module.exports = ReadyListener;
