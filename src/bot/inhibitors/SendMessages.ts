import { Message, TextChannel } from 'discord.js';
import { Inhibitor } from 'discord-akairo';

export default class SendMessagesInhibitor extends Inhibitor {
	public constructor() {
		super('sendMessages', {
			reason: 'sendMessages'
		});
	}

	public exec(message: Message) {
		if (!message.guild) return false;
		if (message.channel.isThread()) {
			return !(message.channel).permissionsFor(this.client.user!)?.has('SEND_MESSAGES_IN_THREADS');
		}
		return !(message.channel as TextChannel).permissionsFor(this.client.user!)?.has('SEND_MESSAGES');
	}
}
