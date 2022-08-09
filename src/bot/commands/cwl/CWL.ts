import { CommandInteraction } from 'discord.js';
import { Args, Command } from '../../lib/index.js';

export default class CWLCommand extends Command {
	public constructor() {
		super('cwl', {
			category: 'war',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: ['CWL season overview and summary.']
			}
		});
	}

	public args(): Args {
		return {
			option: {
				id: 'command',
				match: 'STRING'
			}
		};
	}

	public exec(interaction: CommandInteraction, args: { command: string }) {
		const command = {
			round: this.handler.modules.get('cwl-round')!,
			stats: this.handler.modules.get('cwl-stats')!,
			lineup: this.handler.modules.get('cwl-lineup')!,
			export: this.handler.modules.get('cwl-export')!,
			roster: this.handler.modules.get('cwl-roster')!,
			attacks: this.handler.modules.get('cwl-attacks')!,
			stars: this.handler.modules.get('cwl-stars')!,
			members: this.handler.modules.get('cwl-members')!
		}[args.command];

		return this.handler.exec(interaction, command ?? this.handler.modules.get('cwl-roster')!, args);
	}
}
