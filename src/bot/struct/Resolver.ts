import { Guild, User, CommandInteraction, BaseInteraction } from 'discord.js';
import { Player, Clan } from 'clashofclans.js';
import { Collections, ElasticIndex, Settings, status } from '../util/Constants.js';
import { PlayerLinks, UserInfoModel } from '../types/index.js';
import { i18n } from '../util/i18n.js';
import Client from './Client.js';

export default class Resolver {
	private readonly client: Client;

	public constructor(client: Client) {
		this.client = client;
	}

	public async resolvePlayer(interaction: BaseInteraction<'cached'>, args?: string): Promise<(Player & { user?: User }) | null> {
		args = (args?.replace(/[\u200e|\u200f|\u200b|\u2002|\)|\()]+/g, '') ?? '').trim();
		const parsed = await this.parseArgument(interaction, args);

		if (parsed.isTag) return this.getPlayer(interaction, args);
		if (!parsed.user) {
			return this.fail(interaction, `**${status(404, interaction.locale)}**`);
		}

		const { user } = parsed;
		const otherTags: string[] = [];
		const link = await this.client.db
			.collection<PlayerLinks>(Collections.PLAYER_LINKS)
			.findOne({ userId: user.id }, { sort: { order: 1 } });
		if (link && (link.username !== user.username || link.discriminator !== user.discriminator || link.displayName !== user.displayName))
			this.updateUserData(interaction.guild, user.id);

		if (!link) {
			otherTags.push(...(await this.client.http.getPlayerTags(user.id)));
		}

		const tags = [...(link ? [link.tag] : []), ...otherTags];

		if (tags.length) return this.getPlayer(interaction, tags[0], user);
		if (interaction.user.id === user.id) {
			return this.fail(
				interaction,
				i18n('common.no_player_tag', { lng: interaction.locale, command: this.client.commands.LINK_CREATE })
			);
		}

		return this.fail(
			interaction,
			i18n('common.player_not_linked', {
				lng: interaction.locale,
				user: parsed.user.displayName,
				command: this.client.commands.LINK_CREATE
			})
		);
	}

	private async clanAlias(guild: string, alias: string) {
		return this.client.db
			.collection<{ name: string; tag: string }>(Collections.CLAN_STORES)
			.findOne({ guild, alias }, { collation: { strength: 2, locale: 'en' }, projection: { tag: 1, name: 1 } });
	}

	public async resolveClan(interaction: BaseInteraction<'cached'>, args?: string): Promise<Clan | null> {
		args = (args?.replace(/[\u200e|\u200f|\u200b|\u2002|\)|\()]+/g, '') ?? '').trim();
		const parsed = await this.parseArgument(interaction, args);

		const clan = await this.clanAlias(interaction.guild.id, args.trim());
		if (parsed.isTag) return this.getClan(interaction, clan && !args.startsWith('#') ? clan.tag : args, true);

		if (!parsed.user) {
			if (clan) return this.getClan(interaction, clan.tag);
			return this.fail(interaction, `**${status(404, interaction.locale)}**`);
		}

		if (parsed.matched) {
			const data = await this.getLinkedUserClan(parsed.user.id);
			if (data) return this.getClan(interaction, data.tag);
		} else {
			const data = await this.getLinkedClan(interaction, parsed.user.id);
			if (data) return this.getClan(interaction, data.tag);
		}

		if (interaction.user.id === parsed.user.id) {
			return this.fail(
				interaction,
				i18n('common.no_clan_tag', { lng: interaction.locale, command: this.client.commands.LINK_CREATE })
			);
		}

		return this.fail(
			interaction,
			i18n('common.clan_not_linked', {
				lng: interaction.locale,
				user: parsed.user.displayName,
				command: this.client.commands.LINK_CREATE
			})
		);
	}

	public async getPlayer(interaction: BaseInteraction, tag: string, user?: User): Promise<(Player & { user?: User }) | null> {
		const data: Player = await this.client.http.fetch(`/players/${encodeURIComponent(this.parseTag(tag))}`);
		if (data.ok) {
			this.client.indexer.index({ name: data.name, tag: data.tag, userId: interaction.user.id }, ElasticIndex.RECENT_PLAYERS);
		}
		if (data.ok) return { ...data, user };

		return this.fail(interaction, `**${status(data.statusCode, interaction.locale)}**`);
	}

	public async getClan(interaction: BaseInteraction, tag: string, checkAlias = false): Promise<Clan | null> {
		const data: Clan = await this.client.http.fetch(`/clans/${encodeURIComponent(this.parseTag(tag))}`);
		if (data.ok) {
			this.client.indexer.index({ name: data.name, tag: data.tag, userId: interaction.user.id }, ElasticIndex.RECENT_CLANS);
		}
		if (data.ok) return data;

		if (checkAlias && data.statusCode === 404 && !tag.startsWith('#')) {
			const clan = await this.clanAlias(interaction.guild!.id, tag);
			if (clan) return this.getClan(interaction, clan.tag);
		}

		return this.fail(interaction, `**${status(data.statusCode, interaction.locale)}**`);
	}

	private async fail(interaction: BaseInteraction, content: string) {
		if (interaction.isCommand()) {
			return interaction.editReply({ content }).then(() => null);
		} else if (interaction.isMessageComponent()) {
			return interaction.followUp({ content, ephemeral: true }).then(() => null);
		}
		return null;
	}

	private async parseArgument(interaction: BaseInteraction<'cached'>, args: string) {
		if (!args) return { user: interaction.user, matched: false, isTag: false };

		const id = /<@!?(\d{17,19})>/.exec(args)?.[1] ?? /^\d{17,19}/.exec(args)?.[0];
		if (id) {
			const user = this.client.users.cache.get(id) ?? (await this.client.users.fetch(id).catch(() => null));
			if (user) return { user, matched: true, isTag: false };
			return { user: null, matched: true, isTag: false };
		}

		return { user: null, matched: false, isTag: /^#?[0289CGJLOPQRUVY]+$/gi.test(args) };
	}

	private parseTag(tag?: string) {
		const matched = tag?.match(/^#?[0289CGJLOPQRUVY]+$/gi)?.[0];
		return `#${matched?.toUpperCase().replace(/#/g, '').replace(/O/g, '0') ?? ''}`;
	}

	private async getLinkedClan(interaction: BaseInteraction<'cached'>, userId: string) {
		return (
			(await this.client.db.collection(Collections.CLAN_STORES).findOne({ channels: interaction.channel!.id })) ??
			(await this.getLinkedUserClan(userId)) ??
			null
		);
	}

	private async getLinkedUserClan(userId: string) {
		const user = await this.client.db.collection<UserInfoModel>(Collections.USERS).findOne({ userId });
		return user?.clan ?? null;
	}

	public async updateUserData(guild: Guild, userId: string) {
		const member = guild.members.cache.get(userId);
		if (!member) return null;

		await this.client.db.collection(Collections.USERS).updateOne(
			{ userId: member.user.id },
			{
				$set: {
					username: member.user.username,
					discriminator: member.user.discriminator,
					displayName: member.user.displayName
				}
			}
		);

		await this.client.db.collection(Collections.PLAYER_LINKS).updateMany(
			{ userId: member.user.id },
			{
				$set: {
					username: member.user.username,
					discriminator: member.user.discriminator,
					displayName: member.user.displayName
				}
			}
		);
	}

	public async getLinkedPlayerTags(userId: string) {
		const [players, others] = await Promise.all([
			this.client.db.collection<PlayerLinks>(Collections.PLAYER_LINKS).find({ userId }).toArray(),
			this.client.http.getPlayerTags(userId)
		]);
		return Array.from(new Set([...players.map((en) => en.tag), ...others.map((tag) => tag)]));
	}

	public async getLinkedUsersMap(players: { tag: string }[]) {
		const fetched = await Promise.all([
			this.client.http.getDiscordLinks(players),
			this.client.db
				.collection<PlayerLinks>(Collections.PLAYER_LINKS)
				.find({ tag: { $in: players.map((player) => player.tag) } })
				.toArray()
		]);
		const result = fetched.flat().map((en) => ({ tag: en.tag, userId: en.userId, verified: en.verified }));
		return result.reduce<Record<string, { userId: string; tag: string; verified: boolean }>>((acc, mem) => {
			acc[mem.tag] ??= mem; // eslint-disable-line
			const current = acc[mem.tag];
			if (!current.verified && mem.verified) acc[mem.tag].verified = true;
			if (current.userId !== mem.userId) acc[mem.tag] = mem;
			return acc;
		}, {});
	}

	public async getLinkedUsers(players: { tag: string }[]) {
		const users = await this.getLinkedUsersMap(players);
		return Object.values(users);
	}

	public async getUser(playerTag: string) {
		const link = await this.client.db.collection<PlayerLinks>(Collections.PLAYER_LINKS).findOne({ tag: playerTag });
		if (!link) return null;
		return this.client.users.fetch(link.userId).catch(() => null);
	}

	public async fetchPlayers(playerTags: string[]) {
		return (await Promise.all(playerTags.map((tag) => this.client.http.player(tag)))).filter((res) => res.ok);
	}

	public async getPlayers(userId: string, limit = 25) {
		const [players, others] = await Promise.all([
			this.client.db.collection<PlayerLinks>(Collections.PLAYER_LINKS).find({ userId }).toArray(),
			this.client.http.getPlayerTags(userId)
		]);
		const playerTagSet = new Set([...players.map((en) => en.tag), ...others.map((tag) => tag)]);
		const playerTags = Array.from(playerTagSet)
			.slice(0, limit)
			.map((tag) => this.client.http.player(tag));
		return (await Promise.all(playerTags)).filter((res) => res.ok);
	}

	public async resolveArgs(args?: string) {
		if (args?.startsWith('AC-')) {
			const tags = await this.client.redis.connection.get(args);
			if (tags) return tags.split(/[, ]+/g);
		}
		return args?.split(/[, ]+/g) ?? [];
	}

	public async enforceSecurity(
		interaction: CommandInteraction<'cached'>,
		{
			collection,
			tag
		}: {
			tag?: string;
			collection: Collections;
		}
	) {
		if (!tag) {
			await interaction.editReply(i18n('common.no_clan_tag_first_time', { lng: interaction.locale }));
			return null;
		}
		const data = await this.getClan(interaction, tag);
		if (!data) return null;

		const memberCount = interaction.guild.memberCount;
		const [features, clans] = await Promise.all([
			this.client.storage._find(interaction.guild.id, collection),
			this.client.storage.find(interaction.guild.id)
		]);

		const max = this.client.settings.get<number>(interaction.guild.id, Settings.CLAN_LIMIT, 2);
		const isPatron = this.client.patrons.get(interaction.guild.id);

		if (
			collection !== Collections.CLAN_STORES &&
			features.length >= max &&
			!features.map((clan) => clan.tag).includes(data.tag) &&
			// make me invincible
			!this.client.isOwner(interaction.user) &&
			!this.client.isOwner(interaction.guild.ownerId)
		) {
			if (isPatron) {
				await interaction.editReply(
					'You have reached the maximum limit of automation. Please [contact us](https://discord.gg/ppuppun) to increase the limit.'
				);
			} else {
				await interaction.editReply({
					content: this.client.i18n('common.clan_limit', { lng: interaction.locale, command: this.client.commands.REDEEM })
				});
			}
			return null;
		}

		const links = await this.client.db
			.collection<PlayerLinks>(Collections.PLAYER_LINKS)
			.find({ userId: interaction.user.id })
			.toArray();
		const count = await this.client.db
			.collection(Collections.CLAN_STORES)
			.countDocuments({ tag: data.tag, guild: { $ne: interaction.guildId } });
		const code = ['CP', interaction.guild.id.slice(-2)].join('');
		const clan = clans.find((clan) => clan.tag === data.tag);

		if (
			(count > 5 || clans.length >= this.clanLimit(memberCount, data.tag, clans)) &&
			!isPatron &&
			!clan?.verified &&
			!this.verifyClan(code, data, links) &&
			// make me invincible
			!this.client.isOwner(interaction.user) &&
			!this.client.isOwner(interaction.guild.ownerId)
		) {
			await interaction.editReply({
				content: this.client.i18n('common.clan_verification', {
					lng: interaction.locale,
					code,
					command: this.client.commands.VERIFY
				})
			});
			return null;
		}

		return data;
	}

	private verifyClan(code: string, clan: Clan, tags: { tag: string; verified: boolean }[]) {
		const verifiedTags = tags.filter((en) => en.verified).map((en) => en.tag);
		return (
			clan.memberList.filter((m) => ['coLeader', 'leader'].includes(m.role)).some((m) => verifiedTags.includes(m.tag)) ||
			clan.description.toUpperCase().includes(code)
		);
	}

	private clanLimit(memberCount: number, tag: string, clans: { tag: string; active: boolean }[]) {
		const existing = clans
			.filter((clan) => clan.active)
			.map((clan) => clan.tag)
			.includes(tag);

		if (memberCount < 10 && !existing) return 2;
		if (memberCount < 50 && !existing) return 5;
		if (memberCount < 100 && !existing) return 20;
		return 100;
	}
}
