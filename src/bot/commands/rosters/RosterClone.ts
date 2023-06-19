import { CommandInteraction } from 'discord.js';
import { ObjectId } from 'mongodb';
import { Command } from '../../lib/index.js';
import { IRoster } from '../../struct/RosterManager.js';

export default class RosterCloneCommand extends Command {
	public constructor() {
		super('roster-clone', {
			category: 'roster',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			description: {
				content: ['Clone a roster from another roster.']
			},
			defer: true,
			ephemeral: true
		});
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: {
			roster: string;
			name?: string;
			with_members?: boolean;
		}
	) {
		// Create default categories
		this.client.rosterManager.createDefaultCategories(interaction.guild.id);

		if (!ObjectId.isValid(args.roster)) return interaction.followUp({ content: 'Invalid roster ID.', ephemeral: true });
		const rosterId = new ObjectId(args.roster);
		const roster = await this.client.rosterManager.get(rosterId);
		if (!roster) return interaction.followUp({ content: 'Roster was deleted.', ephemeral: true });

		if (args.with_members && !roster.allowMultiSignup && roster.members.length > 0) {
			return interaction.followUp({ content: 'Cannot clone roster with members when multi-signup is disabled.', ephemeral: true });
		}

		if (roster.members.length > 0 && args.with_members) {
			const dup = await this.client.rosterManager.rosters.findOne(
				{
					'_id': { $ne: roster._id },
					'closed': false,
					'allowMultiSignup': false,
					'guildId': interaction.guild.id,
					'members.tag': { $in: roster.members.map((mem) => mem.tag) }
				},
				{ projection: { _id: 1 } }
			);

			if (dup)
				return interaction.editReply(
					`This roster has multiple members signed up for another roster ${dup.name} - ${dup.clan.name} (${dup.clan.tag}).`
				);
		}

		const data: IRoster = {
			name: args.name ?? `${roster.name} [CLONE]`,
			clan: roster.clan,
			guildId: interaction.guild.id,
			closed: false,
			members: args.with_members ? roster.members : [],
			allowMultiSignup: roster.allowMultiSignup,
			allowCategorySelection: roster.allowCategorySelection,
			maxMembers: roster.maxMembers,
			sortBy: roster.sortBy,
			layout: roster.layout,
			minHeroLevels: roster.minHeroLevels,
			minTownHall: roster.minTownHall,
			maxTownHall: roster.maxTownHall,
			roleId: null,
			startTime: null,
			endTime: null,
			lastUpdated: new Date(),
			createdAt: new Date()
		};

		const newRoster = await this.client.rosterManager.create(data);
		const embed = this.client.rosterManager.getRosterInfoEmbed(newRoster);
		return interaction.editReply({ embeds: [embed] });
	}
}
