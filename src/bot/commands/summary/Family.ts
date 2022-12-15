import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class FamilyCommand extends Command {
	public constructor() {
		super('family', {
			category: 'family',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			description: {
				content: ['Summary of family clans.']
			}
		});
	}

	public exec(interaction: CommandInteraction, args: { command: string }) {
		const command = {
			'compo': this.handler.modules.get('family-compo')!,
			'wars': this.handler.modules.get('family-wars')!,
			'clans': this.handler.modules.get('family-clans')!,
			'trophies': this.handler.modules.get('family-trophies')!,
			'donations': this.handler.modules.get('family-donations')!,
			'clan-games': this.handler.modules.get('family-clan-games')!,
			'attacks': this.handler.modules.get('family-attacks')!,
			'missed-wars': this.handler.modules.get('family-missed-wars')!,
			'activity': this.handler.modules.get('family-activity')!
		}[args.command];

		if (!command) return interaction.reply(this.i18n('common.no_option', { lng: interaction.locale }));
		return this.handler.continue(interaction, command);
	}
}
