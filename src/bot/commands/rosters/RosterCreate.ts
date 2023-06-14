import { Clan } from 'clashofclans.js';
import { CommandInteraction, Role } from 'discord.js';
import moment from 'moment-timezone';
import { Command } from '../../lib/index.js';
import { IRoster, IRosterMember, RosterSortTypes } from '../../struct/RosterManager.js';
import { PlayerLinks } from '../../types/index.js';
import { Collections } from '../../util/Constants.js';

export default class RosterCreateCommand extends Command {
	public constructor() {
		super('roster-create', {
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
			name: string;
			clan: string;
			import_members?: boolean;
			max_members?: number;
			min_town_hall?: number;
			max_town_hall?: number;
			min_hero_level?: number;
			roster_role?: Role;
			allow_group_selection?: boolean;
			allow_multi_signup?: boolean;
			end_time?: string;
			start_time?: string;
			sort_by?: RosterSortTypes;
			timezone?: string;
		}
	) {
		// Create default categories
		this.client.rosterManager.createDefaultCategories(interaction.guild.id);

		const clan = await this.client.resolver.resolveClan(interaction, args.clan);
		if (!clan) return;

		const data: IRoster = {
			name: args.name,
			clan: {
				name: clan.name,
				tag: clan.tag,
				badgeUrl: clan.badgeUrls.large
			},
			guildId: interaction.guild.id,
			closed: false,
			members: args.import_members ? await this.getClanMembers(clan) : [],
			allowMultiSignup: Boolean(args.allow_multi_signup ?? false),
			allowCategorySelection: args.allow_group_selection ?? true,
			maxMembers: args.max_members,
			sortBy: args.sort_by,
			minHeroLevels: args.min_hero_level,
			minTownHall: args.min_town_hall,
			maxTownHall: args.max_town_hall,
			roleId: args.roster_role?.id ?? null,
			startTime: null,
			endTime: null,
			lastUpdated: new Date(),
			createdAt: new Date()
		};

		if (args.roster_role) {
			const dup = await this.client.rosterManager.rosters.findOne(
				{ roleId: args.roster_role.id, closed: false },
				{ projection: { _id: 1 } }
			);
			if (dup) return interaction.editReply({ content: 'A roster with this role already exists.' });
		}

		if (args.start_time && moment(args.start_time).isValid()) {
			const timezone = await this.client.rosterManager.getTimezoneOffset(interaction, args.timezone);
			data.startTime = moment.tz(args.start_time, timezone.id).utc().toDate();
			if (data.startTime < new Date()) return interaction.editReply('Start time cannot be in the past.');
			if (data.startTime < moment().add(5, 'minutes').toDate()) {
				return interaction.editReply('Start time must be at least 5 minutes from now.');
			}
		}

		if (args.end_time && moment(args.end_time).isValid()) {
			const timezone = await this.client.rosterManager.getTimezoneOffset(interaction, args.timezone);
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

		const roster = await this.client.rosterManager.create(data);

		const embed = this.client.rosterManager.getRosterInfoEmbed(roster);
		return interaction.editReply({ embeds: [embed] });
	}

	private async getClanMembers(clan: Clan) {
		const links = await this.client.db
			.collection<PlayerLinks>(Collections.PLAYER_LINKS)
			.find({ tag: { $in: clan.memberList.map((mem) => mem.tag) } })
			.toArray();
		const players = await Promise.all(links.map((mem) => this.client.http.player(mem.tag)));

		const members: IRosterMember[] = [];
		links.forEach((link, i) => {
			const player = players[i];
			if (!player.ok) return;

			const heroes = player.heroes.filter((hero) => hero.village === 'home');
			members.push({
				tag: player.tag,
				name: player.name,
				username: link.displayName,
				townHallLevel: player.townHallLevel,
				userId: link.userId,
				heroes: heroes.reduce((prev, curr) => ({ ...prev, [curr.name]: curr.level }), {}),
				clan: player.clan ? { tag: player.clan.tag, name: player.clan.name } : null,
				createdAt: new Date()
			});
		});

		return members;
	}
}
