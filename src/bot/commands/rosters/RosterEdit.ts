import { CommandInteraction, Role } from 'discord.js';
import moment from 'moment-timezone';
import { ObjectId } from 'mongodb';
import { Command } from '../../lib/index.js';
import { IRoster, RosterSortTypes } from '../../struct/RosterManager.js';

export default class RosterEditCommand extends Command {
	public constructor() {
		super('roster-edit', {
			category: 'roster',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			description: {
				content: ['Create, delete, edit or view rosters.']
			},
			defer: true,
			ephemeral: true
		});
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: {
			roster: string;
			clan?: string;
			name?: string;
			max_members?: number;
			min_town_hall?: number;
			min_hero_level?: number;
			roster_role?: Role;
			delete_role?: boolean;
			allow_multi_signup?: boolean;
			allow_group_selection?: boolean;
			closing_time?: string;
			sort_by?: RosterSortTypes;
			clear_members?: boolean;
			delete_roster?: boolean;
		}
	) {
		if (!ObjectId.isValid(args.roster)) {
			return interaction.followUp({ content: 'Invalid roster ID.', ephemeral: true });
		}

		const rosterId = new ObjectId(args.roster);
		const roster = await this.client.rosterManager.get(rosterId);
		if (!roster) return interaction.followUp({ content: 'Roster was deleted.', ephemeral: true });

		if (args.delete_roster) {
			await this.client.rosterManager.delete(rosterId);
			return interaction.followUp({ content: 'Roster deleted successfully.', ephemeral: true });
		}

		const clan = args.clan ? await this.client.resolver.resolveClan(interaction, args.clan) : null;
		if (args.clan && !clan) return;

		if (args.roster_role) {
			const dup = await this.client.rosterManager.rosters.findOne({ _id: { $ne: roster._id }, roleId: args.roster_role.id });
			if (dup) return interaction.editReply({ content: 'A roster with this role already exists.' });
		}

		const data: Partial<IRoster> = {};

		if (args.clan && clan) data.clan = { tag: clan.tag, name: clan.name, badgeUrl: clan.badgeUrls.large };
		if (args.name) data.name = args.name;
		if (args.max_members) data.maxMembers = args.max_members;
		if (args.min_town_hall) data.minTownHall = args.min_town_hall;
		if (args.min_hero_level) data.minHeroLevels = args.min_hero_level;
		if (args.roster_role) data.roleId = args.roster_role.id;
		if (args.delete_role) data.roleId = null;
		if (args.allow_multi_signup) data.allowMultiSignup = args.allow_multi_signup;
		if (args.allow_group_selection) data.allowCategorySelection = args.allow_group_selection;
		if (args.clear_members) data.members = [];
		if (args.sort_by) data.sortBy = args.sort_by;

		if (moment(args.closing_time).isValid()) {
			const timezoneId = await this.client.rosterManager.getTimezoneId(interaction.user.id);
			data.closingTime = moment.tz(args.closing_time, timezoneId).utc().toDate();
			if (data.closingTime < new Date()) return interaction.editReply('Closing time cannot be in the past.');
			if (data.closingTime < moment().add(5, 'minutes').toDate()) {
				return interaction.editReply('Closing time must be at least 5 minutes from now.');
			}
		}

		const updated = await this.client.rosterManager.edit(rosterId, data);
		if (!updated) return interaction.followUp({ content: 'This roster no longer exists!', ephemeral: true });

		const embed = this.client.rosterManager.getRosterInfoEmbed(updated);
		return interaction.editReply({ embeds: [embed] });
	}
}
