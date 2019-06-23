const { AkairoClient } = require('discord-akairo');

class Client extends AkairoClient {
	constructor(config) {
		super({ ownerID: config.owner }, {
			disableEveryone: true,
			disabledEvents: ['TYPING_START']
		});

		this.setup();
	}

	async start(token) {
		return this.login(token);
	}
}

module.exports = Client;
