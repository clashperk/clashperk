import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class LegendCommand extends Command {
	public constructor() {
		super('legend', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			description: {
				content: ['Legend season overview and summary.']
			}
		});
	}

	public exec(interaction: CommandInteraction, args: { command: string }) {
		const command = {
			attacks: this.handler.modules.get('legend-attacks')!,
			days: this.handler.modules.get('legend-days')!
		}[args.command];

		if (!command) return interaction.reply(this.i18n('common.no_option', { lng: interaction.locale }));
		return this.handler.exec(interaction, command, args);
	}
}
