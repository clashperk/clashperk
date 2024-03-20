import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class LinkCommand extends Command {
	public constructor() {
		super('link', {
			category: 'profile',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			description: {
				content: 'Links a Player or Clan to a Discord account.'
			},
			root: true,
			defer: false
		});
	}

	public exec(interaction: CommandInteraction<'cached'>, args: { command: string }) {
		const command = {
			create: this.handler.modules.get('link-create')!,
			list: this.handler.modules.get('link-list')!,
			delete: this.handler.modules.get('link-delete')!
		}[args.command];

		if (!command) throw Error('Command not found.');
		return this.handler.continue(interaction, command);
	}
}
