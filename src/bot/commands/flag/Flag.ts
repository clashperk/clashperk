import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class FlagCommand extends Command {
	public constructor() {
		super('flag', {
			category: 'link',
			channel: 'guild',
			description: {
				content: [
					'Manage player flags in a server or clan.',
					'',
					'This is a feature to mark players as banned or flagged and get notified whenever they join back to the clan or clan family.',
					'',
					"To receive notification you must setup **Clan Feed** with a mentionable role. Flags are per server basis. It doesn't travel among Discord servers and not accessible from other servers."
				]
			},
			root: true,
			defer: false
		});
	}

	public exec(interaction: CommandInteraction, args: { commandName: string }) {
		const command = this.handler.modules.get(args.commandName);
		if (!command) throw Error(`Command "${args.commandName}" not found.`);
		return this.handler.continue(interaction, command);
	}
}
