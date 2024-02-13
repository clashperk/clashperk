import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class FlagSearchCommand extends Command {
	public constructor() {
		super('flag-search', {
			category: 'none',
			channel: 'guild',
			userPermissions: ['ManageGuild']
		});
	}

	public exec(interaction: CommandInteraction<'cached'>) {
		const command = this.client.commandsMap.commands.get('/flag list');
		return interaction.reply({
			content: `This command has been deleted and replaced with ${command} command.`,
			ephemeral: true
		});
	}
}
