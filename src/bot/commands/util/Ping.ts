import { Command } from 'discord-akairo';
import { Message } from 'discord.js';

export default class PingCommand extends Command {
	public constructor() {
		super('ping', {
			aliases: ['ping', 'pong'],
			category: '_hidden',
			description: {
				content: 'Pings me!'
			}
		});
	}

	public async exec(message: Message) {
		const msg = await message.util!.send('Pinging~');

		// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
		const ping = (msg.editedTimestamp || msg.createdTimestamp) - (message.editedTimestamp || message.createdTimestamp);
		// @ts-ignore
		return message.util!.send([
			`**Gateway Ping~ ${Math.round(this.client.ws.ping).toString()}ms**`,
			`**API Ping~ ${ping.toString()}ms**`
		]);
	}
}
