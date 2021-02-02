import { MessageEmbed, Message, GuildMember } from 'discord.js';
import { COLLECTIONS, status } from '../util/Constants';
import { Player, Clan } from 'clashofclans.js';
import { Flag } from 'discord-akairo';
import Client from './Client';

export default class Resolver {
	private readonly client: Client;

	public constructor(client: Client) {
		this.client = client;
	}

	public async resolvePlayer(message: Message, args: string, num = 1): Promise<Player | Flag> {
		const arr = args?.split(/ +/g) ?? []; // eslint-disable-line
		if (arr.length > 1) num = Number(arr.pop()) || 1;
		if (/^\d$|^1\d$|^2[0-5]$/.test(args)) {
			num = Number(/^\d$|^1\d$|^2[0-5]$/.exec(args)?.shift()) || 1;
			args = '';
		}

		const parsed = await this.argumentParser(message, args);
		const tag = parsed && typeof parsed === 'boolean';

		if (tag) return this.getPlayer(message, args);

		const embed = new MessageEmbed();
		if (!parsed) {
			embed.setDescription(status(404));
			return this.fail(message, { embed });
		}

		const [data, otherTags] = await Promise.all([
			this.client.db.collection(COLLECTIONS.LINKED_USERS).findOne({ user: (parsed as GuildMember).id }),
			this.client.http.getPlayerTags((parsed as GuildMember).id)
		]);

		const tagSet = new Set([...data?.entries.map((en: any) => en.tag) ?? [], ...otherTags]);
		const tags = Array.from(tagSet);
		tagSet.clear();

		if (tags.length) return this.getPlayer(message, tags[Math.min(tags.length - 1, num - 1)]);
		if (message.author.id === (parsed as GuildMember).id) {
			embed.setDescription([
				'**Please provide a player tag and try again!**'
			]);
		} else {
			embed.setDescription([
				`Couldn't find a player linked to **${(parsed as GuildMember).user.tag}!**`
			]);
		}

		return this.fail(message, { embed });
	}

	public async resolveClan(message: Message, args: string): Promise<Clan | Flag> {
		const parsed = await this.argumentParser(message, args);

		const tag = parsed && typeof parsed === 'boolean';

		if (tag) return this.getClan(message, args);

		const embed = new MessageEmbed();
		if (!parsed) {
			embed.setDescription(status(404));
			return this.fail(message, { embed });
		}

		const data = await this.client.db.collection(COLLECTIONS.LINKED_CHANNELS)
			.findOne({ channel: message.channel.id }) ||
			await this.client.db.collection(COLLECTIONS.LINKED_CLANS)
				.findOne({ user: (parsed as GuildMember).id });

		if (data) return this.getClan(message, data.tag);

		if (message.author.id === (parsed as GuildMember).id) {
			embed.setDescription([
				'**Please provide a clan tag and try again!**'
			]);
		} else {
			embed.setDescription([
				`Couldn't find a clan linked to **${(parsed as GuildMember).user.tag}!**`
			]);
		}

		return this.fail(message, { embed });
	}

	public async getPlayer(message: Message, tag: string): Promise<Player | Flag> {
		const data: Player = await this.client.http.fetch(`/players/${encodeURIComponent(this.parseTag(tag))}`);
		if (data.ok) return data;

		const embed = new MessageEmbed()

			.setDescription(status(data.statusCode));

		return this.fail(message, { embed });
	}

	public async getClan(message: Message, tag: string): Promise<Clan | Flag> {
		const data: Clan = await this.client.http.fetch(`/clans/${encodeURIComponent(this.parseTag(tag))}`);
		if (data.ok) return data;

		const embed = new MessageEmbed()

			.setDescription(status(data.statusCode));

		return this.fail(message, { embed });
	}

	private async fail(message: Message, res: any) {
		return message.channel.send({ embed: res.embed })
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
