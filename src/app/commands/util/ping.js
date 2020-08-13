const { Command } = require('discord-akairo');

class PingCommand extends Command {
	constructor() {
		super('ping', {
			aliases: ['ping', 'pong'],
			category: 'hidden',
			clientPermissions: [
				'EMBED_LINKS',
				'MANAGE_MESSAGES',
				'USE_EXTERNAL_EMOJIS',
				'ADD_REACTIONS',
				'SEND_MESSAGES',
				'READ_MESSAGE_HISTORY'
			],
			description: {
				content: 'Pings me!'
			}
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message) {
		const msg = await message.util.send('Pinging~');
		const latency = (msg.editedTimestamp || msg.createdTimestamp) - (message.editedTimestamp || message.createdTimestamp);
		return message.util.send([
			`**Gateway Ping~ ${latency.toString()}ms**`,
			`**API Ping~ ${Math.round(this.client.ws.ping).toString()}ms**`
		]);
	}
}

module.exports = PingCommand;
