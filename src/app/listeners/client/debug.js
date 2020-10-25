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
		if (process.env.DEBUG) this.client.logger.debug(`${info}`, { label: 'DEDUG' });
	}
}

module.exports = DebugListener;
