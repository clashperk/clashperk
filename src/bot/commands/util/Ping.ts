import { Command } from '../../lib';
import { Message } from 'discord.js';

export default class PingCommand extends Command {
	public constructor() {
		super('ping', {
			category: 'none',
			description: {
				content: 'Pings me!'
			}
		});
	}

	public async run(message: Message) {
		const msg = await message.channel.send('Pinging~');

		// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
		const ping = (msg.editedTimestamp || msg.createdTimestamp) - (message.editedTimestamp || message.createdTimestamp);
		return msg.edit(
			[`**Gateway Ping~ ${Math.round(this.client.ws.ping).toString()}ms**`, `**API Ping~ ${ping.toString()}ms**`].join('\n')
		);
	}
}
