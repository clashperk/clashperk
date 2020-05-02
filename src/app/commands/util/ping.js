const { Command, Flag } = require('discord-akairo');

class PingCommand extends Command {
	constructor() {
		super('ping', {
			aliases: ['ping', 'pong'],
			category: 'util',
			cooldown: 1000,
			description: {
				content: 'Pings me!'
			}
		});
	}

	async exec(message) {
		const f = await this.client.cutil.s(message);
		console.log(f);
	}
}

module.exports = PingCommand;
