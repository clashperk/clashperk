import { Message, GuildMember } from 'discord.js';
import { Player, Clan } from 'clashofclans.js';
import { Collections } from '@clashperk/node';
import { status } from '../util/Constants';
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

		const otherTags: string[] = [];
		const data = await this.client.db.collection(Collections.LINKED_PLAYERS).findOne({ user: (parsed as GuildMember).id });

		if (!data?.entries?.length || num > data?.entries?.length) {
			otherTags.push(...(await this.client.http.getPlayerTags((parsed as GuildMember).id)));
		}

		const tagSet = new Set([...data?.entries?.map((en: any) => en.tag) ?? [], ...otherTags]);
		const tags = Array.from(tagSet);
		tagSet.clear();

		if (tags.length) return this.getPlayer(message, tags[Math.min(tags.length - 1, num - 1)]);
		if (message.author.id === (parsed as GuildMember).id) {
			return this.fail(message, '**You must provide a player tag to run this command!**');
		}

		return this.fail(message, `**No Player Linked to ${(parsed as GuildMember).user.tag}!**`);
	}

	public async resolveClan(message: Message, args: string): Promise<Clan | Flag> {
		const parsed = await this.argumentParser(message, args);

		const tag = parsed && typeof parsed === 'boolean';

		if (tag) return this.getClan(message, args);

		if (!parsed) {
			return this.fail(message, `**${status(404)}**`);
		}

		const data = await this.client.db.collection(Collections.CLAN_STORES)
			.findOne({ channels: message.channel.id }) ||
			await this.client.db.collection(Collections.LINKED_CLANS)
				.findOne({ user: (parsed as GuildMember).id });

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

	public async getClan(message: Message, tag: string): Promise<Clan | Flag> {
		const data: Clan = await this.client.http.fetch(`/clans/${encodeURIComponent(this.parseTag(tag))}`);
		if (data.ok) return data;

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
			if (message.guild!.members.cache.has(id)) return message.guild!.members.cache.get(id);
			return message.guild!.members.fetch(id).catch(() => null);
		}
		return /[0289CGJLOPQRUVY]{3,12}/gi.test(args);
	}

	private parseTag(tag: string) {
		const matched = tag.match(/[0289CGJLOPQRUVY]{3,12}/gi)?.[0];
		return `#${matched?.toUpperCase().replace(/#/g, '').replace(/O|o/g, '0') as string}`;
	}
}
