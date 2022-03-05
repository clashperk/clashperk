import { Message } from 'discord.js';
import { Inhibitor } from 'discord-akairo';

export default class TextCommandInhibitor extends Inhibitor {
	public constructor() {
		super('textCommand', {
			reason: 'textCommand'
		});
	}

	public exec(message: Message) {
		if (this.client.isOwner(message.author.id)) return false;
		return !message.interaction;
	}
}
