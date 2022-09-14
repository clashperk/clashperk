import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class CapitalCommand extends Command {
	public constructor() {
		super('capital', {
			category: 'activity',
			channel: 'guild',
			description: {
				content: ['Shows clan capital contributions and raids.']
			}
		});
	}

	public exec(interaction: CommandInteraction<'cached'>, args: { command: string }) {
		const command = {
			contributions: this.handler.modules.get('capital-contributions')!,
			raids: this.handler.modules.get('capital-raids')!
		}[args.command];

		if (!command) return interaction.reply(this.i18n('common.no_option', { lng: interaction.locale }));
		return this.handler.continue(interaction, command);
	}
}
