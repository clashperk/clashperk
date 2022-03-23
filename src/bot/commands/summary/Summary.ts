import { Command } from '../../lib';
import { CommandInteraction } from 'discord.js';
import { Messages } from '../../util/Constants';

export default class SummaryCommand extends Command {
	public constructor() {
		super('summary', {
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: ['Summary of wars/clans/clan games for all clans.']
			}
		});
	}

	public exec(interaction: CommandInteraction, args: { option: string }) {
		const command = {
			'wars': this.handler.modules.get('war-summary')!,
			'clans': this.handler.modules.get('clan-summary')!,
			'trophies': this.handler.modules.get('trophy-summary')!,
			'donations': this.handler.modules.get('donation-summary')!,
			'games': this.handler.modules.get('clan-games-summary')!,
			'player-donations': this.handler.modules.get('player-donation-summary')!
		}[args.option];

		if (!command) return interaction.reply(Messages.COMMAND.OPTION_NOT_FOUND);
		return this.handler.continue(interaction, command);
	}
}
