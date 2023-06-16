import { Player } from 'clashofclans.js';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	CommandInteraction,
	EmbedBuilder,
	Guild,
	PermissionFlagsBits,
	StringSelectMenuInteraction,
	User,
	time
} from 'discord.js';
import { Collection, ObjectId, WithId } from 'mongodb';
import { UserInfoModel } from '../types/index.js';
import { Collections, MAX_TOWN_HALL_LEVEL } from '../util/Constants.js';
import { EMOJIS, TOWN_HALLS } from '../util/Emojis.js';
import { Util } from '../util/index.js';
import Client from './Client.js';
import Google from './Google.js';

export type RosterSortTypes =
	| 'PLAYER_NAME'
	| 'DISCORD_USERNAME'
	| 'HERO_LEVEL'
	| 'TOWN_HALL_LEVEL'
	| 'TH_HERO_LEVEL'
	| 'CLAN_NAME'
	| 'SIGNUP_TIME';

export interface IRoster {
	name: string;
	guildId: string;
	allowMultiSignup?: boolean;
	maxMembers?: number;
	minTownHall?: number;
	maxTownHall?: number;
	minHeroLevels?: number;
	roleId?: string | null;
	clan: {
		tag: string;
		name: string;
		badgeUrl: string;
	};
	members: IRosterMember[];
	layout?: string;
	sheetId?: string;
	closed: boolean;
	startTime?: Date | null;
	endTime?: Date | null;
	sortBy?: RosterSortTypes;
	allowCategorySelection?: boolean;
	lastUpdated: Date;
	createdAt: Date;
}

export interface IRosterCategory {
	displayName: string;
	name: string;
	guildId: string;
	selectable: boolean;
	roleId?: string | null;
	createdAt: Date;
}

export interface IRosterMember {
	name: string;
	tag: string;
	userId: string | null;
	username: string | null;
	townHallLevel: number;
	heroes: Record<string, number>;
	clan?: {
		tag: string;
		name: string;
	} | null;
	categoryId?: ObjectId | null;
	createdAt: Date;
}

export class RosterManager {
	public rosters: Collection<IRoster>;
	public categories: Collection<IRosterCategory>;
	private readonly queued: Set<string> = new Set();

	public constructor(private readonly client: Client) {
		this.rosters = this.client.db.collection<IRoster>(Collections.ROSTERS);
		this.categories = this.client.db.collection<IRosterCategory>(Collections.ROSTER_CATEGORIES);
	}

	public async create(roster: IRoster) {
		const { insertedId } = await this.rosters.insertOne(roster);
		return { ...roster, _id: insertedId };
	}

	public async edit(rosterId: ObjectId, data: Partial<IRoster>) {
		const { value } = await this.rosters.findOneAndUpdate({ _id: rosterId }, { $set: data }, { returnDocument: 'after' });
		return value;
	}

	public async delete(rosterId: ObjectId) {
		return this.rosters.deleteOne({ _id: rosterId });
	}

	public async list(guildId: string, withMembers = false) {
		const cursor = this.rosters.aggregate<WithId<IRoster> & { memberCount: number }>([
			{ $match: { guildId } },
			{ $set: { memberCount: { $size: '$members' } } },
			...(withMembers ? [] : [{ $set: { members: [] } }]),
			{ $sort: { _id: -1 } }
		]);

		return cursor.toArray();
	}

	public async search(guildId: string, query: string) {
		const cursor = this.rosters.aggregate<WithId<Omit<IRoster, 'members'>> & { memberCount: number }>([
			{ $match: { guildId, $text: { $search: query } } },
			{ $set: { memberCount: { $size: '$members' } } },
			{ $project: { members: 0 } },
			{ $sort: { _id: -1 } }
		]);
		return cursor.toArray();
	}

	public async clear(rosterId: ObjectId) {
		const { value } = await this.rosters.findOneAndUpdate({ _id: rosterId }, { $set: { members: [] } }, { returnDocument: 'after' });
		return value;
	}

	public async close(rosterId: ObjectId) {
		const { value } = await this.rosters.findOneAndUpdate({ _id: rosterId }, { $set: { closed: true } }, { returnDocument: 'after' });
		return value;
	}

	public async open(rosterId: ObjectId) {
		const { value } = await this.rosters.findOneAndUpdate({ _id: rosterId }, { $set: { closed: false } }, { returnDocument: 'after' });
		return value;
	}

	public async attachSheetId(rosterId: ObjectId, sheetId: string) {
		const { value } = await this.rosters.findOneAndUpdate({ _id: rosterId }, { $set: { sheetId } }, { returnDocument: 'after' });
		return value;
	}

	public async get(rosterId: ObjectId) {
		return this.rosters.findOne({ _id: rosterId });
	}

	public async signup(
		interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'> | StringSelectMenuInteraction<'cached'>,
		rosterId: ObjectId,
		player: Player,
		user: User | null,
		categoryId?: string | null,
		isDryRun = false
	) {
		const roster = await this.rosters.findOne({ _id: rosterId });
		const isOwner = interaction.user.id === user?.id;

		if (!roster) {
			await interaction.followUp({ content: 'This roster no longer exists.', ephemeral: true });
			return false;
		}

		if (roster.startTime && roster.startTime > new Date()) {
			await interaction.followUp({
				content: `This roster will open on ${time(roster.startTime)} (${time(roster.startTime, 'R')})`,
				ephemeral: true
			});
			return false;
		}

		if (roster.closed) {
			await interaction.followUp({ content: 'This roster is closed.', ephemeral: true });
			return false;
		}

		if (roster.endTime && roster.endTime < new Date()) {
			await interaction.followUp({ content: 'This roster is closed.', ephemeral: true });
			return false;
		}

		if (roster.maxMembers && roster.members.length >= roster.maxMembers) {
			await interaction.followUp({ content: 'This roster is full.', ephemeral: true });
			return false;
		}

		if (roster.minTownHall && player.townHallLevel < roster.minTownHall) {
			await interaction.followUp({
				content: `This roster requires a minimum Town Hall level of ${roster.minTownHall}.`,
				ephemeral: true
			});
			return false;
		}

		if (roster.maxTownHall && player.townHallLevel > roster.maxTownHall) {
			await interaction.followUp({
				content: `This roster requires a maximum Town Hall level of ${roster.maxTownHall}.`,
				ephemeral: true
			});
			return false;
		}

		const heroes = player.heroes.filter((hero) => hero.village === 'home');
		const sumOfHeroLevels = heroes.reduce((prev, curr) => prev + curr.level, 0);
		if (roster.minHeroLevels && sumOfHeroLevels < roster.minHeroLevels) {
			await interaction.followUp({
				content: `This roster requires a minimum combined hero level of ${roster.minHeroLevels}.`,
				ephemeral: true
			});
			return false;
		}

		if (roster.members.some((m) => m.tag === player.tag)) {
			await interaction.followUp({
				content: isOwner ? 'You are already signed up for this roster.' : 'This player is already signed up for this roster.',
				ephemeral: true
			});
			return false;
		}

		if (!roster.allowMultiSignup && !isDryRun) {
			const dup = await this.rosters.findOne(
				{ '_id': { $ne: rosterId }, 'closed': false, 'guildId': interaction.guild.id, 'members.tag': player.tag },
				{ projection: { _id: 1 } }
			);
			if (dup) {
				await interaction.followUp({
					content: isOwner
						? 'You are already signed up for another roster.'
						: 'This player is already signed up for another roster.',
					ephemeral: true
				});
				return false;
			}
		}

		if (roster.allowMultiSignup && !isDryRun) {
			const dup = await this.rosters.findOne(
				{
					'_id': { $ne: rosterId },
					'closed': false,
					'guildId': interaction.guild.id,
					'members.tag': player.tag,
					'allowMultiSignup': false
				},
				{ projection: { _id: 1 } }
			);
			if (dup && !dup.allowMultiSignup) {
				await interaction.followUp({
					content: isOwner
						? 'You are already signed up for another roster that does not allow multi-signup.'
						: 'This player is already signed up for another roster that does not allow multi-signup.',
					ephemeral: true
				});
				return false;
			}
		}

		if (isDryRun) return roster; // DRY RUN BABY

		const category = categoryId ? await this.getCategory(new ObjectId(categoryId)) : null;
		const member: IRosterMember = {
			name: player.name,
			tag: player.tag,
			userId: user?.id ?? null,
			username: user?.displayName ?? null,
			heroes: heroes.reduce((prev, curr) => ({ ...prev, [curr.name]: curr.level }), {}),
			townHallLevel: player.townHallLevel,
			clan: player.clan ? { name: player.clan.name, tag: player.clan.tag } : null,
			categoryId: category ? category._id : null,
			createdAt: new Date()
		};

		const { value } = await this.rosters.findOneAndUpdate(
			{ _id: rosterId },
			{ $push: { members: { ...member } } },
			{ returnDocument: 'after' }
		);

		if (!value) {
			await interaction.followUp({ content: 'This roster no longer exists.', ephemeral: true });
			return false;
		}
		if (!user) return value;

		const roleIds: string[] = [];
		if (roster.roleId) roleIds.push(roster.roleId);
		if (category?.roleId) roleIds.push(category.roleId);

		if (roleIds.length) this.addRole(value.guildId, roleIds, user.id);
		return value;
	}

	public async optOut(rosterId: ObjectId, tag: string) {
		const roster = await this.get(rosterId);
		if (!roster) return null;

		const member = roster.members.find((mem) => mem.tag === tag);
		if (!member) return roster;
		const members = roster.members.filter((mem) => mem.userId === member.userId);

		const { value } = await this.rosters.findOneAndUpdate(
			{ _id: rosterId },
			{ $pull: { members: { tag } } },
			{ returnDocument: 'after' }
		);

		if (!value) return null;
		if (!member.userId) return value;

		const roleIds: string[] = [];
		if (value.roleId && members.length <= 1) roleIds.push(value.roleId);

		if (member.categoryId) {
			const category = await this.getCategory(member.categoryId);
			const categorizedMembers = members.filter(
				(mem) => mem.categoryId && category && mem.categoryId.toHexString() === category._id.toHexString()
			);
			if (category?.roleId && categorizedMembers.length <= 1) roleIds.push(category.roleId);
		}

		if (roleIds.length && member.userId) this.removeRole(value.guildId, roleIds, member.userId);
		return value;
	}

	public async swapRoster(
		interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'> | StringSelectMenuInteraction<'cached'>,
		rosterId: ObjectId,
		player: Player,
		user: User | null,
		newRosterId: ObjectId,
		categoryId: string | null
	) {
		const attempt = await this.signup(interaction, newRosterId, player, user, categoryId, true);
		if (!attempt) return null;

		const roster = await this.optOut(rosterId, player.tag);
		if (!roster) return null;

		return this.signup(interaction, newRosterId, player, user, categoryId);
	}

	public async swapCategory(rosterId: ObjectId, player: Player, user: User | null, newCategoryId: ObjectId | null) {
		const roster = await this.get(rosterId);
		if (!roster) return null;

		const oldCategoryId = roster.members.find((mem) => mem.tag === player.tag)?.categoryId;
		if (oldCategoryId?.toHexString() === newCategoryId?.toHexString()) return roster;

		if (oldCategoryId) {
			const category = await this.getCategory(oldCategoryId);
			if (category?.roleId && user) this.removeRole(roster.guildId, [category.roleId], user.id);
		}

		if (newCategoryId) {
			const newCategory = await this.getCategory(newCategoryId);
			if (newCategory?.roleId && user) this.addRole(roster.guildId, [newCategory.roleId], user.id);
		}

		const { value } = await this.rosters.findOneAndUpdate(
			{ '_id': rosterId, 'members.tag': player.tag },
			{ $set: { 'members.$.categoryId': newCategoryId } },
			{ returnDocument: 'after' }
		);

		return value;
	}

	public async updateMembers(roster: WithId<IRoster>, members: IRosterMember[]) {
		const players = await Promise.all(members.map((mem) => this.client.http.player(mem.tag)));

		const _categories = await this.getCategories(roster.guildId);
		const categories = _categories.reduce<Record<string, IRosterCategory>>(
			(prev, curr) => ({ ...prev, [curr._id.toHexString()]: curr }),
			{}
		);

		const rolesMap: Record<string, string[]> = {};
		members.forEach((member, i) => {
			if (member.userId) rolesMap[member.userId] ??= []; // eslint-disable-line
			if (roster.roleId && member.userId) rolesMap[member.userId].push(roster.roleId);
			if (member.categoryId && member.userId) {
				const category = categories[member.categoryId.toHexString()];
				// eslint-disable-next-line
				if (category?.roleId) rolesMap[member.userId].push(category.roleId);
			}

			const player = players[i];
			if (!player.ok) return;

			member.name = player.name;
			member.townHallLevel = player.townHallLevel;
			const heroes = player.heroes.filter((hero) => hero.village === 'home');
			member.heroes = heroes.reduce((prev, curr) => ({ ...prev, [curr.name]: curr.level }), {});
			if (player.clan) member.clan = { name: player.clan.name, tag: player.clan.tag };
			else member.clan = null;
		});

		const { value } = await this.rosters.findOneAndUpdate(
			{ _id: roster._id },
			{ $set: { members, lastUpdated: new Date() } },
			{ returnDocument: 'after' }
		);

		if (value) this.updateBulkRoles(value, rolesMap);

		return value;
	}

	public getRosterEmbed(roster: IRoster, categories: WithId<IRosterCategory>[]) {
		const categoriesMap = categories.reduce<Record<string, IRosterCategory>>(
			(prev, curr) => ({ ...prev, [curr._id.toHexString()]: curr }),
			{}
		);

		const sortKey = roster.sortBy ?? 'TH_HERO_LEVEL';
		switch (sortKey) {
			case 'TOWN_HALL_LEVEL':
				roster.members.sort((a, b) => a.townHallLevel - b.townHallLevel);
				break;
			case 'HERO_LEVEL':
				roster.members.sort((a, b) => this.sum(Object.values(a.heroes)) - this.sum(Object.values(b.heroes)));
				break;
			case 'TH_HERO_LEVEL':
				roster.members
					.sort((a, b) => this.sum(Object.values(b.heroes)) - this.sum(Object.values(a.heroes)))
					.sort((a, b) => b.townHallLevel - a.townHallLevel);
				break;
			case 'PLAYER_NAME':
				roster.members.sort((a, b) => a.name.localeCompare(b.name));
				break;
			case 'CLAN_NAME':
				roster.members.sort((a, b) => (a.clan?.name ?? '').localeCompare(b.clan?.name ?? ''));
				break;
			case 'DISCORD_USERNAME':
				roster.members.sort((a, b) => (a.username ?? '').localeCompare(b.username ?? ''));
				break;
			case 'SIGNUP_TIME':
				roster.members.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
				break;
			default:
				roster.members.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
				break;
		}

		const membersGroup = Object.entries(
			roster.members.reduce<Record<string, IRosterMember[]>>((prev, curr) => {
				const key = curr.categoryId?.toHexString();
				const categoryId = key && key in categoriesMap ? key : 'none';
				prev[categoryId] ??= []; // eslint-disable-line
				prev[categoryId].push(curr);
				return prev;
			}, {})
		);

		membersGroup.sort(([a], [b]) => {
			if (a === 'none') return 1;
			if (b === 'none') return -1;
			return categoriesMap[a].displayName.localeCompare(categoriesMap[b].displayName);
		});

		// let count = 0;
		const embed = new EmbedBuilder()
			.setTitle(roster.name)
			.setURL(this.client.http.getClanURL(roster.clan.tag))
			.setAuthor({
				name: `${roster.clan.name} (${roster.clan.tag})`,
				iconURL: roster.clan.badgeUrl,
				url: this.client.http.getClanURL(roster.clan.tag)
			});

		if (roster.layout === '#/TH_ICON/DISCORD/NAME/CLAN') {
			embed.setDescription(
				[
					`\` #\` ${EMOJIS.GAP} \`${'DISCORD'.padEnd(12, ' ')}\` \`${'NAME'.padEnd(12, ' ')}\` \`${'CLAN'.padEnd(6, ' ')}\``,
					...membersGroup.flatMap(([categoryId, members]) => [
						`${categoryId === 'none' ? '' : `\n**${categoriesMap[categoryId].displayName}**`}`,
						...members.map((mem, i) => {
							// const n = `${1 + count++}`.padStart(2, ' ');
							const n = `${1 + i}`.padStart(2, ' ');
							const ign = this.snipe(mem.name, 12);
							const discord = this.snipe(mem.username ?? ' ', 12);
							const clan = this.snipe(mem.clan?.name ?? ' ', 6);
							return `\`${n}\` ${TOWN_HALLS[mem.townHallLevel]} \`${discord}\` \`${ign}\` \`${clan}\``;
						})
					])
				].join('\n')
			);
		} else {
			embed.setDescription(
				[
					`\`TH \` \`${'DISCORD'.padEnd(12, ' ')} ${'NAME'.padEnd(12, ' ')} ${'CLAN'.padEnd(6, ' ')}\``,
					...membersGroup.flatMap(([categoryId, members]) => [
						`${categoryId === 'none' ? '' : `\n**${categoriesMap[categoryId].displayName}**`}`,
						...members.map((mem) => {
							const hall = `${mem.townHallLevel}`.padStart(2, ' ');
							const ign = this.snipe(mem.name, 12);
							const discord = this.snipe(mem.username ?? ' ', 12);
							const clan = this.snipe(mem.clan?.name ?? ' ', 6);
							return `\`${hall} \` \`${discord} ${ign} ${clan}\``;
						})
					])
				].join('\n')
			);
		}

		if (!roster.members.length) {
			embed.setDescription(
				[
					`\`TH ${'DISCORD'.padEnd(12, ' ')} ${'NAME'.padEnd(12, ' ')} ${'CLAN'.padEnd(6, ' ')}\``,
					`\`-- ${'------'.padEnd(12, ' ')} ${'----'.padEnd(12, ' ')} ${'----'.padEnd(6, ' ')}\``
				].join('\n')
			);
		}

		if (roster.startTime && roster.startTime > new Date()) {
			embed.addFields({ name: '\u200e', value: `Signup opens on ${time(roster.startTime)}` });
		} else if (roster.endTime) {
			embed.addFields({
				name: '\u200e',
				value: [
					`Total ${roster.members.length}`,
					`Signup ${this.isClosed(roster) ? '**closed**' : 'closes'} on ${time(roster.endTime)}`
				].join('\n')
			});
		} else if (roster.closed) {
			embed.addFields({ name: '\u200e', value: 'Signup is **closed**' });
		}

		return embed;
	}

	public getRosterInfoEmbed(roster: IRoster) {
		const embed = new EmbedBuilder()
			.setTitle(`${roster.name} ${this.isClosed(roster) ? '[CLOSED]' : ''}`)
			.setURL(this.client.http.getClanURL(roster.clan.tag))
			.setAuthor({
				name: `${roster.clan.name} (${roster.clan.tag})`,
				iconURL: roster.clan.badgeUrl,
				url: this.client.http.getClanURL(roster.clan.tag)
			})
			.addFields({
				name: 'Roster Size',
				inline: true,
				value: `${roster.maxMembers ?? 65} max, ${roster.members.length} signed-up`
			})
			.addFields({
				name: 'Town Hall',
				inline: true,
				value: `${roster.minTownHall ?? 2} min, ${roster.maxTownHall ?? MAX_TOWN_HALL_LEVEL} max`
			})
			.addFields({
				name: 'Hero Levels',
				inline: true,
				value: `${roster.minHeroLevels ?? 0} min (combined)`
			})
			.addFields({
				name: 'Allow Multi-Signup',
				inline: true,
				value: roster.allowMultiSignup ? 'Yes' : 'No'
			})
			.addFields({
				name: 'Roster Role',
				inline: true,
				value: roster.roleId ? `<@&${roster.roleId}>` : 'None'
			})
			.addFields({
				name: 'Start Time',
				inline: true,
				value: roster.startTime
					? `${time(roster.startTime)} ${roster.startTime > new Date() ? `(${time(roster.startTime, 'R')})` : '[STARTED]'}`
					: 'N/A'
			})
			.addFields({
				name: 'End Time',
				inline: true,
				value: roster.endTime
					? `${time(roster.endTime)} ${this.isClosed(roster) ? '[CLOSED]' : `(${time(roster.endTime, 'R')})`}`
					: 'N/A'
			})
			.addFields({
				name: 'Allow Users to Select Group',
				inline: true,
				value: roster.allowCategorySelection ? 'Yes' : 'No'
			});

		return embed;
	}

	public getRosterComponents({ roster }: { roster: WithId<IRoster> }) {
		const isClosed = this.isClosed(roster);

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(
					JSON.stringify({
						cmd: 'roster-post',
						roster: roster._id.toHexString()
					})
				)
				.setEmoji(EMOJIS.REFRESH)
				.setStyle(ButtonStyle.Secondary)
		);

		row.addComponents(
			new ButtonBuilder()
				.setCustomId(JSON.stringify({ cmd: 'roster-signup', roster: roster._id.toHexString(), signup: true }))
				.setLabel('Signup')
				.setStyle(ButtonStyle.Success)
				.setDisabled(isClosed),
			new ButtonBuilder()
				.setCustomId(JSON.stringify({ cmd: 'roster-signup', roster: roster._id.toHexString(), signup: false }))
				.setLabel('Opt-out')
				.setStyle(ButtonStyle.Danger)
				.setDisabled(isClosed)
		);

		row.addComponents(
			new ButtonBuilder()
				.setCustomId(
					JSON.stringify({
						cmd: 'roster-settings',
						roster: roster._id.toHexString()
					})
				)
				.setEmoji(EMOJIS.SETTINGS)
				.setStyle(ButtonStyle.Secondary)
		);

		return row;
	}

	public async updateBulkRoles(roster: WithId<IRoster>, rolesMap: Record<string, string[]>) {
		const rosterId = roster._id.toHexString();
		if (this.queued.has(rosterId)) return;

		this.queued.add(rosterId);
		try {
			const guild = this.client.guilds.cache.get(roster.guildId);
			if (!guild) return null;

			const entries = Object.entries(rolesMap).filter(([_, roles]) => roles.length);

			const members = await guild.members.fetch({ user: entries.map(([userId]) => userId) }).catch(() => null);
			if (!members) return null;

			for (const [userId, rolesIds] of entries) {
				const member = members.get(userId);
				if (!member) continue;

				const roles = rolesIds.filter((id) => this.hasPermission(guild, id)).filter((id) => !member.roles.cache.has(id));
				if (!roles.length) continue;

				await member.roles.add(roles);
				await Util.delay(2000);
			}
		} finally {
			this.queued.delete(rosterId);
		}
	}

	private async addRole(guildId: string, roleIds: string[], userId: string) {
		const guild = this.client.guilds.cache.get(guildId);
		if (!guild) return null;

		roleIds = roleIds.filter((id) => this.hasPermission(guild, id));
		if (!roleIds.length) return null;

		const member = await guild.members.fetch(userId).catch(() => null);
		if (!member) return null;

		roleIds = roleIds.filter((id) => member.roles.cache.has(id));
		if (!roleIds.length) return null;

		return member.roles.add(roleIds);
	}

	private async removeRole(guildId: string, roleIds: string[], userId: string) {
		const guild = this.client.guilds.cache.get(guildId);
		if (!guild) return null;

		roleIds = roleIds.filter((id) => this.hasPermission(guild, id));
		if (!roleIds.length) return null;

		const member = await guild.members.fetch(userId).catch(() => null);
		if (!member) return null;

		roleIds = roleIds.filter((id) => member.roles.cache.has(id));
		if (!roleIds.length) return null;

		return member.roles.remove(roleIds);
	}

	private hasPermission(guild: Guild, roleId: string) {
		const role = guild.roles.cache.get(roleId);
		return (
			role &&
			guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles) &&
			guild.members.me.roles.highest.position > role.position
		);
	}

	public isClosed(roster: IRoster) {
		return roster.closed || (roster.endTime ? roster.endTime < new Date() : false);
	}

	private snipe(str: string | number, len = 12) {
		return Util.escapeBackTick(`${str}`).substring(0, len).padEnd(len, ' ');
	}

	private sum(arr: number[]) {
		return arr.reduce((prev, curr) => prev + curr, 0);
	}

	public async getCategories(guildId: string) {
		return this.categories.find({ guildId }).toArray();
	}

	public async getCategory(categoryId: ObjectId) {
		return this.categories.findOne({ _id: categoryId });
	}

	public async searchCategory(guildId: string, name: string) {
		return this.categories.findOne({ guildId, name: this.formatName(name) });
	}

	public async createCategory(category: IRosterCategory) {
		category.name = this.formatName(category.name);
		const { insertedId } = await this.categories.insertOne(category);
		return { ...category, _id: insertedId };
	}

	private formatName(name: string) {
		return name.toLowerCase().trim().replace(/\s+/g, '_');
	}

	public async deleteCategory(categoryId: ObjectId) {
		return this.categories.deleteOne({ _id: categoryId });
	}

	public async createDefaultCategories(guildId: string) {
		const categories = await this.getCategories(guildId);
		if (categories.length) return null;

		const defaultCategories: IRosterCategory[] = [
			{
				displayName: 'Confirmed',
				name: 'confirmed',
				guildId,
				selectable: true,
				roleId: null,
				createdAt: new Date()
			},
			{
				displayName: 'Substitute',
				name: 'substitute',
				guildId,
				selectable: true,
				roleId: null,
				createdAt: new Date()
			}
		];

		return this.categories.insertMany(defaultCategories);
	}

	public async closeRosters(guildId: string) {
		return this.rosters.updateMany(
			{
				guildId,
				$and: [
					{
						endTime: { $ne: null }
					},
					{
						endTime: { $lt: new Date() }
					}
				]
			},
			{
				$set: { closed: true }
			}
		);
	}

	public async editCategory(categoryId: ObjectId, data: Partial<IRosterCategory>) {
		const { value } = await this.categories.findOneAndUpdate({ _id: categoryId }, { $set: data }, { returnDocument: 'after' });
		return value;
	}

	public async getTimezoneOffset(interaction: CommandInteraction<'cached'>, location?: string) {
		const user = await this.client.db.collection<UserInfoModel>(Collections.USERS).findOne({ userId: interaction.user.id });
		if (!location) {
			if (!user?.timezone) return { id: 'UTC', name: 'Coordinated Universal Time' };
			return { id: user.timezone.id, name: user.timezone.name };
		}

		const raw = await Google.timezone(location);
		if (!raw) return { id: 'UTC', name: 'Coordinated Universal Time' };

		const offset = Number(raw.timezone.rawOffset) + Number(raw.timezone.dstOffset);
		if (!user?.timezone) {
			await this.client.db.collection<UserInfoModel>(Collections.USERS).updateOne(
				{ userId: interaction.user.id },
				{
					$set: {
						username: interaction.user.username,
						displayName: interaction.user.displayName,
						discriminator: interaction.user.discriminator,
						timezone: {
							id: raw.timezone.timeZoneId,
							offset: Number(offset),
							name: raw.timezone.timeZoneName,
							location: raw.location.formatted_address
						}
					},
					$setOnInsert: { createdAt: new Date() }
				},
				{ upsert: true }
			);
		}

		return { id: raw.timezone.timeZoneId, name: raw.timezone.timeZoneName };
	}
}
