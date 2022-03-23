import { Command } from '../../lib';
import { CommandInteraction } from 'discord.js';
import { Messages } from '../../util/Constants';

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

		if (!command) return interaction.reply(Messages.COMMAND.OPTION_NOT_FOUND);
		return this.handler.exec(interaction, command, args);
	}
}
