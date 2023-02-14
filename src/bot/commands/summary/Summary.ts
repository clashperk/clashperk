import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class SummaryCommand extends Command {
	public constructor() {
		super('summary', {
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
			'compo': this.handler.modules.get('summary-compo')!,
			'wars': this.handler.modules.get('summary-wars')!,
			'clans': this.handler.modules.get('summary-clans')!,
			'trophies': this.handler.modules.get('summary-trophies')!,
			'donations': this.handler.modules.get('summary-donations')!,
			'clan-games': this.handler.modules.get('summary-clan-games')!,
			'attacks': this.handler.modules.get('summary-attacks')!,
			'missed-wars': this.handler.modules.get('summary-missed-wars')!,
			'activity': this.handler.modules.get('summary-activity')!,
			'capital-contribution': this.handler.modules.get('summary-capital-contribution')!,
			'capital-raids': this.handler.modules.get('summary-capital-raids')!,
			'war-results': this.handler.modules.get('summary-war-results')!,
			'best': this.handler.modules.get('summary-best')!
		}[args.command];

		if (!command) return interaction.reply(this.i18n('common.no_option', { lng: interaction.locale }));
		return this.handler.continue(interaction, command);
	}
}
