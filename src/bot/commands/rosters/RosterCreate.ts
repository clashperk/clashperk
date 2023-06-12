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
			min_hero_level?: number;
			roster_role?: Role;
			allow_group_selection?: boolean;
			allow_multi_signup?: boolean;
			closing_time?: string;
			sort_by?: RosterSortTypes;
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
			roleId: args.roster_role?.id ?? null,
			closingTime: null,
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

		if (args.closing_time && moment(args.closing_time).isValid()) {
			const timezoneId = await this.client.rosterManager.getTimezoneId(interaction.user.id);
			data.closingTime = moment.tz(args.closing_time, timezoneId).utc().toDate();
			if (data.closingTime < new Date()) return interaction.editReply('Closing time cannot be in the past.');
			if (data.closingTime < moment().add(5, 'minutes').toDate()) {
				return interaction.editReply('Closing time must be at least 5 minutes from now.');
			}
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
				username: link.username,
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
