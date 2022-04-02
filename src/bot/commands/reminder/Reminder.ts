import { Command } from '../../lib';
import { CommandInteraction } from 'discord.js';

export default class ReminderCommand extends Command {
	public constructor() {
		super('reminder', {
			category: 'setup',
			channel: 'guild',
			description: {
				content: ['Create, delete or view war attack reminders.']
			}
		});
	}

	public exec(interaction: CommandInteraction, args: { command: string }) {
		const command = {
			create: this.handler.modules.get('reminder-create')!,
			delete: this.handler.modules.get('reminder-delete')!,
			list: this.handler.modules.get('reminder-list')!
		}[args.command];

		if (!command) return interaction.reply(this.i18n('common.no_option', { lng: interaction.locale }));
		return this.handler.continue(interaction, command);
	}
}
