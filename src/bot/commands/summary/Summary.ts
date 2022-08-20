import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class SummaryCommand extends Command {
	public constructor() {
		super('summary', {
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			description: {
				content: ['Summary of wars/clans/clan games for all clans.']
			}
		});
	}

	public exec(interaction: CommandInteraction, args: { option: string }) {
		const command = {
			'wars': this.handler.modules.get('war-summary')!,
			'clans': this.handler.modules.get('summary-clans')!,
			'trophies': this.handler.modules.get('trophy-summary')!,
			'donations': this.handler.modules.get('donation-summary')!,
			'clan-games': this.handler.modules.get('summary-clan-games')!,
			'player-donations': this.handler.modules.get('player-donation-summary')!,
			'attacks': this.handler.modules.get('attack-summary')!
		}[args.option];

		if (!command) return interaction.reply(this.i18n('common.no_option', { lng: interaction.locale }));
		return this.handler.continue(interaction, command);
	}
}
