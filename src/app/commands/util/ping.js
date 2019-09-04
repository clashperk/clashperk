const { Command, Flag } = require('discord-akairo');

class PingCommand extends Command {
	constructor() {
		super('ping', {
			aliases: ['ping', 'pong'],
			category: 'util',
			cooldown: 1000,
			description: {
				content: 'Pings me!'
			},
			args: [
				{
					id: 'member',
					type: (msg, str) => {
						const resolver = this.handler.resolver.type('guildMember')(msg, str);
						console.log(resolver);
					}
				}
			]
		});
	}

	async exec(message, { member }) {
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
