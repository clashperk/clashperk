import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class CWLHistoryCommand extends Command {
	public constructor() {
		super('cwl-history', {
			category: 'none',
			channel: 'guild',
			clientPermissions: [],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>) {
		return interaction.editReply(`This command has been replaced with the ${this.client.getCommand('/history')} command.`);
	}
}
