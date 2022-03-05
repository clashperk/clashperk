import { Command, Flag } from 'discord-akairo';
import { Message } from 'discord.js';

export default class ReminderCommand extends Command {
	public constructor() {
		super('reminder', {
			aliases: ['reminder', 'autoping'],
			category: 'setup',
			channel: 'guild',
			description: {
				content: [
					'Create, delete or view war attack reminders.'
				],
				usage: '',
				examples: []
			}
		});
	}

	public *args(): unknown {
		const sub = yield {
			type: [
				['reminder-create', 'create'],
				['reminder-delete', 'delete'],
				['reminder-list', 'list']
			],
			otherwise: (msg: Message) => this.handler.handleDirectCommand(msg, 'reminder', this.handler.modules.get('help')!)
		};

		return Flag.continue(sub);
	}
}
