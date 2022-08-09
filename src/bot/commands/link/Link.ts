import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class LinkCommand extends Command {
	public constructor() {
		super('link', {
			category: 'profile',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Links a Player or Clan to a Discord account.'
			}
		});
	}

	public exec(interaction: CommandInteraction<'cached'>, args: { command: string }) {
		const command = {
			create: this.handler.modules.get('link-create')!,
			list: this.handler.modules.get('link-list')!,
			delete: this.handler.modules.get('link-delete')!
		}[args.command];

		if (!command) return interaction.reply(this.i18n('common.no_option', { lng: interaction.locale }));
		return this.handler.continue(interaction, command);
	}
}
