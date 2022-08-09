import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class AliasCommand extends Command {
	public constructor() {
		super('alias', {
			category: 'setup',
			channel: 'guild',
			description: {
				content: ['Create, Remove or View clan aliases.']
			}
		});
	}

	public exec(interaction: CommandInteraction<'cached'>, args: { command: string }) {
		const command = {
			list: this.handler.modules.get('alias-list')!,
			create: this.handler.modules.get('alias-create')!,
			delete: this.handler.modules.get('alias-delete')!
		}[args.command];

		if (!command) return interaction.reply(this.i18n('common.no_option', { lng: interaction.locale }));
		return this.handler.continue(interaction, command);
	}
}
