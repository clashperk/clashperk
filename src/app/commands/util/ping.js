const { Command } = require('discord-akairo');

class PingCommand extends Command {
	constructor() {
		super('ping', {
			aliases: ['ping', 'pong'],
			category: 'util',
			description: {
				content: 'Pings me!'
			}
		});
	}

	cooldown(message) {
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 10000;
		return 30000;
	}

	async exec(message) {
		const msg = await message.util.send('Pinging~');
		// eslint-disable-next-line max-len
		const latency = (msg.editedTimestamp || msg.createdTimestamp) - (message.editedTimestamp || message.createdTimestamp);
		return message.util.send([
			`**Gateway Ping~ ${latency.toString()}ms**`,
			`**API Ping~ ${Math.round(this.client.ws.ping).toString()}ms**`
		]);
	}
}

module.exports = PingCommand;
