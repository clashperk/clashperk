import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class CapitalCommand extends Command {
	public constructor() {
		super('capital', {
			category: 'search',
			channel: 'guild',
			description: {
				content: ['Shows clan capital contribution and raids.']
			}
		});
	}

	public exec(interaction: CommandInteraction<'cached'>, args: { command: string }) {
		const command = {
			contribution: this.handler.modules.get('capital-contribution')!,
			raids: this.handler.modules.get('capital-raids')!,
			week: this.handler.modules.get('capital-week')!
		}[args.command];

		if (!command) return interaction.reply(this.i18n('common.no_option', { lng: interaction.locale }));
		return this.handler.continue(interaction, command);
	}
}
