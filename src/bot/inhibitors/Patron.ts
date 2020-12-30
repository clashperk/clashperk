import { Inhibitor, Command } from 'discord-akairo';
import { Message } from 'discord.js';

export default class PatronInhibitor extends Inhibitor {
	public constructor() {
		super('patron', {
			reason: 'patron'
		});
	}

	public exec(message: Message, command: Command) {
		if (this.client.isOwner(message.author.id)) return false;
		if (command.categoryID !== 'patron') return false;
		return !this.client.patrons.get(message.guild!.id);
	}
}
