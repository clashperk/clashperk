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

	public async exec(message: Message) {
		await message.util!.send('~uwu~');
		// @ts-ignore
		return message.util!.sen_d('~uwu~');
	}
}
