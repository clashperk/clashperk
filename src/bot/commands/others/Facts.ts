import { Command } from 'discord-akairo';
import FACTS from '../../util/Facts';
import { Message } from 'discord.js';

export default class FactsCommand extends Command {
	public constructor() {
		super('facts', {
			aliases: ['facts', 'fact'],
			category: 'other',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Shows random clash of clans facts.'
			}
		});
	}

	public exec(message: Message) {
		const embed = this.client.util.embed(FACTS[Math.floor(Math.random() * FACTS.length)])
			.setColor(this.client.embed(message))
			.setTimestamp();
		return message.util!.send({ embed });
	}
}
