import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class RosterCommand extends Command {
	public constructor() {
		super('roster', {
			category: 'roster',
			channel: 'guild',
			description: {
				content: ['Create, delete, edit or view rosters.']
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
