import { Collections, Settings, status } from '../util/Constants';
import { Guild, User, Interaction, CommandInteraction, GuildMember } from 'discord.js';
import { Player, Clan } from 'clashofclans.js';
import Client from './Client';
import { UserInfo } from '../types';
import { i18n } from '../util/i18n';

export default class Resolver {
	private readonly client: Client;

	public constructor(client: Client) {
		this.client = client;
	}

	public async resolvePlayer(interaction: Interaction, args?: string, num = 1): Promise<(Player & { user?: User }) | null> {
		args = args?.replace(/[\u200e|\u200f]+/g, '') ?? '';
		const parsed = await this.argumentParser(interaction, args);
		const tag = parsed && typeof parsed === 'boolean';

		if (tag) return this.getPlayer(interaction, args);
		if (!parsed) {
			return this.fail(interaction, `**${status(404)}**`);
		}

		const { user } = parsed;
		const otherTags: string[] = [];
		const data = await this.client.db.collection(Collections.LINKED_PLAYERS).findOne({ user: user.id });
		if (data && data.user_tag !== user.tag) this.updateUserTag(interaction.guild!, user.id);

		if (!data?.entries?.length || num > data.entries?.length) {
			otherTags.push(...(await this.client.http.getPlayerTags(user.id)));
		}

		const tagSet = new Set([...(data?.entries?.map((en: any) => en.tag) ?? []), ...otherTags]);
		const tags = Array.from(tagSet);
		tagSet.clear();

		if (tags.length) return this.getPlayer(interaction, tags[Math.min(tags.length - 1, num - 1)], user);
		if (interaction.user.id === user.id) {
			return this.fail(interaction, i18n('common.no_player_tag', { lng: interaction.locale }));
		}

		return this.fail(interaction, i18n('common.player_not_linked', { lng: interaction.locale, user: parsed.user.tag }));
	}

	private async clanAlias(guild: string, alias: string) {
		return this.client.db
			.collection<{ name: string; tag: string }>(Collections.CLAN_STORES)
			.findOne({ guild, alias }, { collation: { strength: 2, locale: 'en' }, projection: { tag: 1, name: 1 } });
	}

	public async resolveClan(interaction: Interaction, args?: string): Promise<Clan | null> {
		args = args?.replace(/[\u200e|\u200f]+/g, '') ?? '';
		const parsed = await this.argumentParser(interaction, args);

		const clan = await this.clanAlias(interaction.guild!.id, args.trim());
		const tag = parsed && typeof parsed === 'boolean';
		if (tag) return this.getClan(interaction, clan && !args.startsWith('#') ? clan.tag : args, true);

		if (!parsed) {
			if (clan) return this.getClan(interaction, clan.tag);
			return this.fail(interaction, `**${status(404)}**`);
		}

		const data = await this.getLinkedClan(interaction, parsed.id);
		if (data) return this.getClan(interaction, data.tag);

		if (interaction.user.id === parsed.id) {
			return this.fail(interaction, i18n('common.no_clan_tag', { lng: interaction.locale }));
		}

		return this.fail(interaction, i18n('common.clan_not_linked', { lng: interaction.locale, user: parsed.user.tag }));
	}

	public async getPlayer(interaction: Interaction, tag: string, user?: User): Promise<(Player & { user?: User }) | null> {
		const data: Player = await this.client.http.fetch(`/players/${encodeURIComponent(this.parseTag(tag))}`);
		if (data.ok) return { ...data, user };

		return this.fail(interaction, `**${status(data.statusCode)}**`);
	}

	public async getClan(interaction: Interaction, tag: string, checkAlias = false): Promise<Clan | null> {
		const data: Clan = await this.client.http.fetch(`/clans/${encodeURIComponent(this.parseTag(tag))}`);
		if (data.ok) return data;

		if (checkAlias && data.statusCode === 404 && !tag.startsWith('#')) {
			const clan = await this.clanAlias(interaction.guild!.id, tag);
			if (clan) return this.getClan(interaction, clan.tag);
		}

		return this.fail(interaction, `**${status(data.statusCode)}**`);
	}

	private async fail(interaction: Interaction, content: string) {
		if (interaction.isApplicationCommand()) {
			return interaction.editReply({ content }).then(() => null);
		} else if (interaction.isMessageComponent()) {
			return interaction.followUp({ content, ephemeral: true }).then(() => null);
		}
		return null;
	}

	private argumentParser(interaction: Interaction, args: string) {
		if (!args) return interaction.member as GuildMember;
		const id = /<@!?(\d{17,19})>/.exec(args)?.[1] ?? /^\d{17,19}/.exec(args)?.[0];
		if (id) {
			if (interaction.guild!.members.cache.has(id)) return interaction.guild!.members.cache.get(id);
			return interaction.guild!.members.fetch(id).catch(() => null);
		}
		return /^#?[0289CGJLOPQRUVY]+$/gi.test(args);
	}

	private parseTag(tag: string) {
		const matched = tag.match(/^#?[0289CGJLOPQRUVY]+$/gi)?.[0];
		return `#${matched?.toUpperCase().replace(/#/g, '').replace(/O/g, '0') ?? ''}`;
	}

	private async getLinkedClan(interaction: Interaction, user_id: string) {
		const clan = await this.client.db.collection(Collections.CLAN_STORES).findOne({ channels: interaction.channel!.id });
		if (clan) return clan;
		const user = await this.client.db.collection(Collections.LINKED_PLAYERS).findOne({ user: user_id });
		if (user?.clan) return user.clan;
		const guild = await this.client.db.collection(Collections.CLAN_STORES).findOne({ guild: interaction.guild!.id });
		if (guild) return guild;
		return null;
	}

	public updateUserTag(guild: Guild, user_id: string) {
		const member = guild.members.cache.get(user_id);
		if (!member) return null;
		return this.client.db
			.collection(Collections.LINKED_PLAYERS)
			.updateOne({ user: member.user.id }, { $set: { user_tag: member.user.tag } });
	}

	public async getPlayers(userId: string) {
		const data = await this.client.db.collection<UserInfo>(Collections.LINKED_PLAYERS).findOne({ user: userId });
		const others = await this.client.http.getPlayerTags(userId);

		const playerTagSet = new Set([...(data?.entries ?? []).map((en) => en.tag), ...others.map((tag) => tag)]);

		return (
			await Promise.all(
				Array.from(playerTagSet)
					.slice(0, 25)
					.map((tag) => this.client.http.player(tag))
			)
		).filter((res) => res.ok);
	}

	public async enforceSecurity(interaction: CommandInteraction<'cached'>, tag?: string) {
		if (!tag) {
			await interaction.editReply(i18n('common.no_clan_tag', { lng: interaction.locale }));
			return null;
		}
		const data = await this.getClan(interaction, tag);
		if (!data) return null;

		const clans = await this.client.storage.findAll(interaction.guild.id);
		const max = this.client.settings.get<number>(interaction.guild.id, Settings.CLAN_LIMIT, 2);
		if (
			clans.length >= max &&
			!clans
				.filter((clan) => clan.active)
				.map((clan) => clan.tag)
				.includes(data.tag)
		) {
			await interaction.editReply({ content: this.client.i18n('common.clan_limit', { lng: interaction.locale }) });
			return null;
		}

		const user = await this.client.db.collection(Collections.LINKED_PLAYERS).findOne({ user: interaction.user.id });
		const code = ['CP', interaction.guild.id.substr(-2)].join('');
		const clan = clans.find((clan) => clan.tag === data.tag);
		if (!clan?.verified && !this.verifyClan(code, data, user?.entries ?? []) && !this.client.isOwner(interaction.user)) {
			await interaction.editReply({ content: this.client.i18n('common.clan_verification', { lng: interaction.locale }) });
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
}
