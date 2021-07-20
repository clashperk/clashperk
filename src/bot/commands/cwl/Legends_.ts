import { Command } from 'discord-akairo';
import { Message } from 'discord.js';

/**
 * @deprecated
 */
export default class CWLLegendsCommand extends Command {
	public constructor() {
		super('cwl-legends', {
			category: 'none',
			description: {}
		});
	}

	public async exec(message: Message) {
		return message.util!.send('**This command is no longer available!**');
	}
}
