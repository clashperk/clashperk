import { CommandInteraction } from 'discord.js';
import { ObjectId } from 'mongodb';
import { Command } from '../../lib/index.js';
import { IRoster } from '../../struct/RosterManager.js';
import { Settings } from '../../util/Constants.js';

export default class RosterCloneCommand extends Command {
	public constructor() {
		super('roster-clone', {
			category: 'roster',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			roleKey: Settings.ROSTER_MANAGER_ROLE,
			defer: true,
			ephemeral: true
		});
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: {
			roster: string;
			name?: string;
		}
	) {
		// Create default categories
		this.client.rosterManager.createDefaultGroups(interaction.guild.id);

		if (!ObjectId.isValid(args.roster)) return interaction.followUp({ content: 'Invalid roster ID.', ephemeral: true });
		const rosterId = new ObjectId(args.roster);
		const roster = await this.client.rosterManager.get(rosterId);
		if (!roster) return interaction.followUp({ content: 'Roster was deleted.', ephemeral: true });

		const data: IRoster = {
			name: args.name ?? `${roster.name} [CLONE]`,
			clan: roster.clan,
			guildId: interaction.guild.id,
			closed: false,
			members: [],
			category: roster.category,
			allowMultiSignup: roster.allowMultiSignup,
			allowCategorySelection: roster.allowCategorySelection,
			allowUnlinked: roster.allowUnlinked,
			maxMembers: roster.maxMembers,
			sortBy: roster.sortBy,
			layout: roster.layout,
			minHeroLevels: roster.minHeroLevels,
			minTownHall: roster.minTownHall,
			maxTownHall: roster.maxTownHall,
			roleId: null,
			startTime: null,
			endTime: null,
			useClanAlias: roster.useClanAlias,
			lastUpdated: new Date(),
			createdAt: new Date()
		};

		if (roster.endTime && roster.endTime > new Date()) data.endTime = roster.endTime;
		if (roster.startTime) data.startTime = roster.startTime;

		const newRoster = await this.client.rosterManager.create(data);

		if (roster.members.length) {
			this.client.rosterManager.importMembers(newRoster, roster.members);
		}

		const embed = this.client.rosterManager.getRosterInfoEmbed(newRoster);
		return interaction.editReply({ embeds: [embed] });
	}
}
