import { Listener } from 'discord-akairo';
import { Message } from 'discord.js';

export default class MessageListener extends Listener {
	public constructor() {
		super('message', {
			event: 'message',
			emitter: 'client',
			category: 'client'
		});
	}

	public exec(message: Message) {
		if (!message.guild) return;
		if (message.author.bot) return;
		return this.client.stats.message(message.guild.id);
	}
}
