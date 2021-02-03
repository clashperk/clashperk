import { Command } from 'discord-akairo';
import { Message } from 'discord.js';

export default class LinkListCommand extends Command {
	public constructor() {
		super('link-list', {
			category: '_hidden',
			clientPermissions: ['EMBED_LINKS'],
			channel: 'guild',
			description: {}
		});
	}

	public exec(message: Message) {
		console.log(message.id);
	}
}
