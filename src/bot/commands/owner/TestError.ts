import { Command } from 'discord-akairo';
import { Message } from 'discord.js';

export default class ErrorCommand extends Command {
	public constructor() {
		super('error', {
			aliases: ['error'],
			category: 'owo',
			ownerOnly: true
		});
	}

	public exec(message: Message) {
		// @ts-ignore
		return message.util!.sen_d('~uwu~');
	}
}
