import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class LegendCommand extends Command {
	public constructor() {
		super('legend', {
			category: 'search',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			description: {
				content: ['Legend season overview and summary.']
			}
		});
	}

	public exec(interaction: CommandInteraction, args: { command: string }) {
		const command = {
			attacks: this.handler.modules.get('legend-attacks')!,
			days: this.handler.modules.get('legend-days')!,
			graph: this.handler.modules.get('legend-graph')!
		}[args.command];

		if (!command) throw Error('Command not found.');
		return this.handler.continue(interaction, command);
	}
}
