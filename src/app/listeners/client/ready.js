const { Listener } = require('discord-akairo');

class ReadyListener extends Listener {
	constructor() {
		super('ready', {
			event: 'ready',
			emitter: 'client',
			category: 'client'
		});
	}

	async exec() {
		this.client.logger.info(`${this.client.user.tag} (${this.client.user.id})`, { label: 'READY' });
	}
}

module.exports = ReadyListener;
