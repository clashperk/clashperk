import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class CategoryCommand extends Command {
	public constructor() {
		super('category', {
			category: 'setup',
			channel: 'guild',
			defer: false
		});
	}

	public exec(interaction: CommandInteraction<'cached'>, args: { command: string }) {
		const command = {
			list: this.handler.modules.get('category-list')!,
			create: this.handler.modules.get('category-create')!,
			edit: this.handler.modules.get('category-edit')!,
			delete: this.handler.modules.get('category-delete')!
		}[args.command];

		if (!command) throw Error('Command not found.');
		return this.handler.continue(interaction, command);
	}
}
