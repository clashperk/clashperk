import { Command } from '../../lib';
import { CommandInteraction } from 'discord.js';
import { Messages } from '../../util/Constants';

export default class FlagCommand extends Command {
	public constructor() {
		super('flag', {
			category: 'setup',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			description: {
				content: [
					'Manage player flags in a server or clan.',
					'',
					'This is a feature to mark players as banned or flagged and get notified whenever they join back to the clan or clan family.',
					'',
					"To receive notification you must setup **Clan Feed** with a mentionable role. Flags are per server basis. It doesn't travel among Discord servers and not accessible from other servers."
				]
			}
		});
	}

	public exec(interaction: CommandInteraction, args: { command: string }) {
		const command = {
			list: this.handler.modules.get('flag-list')!,
			create: this.handler.modules.get('flag-create')!,
			search: this.handler.modules.get('flag-search')!,
			delete: this.handler.modules.get('flag-delete')!
		}[args.command];

		if (!command) return interaction.reply(Messages.COMMAND.OPTION_NOT_FOUND);
		return this.handler.continue(interaction, command);
	}
}
