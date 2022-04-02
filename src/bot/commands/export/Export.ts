import { Command } from '../../lib';
import { CommandInteraction } from 'discord.js';

export default class ExportCommand extends Command {
	public constructor() {
		super('export', {
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['ATTACH_FILES', 'EMBED_LINKS'],
			description: {
				content: ['Export war or season stats to excel for all clans.']
			}
		});
	}

	public exec(interaction: CommandInteraction<'cached'>, args: { option: string }) {
		const command = {
			missed: this.handler.modules.get('export-missed')!,
			season: this.handler.modules.get('export-season')!,
			wars: this.handler.modules.get('export-wars')!,
			members: this.handler.modules.get('export-members')!,
			lastwars: this.handler.modules.get('export-last-wars')!,
			cwl: this.handler.modules.get('export-cwl')!
		}[args.option];

		if (!command) return interaction.reply(this.i18n('common.no_option', { lng: interaction.locale }));
		return this.handler.continue(interaction, command);
	}
}
