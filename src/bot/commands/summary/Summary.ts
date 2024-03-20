import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class SummaryCommand extends Command {
	public constructor() {
		super('summary', {
			aliases: ['family'],
			category: 'summary',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			description: {
				content: ['Summary commands of clan families.']
			},
			root: true,
			defer: false
		});
	}

	public exec(interaction: CommandInteraction, args: { command: string; option: string }) {
		const commandMap: Record<string, Command | null> = {
			'compo': this.handler.modules.get('summary-compo')!,
			'wars': this.handler.modules.get('summary-wars')!,
			'clans': this.handler.modules.get('summary-clans')!,
			'trophies': this.handler.modules.get('summary-trophies')!,
			'donations': this.handler.modules.get('summary-donations')!,
			'clan-games': this.handler.modules.get('summary-clan-games')!,
			'attacks': this.handler.modules.get('summary-attacks')!,
			'missed-wars': this.handler.modules.get('summary-missed-wars')!,
			'activity': this.handler.modules.get('summary-activity')!,
			'capital-contribution': this.handler.modules.get('summary-capital-contribution')!,
			'capital-raids': this.handler.modules.get('summary-capital-raids')!,
			'war-results': this.handler.modules.get('summary-war-results')!,
			'best': this.handler.modules.get('summary-best')!,
			'cwl-ranks': this.handler.modules.get('summary-cwl-ranks')!,
			'leagues': this.handler.modules.get('summary-leagues')!
		};
		const command = commandMap[args.command] || commandMap[args.option]; // eslint-disable-line

		if (!command) throw Error('Command not found.');
		return this.handler.continue(interaction, command);
	}
}
