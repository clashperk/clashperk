import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class ReminderCommand extends Command {
	public constructor() {
		super('reminders', {
			category: 'none',
			channel: 'guild',
			description: {
				content: ['Create, delete or view war attack reminders.']
			}
		});
	}

	public exec(interaction: CommandInteraction, args: { command: string; subCommand: string }) {
		if (args.subCommand === 'capital-raids') {
			const command = {
				create: this.handler.modules.get('capital-reminder-create')!,
				delete: this.handler.modules.get('capital-reminder-delete')!,
				list: this.handler.modules.get('capital-reminder-list')!
			}[args.command];

			if (!command) return interaction.reply(this.i18n('common.no_option', { lng: interaction.locale }));
			return this.handler.continue(interaction, command);
		}
		const command = {
			create: this.handler.modules.get('reminder-create')!,
			delete: this.handler.modules.get('reminder-delete')!,
			list: this.handler.modules.get('reminder-list')!,
			now: this.handler.modules.get('reminder-now')!
		}[args.command];

		if (!command) return interaction.reply(this.i18n('common.no_option', { lng: interaction.locale }));
		return this.handler.continue(interaction, command);
	}
}
