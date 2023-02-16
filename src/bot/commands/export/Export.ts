import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class ExportCommand extends Command {
	public constructor() {
		super('export', {
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['AttachFiles', 'EmbedLinks'],
			description: {
				content: ['Export war or season stats to excel for all clans.']
			}
		});
	}

	public exec(interaction: CommandInteraction<'cached'>, args: { command: string }) {
		const command = {
			missed: this.handler.modules.get('export-missed')!,
			season: this.handler.modules.get('export-season')!,
			wars: this.handler.modules.get('export-wars')!,
			members: this.handler.modules.get('export-members')!,
			lastwars: this.handler.modules.get('export-last-wars')!,
			cwl: this.handler.modules.get('export-cwl')!
		}[args.command];

		if (!command) return interaction.reply(this.i18n('common.no_option', { lng: interaction.locale }));
		return this.handler.continue(interaction, command);
	}
}
