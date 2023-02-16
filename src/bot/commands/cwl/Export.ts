import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class CWLExportCommand extends Command {
	public constructor() {
		super('cwl-export', {
			category: 'none',
			channel: 'guild',
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>) {
		return interaction.editReply('This command has been deleted. Use </export cwl:813041692188999705> instead.');
	}
}
