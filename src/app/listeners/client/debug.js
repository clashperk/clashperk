const { Listener } = require('discord-akairo');

class DebugListener extends Listener {
	constructor() {
		super('debug', {
			event: 'debug',
			emitter: 'client',
			category: 'client'
		});
	}

	async exec(info) {
		this.client.logger.info(`${info}`, { label: 'DEDUG' });
	}
}

module.exports = DebugListener;
