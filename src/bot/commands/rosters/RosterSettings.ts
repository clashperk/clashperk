import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, StringSelectMenuBuilder } from 'discord.js';
import { ObjectId } from 'mongodb';
import { Command } from '../../lib/index.js';

export default class RosterEditCommand extends Command {
	public constructor() {
		super('roster-settings', {
			category: 'roster',
			channel: 'guild',
			description: {
				content: ['Create, delete, edit or view rosters.']
			},
			userPermissions: ['ManageGuild'],
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
		if (!ObjectId.isValid(args.roster)) {
			return interaction.followUp({ content: 'Invalid roster ID.', ephemeral: true });
		}

		const rosterId = new ObjectId(args.roster);
		const roster = await this.client.rosterManager.get(rosterId);
		if (!roster) return interaction.followUp({ content: 'Roster was deleted.', ephemeral: true });

		const customIds = {
			select: this.client.uuid(interaction.user.id)
		};

		const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder()
				.setMinValues(1)
				.setPlaceholder('Select an option!')
				.setCustomId(customIds.select)
				.setOptions([
					{
						label: 'Close Roster',
						description: 'Prevent new signups',
						value: 'close'
					},
					{
						label: 'Clear Roster',
						description: 'Remove all members',
						value: 'clear'
					},
					{
						label: 'Roster Info',
						description: 'View roster info',
						value: 'info'
					}
				])
		);

		const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setLabel('Manage Roster').setStyle(ButtonStyle.Link).setURL('https://google.com')
		);

		return interaction.followUp({ components: [menuRow, buttonRow], ephemeral: true });
	}
}
