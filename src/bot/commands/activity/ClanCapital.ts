import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class CapitalCommand extends Command {
	public constructor() {
		super('capital', {
			category: 'search',
			channel: 'guild',
			description: {
				content: ['Shows clan capital contribution and raids.']
			},
			defer: false,
			root: true
		});
	}

	public exec(interaction: CommandInteraction<'cached'>, args: { command: string }) {
		const command = {
			contribution: this.handler.modules.get('capital-contribution')!,
			raids: this.handler.modules.get('capital-raids')!,
			week: this.handler.modules.get('capital-week')!
		}[args.command];

		if (!command) throw Error('Command not found.');
		return this.handler.continue(interaction, command);
	}
}
