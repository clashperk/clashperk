import { Command } from 'discord-akairo';
import { Message } from 'discord.js';

export default class GuideCommand extends Command {
	public constructor() {
		super('guide', {
			aliases: ['guide'],
			category: '_hidden',
			clientPermissions: ['EMBED_LINKS'],
			description: { content: 'Shows info about how to use the bot.' }
		});
	}

	public async exec(message: Message) {
		return message.util!.send([
			'**Join Support Server for Help and Guide**',
			'https://discord.gg/ppuppun'
		].join('\n'));
	}
}
