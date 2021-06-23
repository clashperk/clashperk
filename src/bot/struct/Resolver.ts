import { Message, GuildMember, Guild, Snowflake } from 'discord.js';
import { Player, Clan } from 'clashofclans.js';
import { Collections, status } from '../util/Constants';
import { Flag } from 'discord-akairo';
import Client from './Client';

export default class Resolver {
	private readonly client: Client;

	public constructor(client: Client) {
		this.client = client;
	}

	public async resolvePlayer(message: Message, args: string, num = 1): Promise<Player | Flag> {
		const parsed = await this.argumentParser(message, args);
		const tag = parsed && typeof parsed === 'boolean';

		if (tag) return this.getPlayer(message, args);

		if (!parsed) {
			return this.fail(message, `**${status(404)}**`);
		}

		const { user } = (parsed as GuildMember);
		const otherTags: string[] = [];
		const data = await this.client.db.collection(Collections.LINKED_PLAYERS).findOne({ user: user.id });
		if (data && data.user_tag !== user.tag) this.updateUserTag(message.guild!, user.id);

		if (!data?.entries?.length || num > data?.entries?.length) {
			otherTags.push(...(await this.client.http.getPlayerTags(user.id)));
		}

		const tagSet = new Set([...data?.entries?.map((en: any) => en.tag) ?? [], ...otherTags]);
		const tags = Array.from(tagSet);
		tagSet.clear();

		if (tags.length) return this.getPlayer(message, tags[Math.min(tags.length - 1, num - 1)]);
		if (message.author.id === user.id) {
			return this.fail(message, '**You must provide a player tag to run this command!**');
		}

		return this.fail(message, `**No Player Linked to ${user.tag}!**`);
	}

	private async clanAlias(guild: string, alias: string) {
		return this.client.db.collection(Collections.CLAN_STORES)
			.findOne(
				{ guild, alias },
				{ collation: { strength: 2, locale: 'en' } }
			);
	}

	public async resolveClan(message: Message, args: string): Promise<Clan | Flag> {
		const parsed = await this.argumentParser(message, args);

		const tag = parsed && typeof parsed === 'boolean';
		if (tag) return this.getClan(message, args, true);

		if (!parsed) {
			const clan = await this.clanAlias(message.guild!.id, args.trim());
			if (clan) return this.getClan(message, clan.tag);
			return this.fail(message, `**${status(404)}**`);
		}

		const data = await this.getLinkedClan(message.channel.id, (parsed as GuildMember).id);
		if (data) return this.getClan(message, data.tag);

		if (message.author.id === (parsed as GuildMember).id) {
			return this.fail(message, '**You must provide a clan tag to run this command!**');
		}

		return this.fail(message, `**No Clan Linked to ${(parsed as GuildMember).user.tag}!**`);
	}

	public async getPlayer(message: Message, tag: string): Promise<Player | Flag> {
		const data: Player = await this.client.http.fetch(`/players/${encodeURIComponent(this.parseTag(tag))}`);
		if (data.ok) return data;

		return this.fail(message, `**${status(data.statusCode)}**`);
	}

	public async getClan(message: Message, tag: string, checkAlias = false): Promise<Clan | Flag> {
		const data: Clan = await this.client.http.fetch(`/clans/${encodeURIComponent(this.parseTag(tag))}`);
		if (data.ok) return data;

		if (checkAlias && data.statusCode === 404) {
			const clan = await this.clanAlias(message.guild!.id, tag.replace('#', '').toLowerCase());
			if (clan) return this.getClan(message, clan.tag);
		}

		return this.fail(message, `**${status(data.statusCode)}**`);
	}

	private async fail(message: Message, content: string) {
		return message.util!.send(content)
			.catch(() => Flag.cancel())
			.then(() => Flag.cancel());
	}

	private argumentParser(message: Message, args: string) {
		if (!args) return message.member;
		const id = /<@!?(\d{17,19})>/.exec(args)?.[1] ?? /^\d{17,19}/.exec(args)?.[0];
		if (id) {
			if (message.guild!.members.cache.has(id as Snowflake)) return message.guild!.members.cache.get(id as Snowflake);
			return message.guild!.members.fetch(id as Snowflake).catch(() => null);
		}
		return /^#?[0289CGJLOPQRUVY]+$/gi.test(args);
	}

	private parseTag(tag: string) {
		const matched = tag.match(/^#?[0289CGJLOPQRUVY]+$/gi)?.[0];
		return `#${matched?.toUpperCase().replace(/#/g, '').replace(/O|o/g, '0') as string}`;
	}

	private async getLinkedClan(channel_id: string, user_id: string) {
		const clan = await this.client.db.collection(Collections.CLAN_STORES).findOne({ channels: channel_id });
		if (clan) return clan;
		const user = await this.client.db.collection(Collections.LINKED_PLAYERS).findOne({ user: user_id });
		if (user?.clan) return user.clan;
		return null;
	}

	public updateUserTag(guild: Guild, user_id: string) {
		const member = guild.members.cache.get(user_id as Snowflake);
		if (!member) return null;
		return this.client.db.collection(Collections.LINKED_PLAYERS).updateOne(
			{ user: member.user.id },
			{ $set: { user_tag: member.user.tag } }
		);
	}
}
