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
		console.log(`READY ${this.client.user.tag} (${this.client.user.id})`);
	}
}

module.exports = ReadyListener;
