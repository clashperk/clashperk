import { Command } from 'discord-akairo';
import { Message } from 'discord.js';

/**
 * @deprecated
 */
export default class CWLGainedCommand extends Command {
	public constructor() {
		super('cwl-gained', {
			category: 'none',
			description: {}
		});
	}

	public async exec(message: Message) {
		return message.util!.send('**This command has been merged with `/cwl stars` command.**');
	}
}
