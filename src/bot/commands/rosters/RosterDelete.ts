import { CommandInteraction } from 'discord.js';
import { ObjectId } from 'mongodb';
import { Command } from '../../lib/index.js';

export default class RosterDeleteCommand extends Command {
	public constructor() {
		super('roster-delete', {
			category: 'roster',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			description: {
				content: ['Delete a roster.']
			},
			defer: true,
			ephemeral: true
		});
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: {
			roster: string;
		}
	) {
		if (!ObjectId.isValid(args.roster)) return interaction.editReply({ content: 'Invalid roster ID.' });

		const rosterId = new ObjectId(args.roster);
		const roster = await this.client.rosterManager.get(rosterId);
		if (!roster) return interaction.editReply({ content: 'Roster was deleted.' });

		await this.client.rosterManager.delete(rosterId);
		return interaction.editReply({ content: 'Roster deleted successfully.' });
	}
}
