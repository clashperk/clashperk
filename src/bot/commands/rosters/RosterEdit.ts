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
			max_town_hall?: number;
			min_hero_level?: number;
			roster_role?: Role;
			delete_role?: boolean;
			allow_multi_signup?: boolean;
			allow_group_selection?: boolean;
			end_time?: string;
			start_time?: string;
			timezone?: string;
			layout?: string;
			sort_by?: RosterSortTypes;
			clear_members?: boolean;
			delete_roster?: boolean;
		}
	) {
		if (!ObjectId.isValid(args.roster)) return interaction.followUp({ content: 'Invalid roster ID.', ephemeral: true });

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
		if (args.max_town_hall) data.maxTownHall = args.max_town_hall;
		if (args.min_hero_level) data.minHeroLevels = args.min_hero_level;
		if (args.roster_role) data.roleId = args.roster_role.id;
		if (args.delete_role) data.roleId = null;
		if (typeof args.allow_multi_signup === 'boolean') data.allowMultiSignup = args.allow_multi_signup;
		if (typeof args.allow_group_selection === 'boolean') data.allowCategorySelection = args.allow_group_selection;
		if (args.clear_members) data.members = [];
		if (args.sort_by) data.sortBy = args.sort_by;
		if (args.layout) data.layout = args.layout;

		if (
			typeof args.allow_multi_signup === 'boolean' &&
			!args.allow_multi_signup &&
			roster.allowMultiSignup &&
			roster.members.length > 1
		) {
			const dup = await this.client.rosterManager.rosters.findOne(
				{
					'_id': { $ne: roster._id },
					'closed': false,
					'members.tag': { $in: roster.members.map((mem) => mem.tag) }
				},
				{ projection: { _id: 1 } }
			);

			if (dup)
				return interaction.editReply(
					'This roster has multiple members signed up for another roster. Please remove them before disabling multi-signup.'
				);
		}

		const timezone = await this.client.rosterManager.getTimezoneOffset(interaction, args.timezone);

		if (args.start_time && moment(args.start_time).isValid()) {
			data.startTime = moment.tz(args.start_time, timezone.id).utc().toDate();
			if (data.startTime < new Date()) return interaction.editReply('Start time cannot be in the past.');
			if (data.startTime < moment().add(5, 'minutes').toDate()) {
				return interaction.editReply('Start time must be at least 5 minutes from now.');
			}
		}

		if (args.end_time && moment(args.end_time).isValid()) {
			data.endTime = moment.tz(args.end_time, timezone.id).utc().toDate();
			if (data.endTime < new Date()) return interaction.editReply('End time cannot be in the past.');
			if (data.endTime < moment().add(5, 'minutes').toDate()) {
				return interaction.editReply('End time must be at least 5 minutes from now.');
			}
		}

		if (data.endTime && data.startTime) {
			if (data.endTime < data.startTime) return interaction.editReply('End time cannot be before start time.');
			if (data.endTime.getTime() - data.startTime.getTime() < 600000)
				return interaction.editReply('Roster must be at least 10 minutes long.');
		}

		const updated = await this.client.rosterManager.edit(rosterId, data);
		if (!updated) return interaction.followUp({ content: 'This roster no longer exists!', ephemeral: true });

		const embed = this.client.rosterManager.getRosterInfoEmbed(updated);
		return interaction.editReply({ embeds: [embed] });
	}
}
