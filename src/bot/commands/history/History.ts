import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class HistoryCommand extends Command {
	public constructor() {
		super('history', {
			category: 'summary',
			channel: 'guild',
			clientPermissions: ['EmbedLinks']
		});
	}

	public exec(interaction: CommandInteraction, args: { option: string }) {
		const command = {
			'cwl-attacks': this.handler.modules.get('cwl-attacks-history')!,
			'capital-raids': this.handler.modules.get('capital-raids-history')!,
			'clan-games': this.handler.modules.get('clan-games-history')!,
			'join-leave': this.handler.modules.get('join-leave-history')!
		}[args.option];

		if (!command) throw Error('Command not found.');
		return this.handler.continue(interaction, command);
	}
}
