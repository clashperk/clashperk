import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class AliasCommand extends Command {
	public constructor() {
		super('alias', {
			category: 'setup',
			channel: 'guild',
			defer: false
		});
	}

	public exec(interaction: CommandInteraction<'cached'>, args: { command: string }) {
		const command = {
			list: this.handler.modules.get('alias-list')!,
			create: this.handler.modules.get('alias-create')!,
			delete: this.handler.modules.get('alias-delete')!
		}[args.command];

		if (!command) throw Error('Command not found.');
		return this.handler.continue(interaction, command);
	}
}
