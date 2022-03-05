import { Message } from 'discord.js';
import { Inhibitor } from 'discord-akairo';

export default class TextCommandInhibitor extends Inhibitor {
	public constructor() {
		super('textCommand', {
			reason: 'textCommand'
		});
	}

	public exec(message: Message) {
		if (message.member?.permissions.has('MANAGE_MESSAGES') && message.guild?.id === '509784317598105619') return false;
		if (this.client.isOwner(message.author.id)) return false;
		return !message.interaction;
	}
}
