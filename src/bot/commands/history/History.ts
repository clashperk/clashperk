import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class HistoryCommand extends Command {
	public constructor() {
		super('history', {
			category: 'summary',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: false
		});
	}

	public exec(interaction: CommandInteraction, args: { option: string }) {
		const command = {
			'cwl-attacks': this.handler.modules.get('cwl-attacks-history')!,
			'war-attacks': this.handler.modules.get('war-attacks-history')!,
			'capital-raids': this.handler.modules.get('capital-raids-history')!,
			'capital-contribution': this.handler.modules.get('capital-contribution-history')!,
			'clan-games': this.handler.modules.get('clan-games-history')!,
			'join-leave': this.handler.modules.get('join-leave-history')!,
			'donations': this.handler.modules.get('donations-history')!,
			'eos-trophies': this.handler.modules.get('eos-trophies-history')!,
			'attacks': this.handler.modules.get('attacks-history')!,
			'loot': this.handler.modules.get('loot-history')!,
			'legend-attacks': this.handler.modules.get('history-legend-attacks')!
		}[args.option];

		if (!command) throw Error('Command not found.');
		return this.handler.continue(interaction, command);
	}
}
