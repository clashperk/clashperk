import { CommandInteraction, Role } from 'discord.js';
import { Clan } from 'clashofclans.js';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
import { PlayerLinks } from '../../types/index.js';
import { IRosterMember } from '../../struct/RosterManager.js';

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
			allow_category_selection?: boolean;
			allow_multi_signup?: boolean;
		}
	) {
		const clan = await this.client.resolver.resolveClan(interaction, args.clan);
		if (!clan) return;

		// Create default categories
		this.client.rosterManager.createDefaultCategories(interaction.guild.id);

		const roster = await this.client.rosterManager.create({
			name: args.name,
			clan: {
				name: clan.name,
				tag: clan.tag,
				badgeUrl: clan.badgeUrls.large
			},
			guildId: interaction.guild.id,
			closed: false,
			createdAt: new Date(),
			lastUpdated: new Date(),
			members: args.import_members ? await this.getClanMembers(clan) : [],
			allowMultiSignup: args.allow_multi_signup,
			allowCategorySelection: args.allow_category_selection,
			maxMembers: args.max_members,
			minHeroLevels: args.min_hero_level,
			minTownHall: args.min_town_hall,
			roleId: args.roster_role?.id
		});

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
