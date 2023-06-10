import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class RosterCommand extends Command {
	public constructor() {
		super('roster', {
			category: 'roster',
			channel: 'guild',
			description: {
				content: ['Create, delete, edit or view rosters.']
			}
		});
	}

	public exec(interaction: CommandInteraction, args: { command: string; subCommand: string }) {
		const command = {
			create: this.handler.modules.get('roster-create')!,
			delete: this.handler.modules.get('roster-delete')!,
			edit: this.handler.modules.get('roster-edit')!,
			clear: this.handler.modules.get('roster-clear')!,
			list: this.handler.modules.get('roster-list')!,
			post: this.handler.modules.get('roster-post')!,
			manage: this.handler.modules.get('roster-manage')!,
			groups: this.handler.modules.get('roster-groups')!
		}[args.subCommand || args.command];

		if (!command) throw Error('Command not found.');
		return this.handler.continue(interaction, command);
	}
}
