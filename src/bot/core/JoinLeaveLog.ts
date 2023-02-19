import { Player } from 'clashofclans.js';
import { Collection, EmbedBuilder, PermissionsString, WebhookClient, WebhookCreateMessageOptions } from 'discord.js';
import moment from 'moment';
import { ObjectId } from 'mongodb';
import { Client } from '../struct/Client.js';
import { Collections, DeepLinkTypes } from '../util/Constants.js';
import { EMOJIS, HEROES, PLAYER_LEAGUES, TOWN_HALLS } from '../util/Emojis.js';
import { Util } from '../util/index.js';
import BaseLog from './BaseLog.js';

const OP: { [key: string]: number } = {
	JOINED: 0x38d863, // GREEN
	LEFT: 0xeb3508 // RED
};

export default class JoinLeaveLog extends BaseLog {
	public declare cached: Collection<string, Cache>;

	public constructor(client: Client) {
		super(client);
	}

	public override get permissions(): PermissionsString[] {
		return ['SendMessages', 'EmbedLinks', 'UseExternalEmojis', 'AddReactions', 'ReadMessageHistory', 'ViewChannel'];
	}

	public override get collection() {
		return this.client.db.collection(Collections.JOIN_LEAVE_LOGS);
	}

	public override async handleMessage(cache: Cache, webhook: WebhookClient, data: Feed) {
		const members = data.members.filter((mem) => Object.keys(OP).includes(mem.op));
		if (!members.length) return null;
		const delay = members.length >= 5 ? 2000 : 250;

		members.sort((a, b) => a.rand - b.rand);
		const messages = (await Promise.all(members.map((mem) => this.embed(cache, mem, data)))).filter((m) => m);

		for (const message of messages) {
			if (!message) continue;
			const msg = await this.send(cache, webhook, {
				embeds: [message.embed],
				content: message.content!,
				threadId: cache.threadId
			});
			await this.updateMessageId(cache, msg);
			await Util.delay(delay);
		}

		return members.length;
	}

	private async send(cache: Cache, webhook: WebhookClient, payload: WebhookCreateMessageOptions) {
		try {
			return await super._send(cache, webhook, payload);
		} catch (error: any) {
			this.client.logger.error(`${error as string} {${cache.clanId.toString()}}`, { label: 'DonationLog' });
			return null;
		}
	}

	private async embed(cache: Cache, member: Member, data: Feed) {
		const player: Player = await this.client.http.player(member.tag);
		if (!player.ok) return null;

		let content = null;
		const embed = new EmbedBuilder().setColor(OP[member.op]).setTitle(`\u200e${player.name} (${player.tag})`);
		if (!cache.deepLink || cache.deepLink === DeepLinkTypes.OpenInCOS) {
			embed.setURL(`https://www.clashofstats.com/players/${player.tag.replace('#', '')}`);
		}
		if (cache.deepLink === DeepLinkTypes.OpenInGame) {
			embed.setURL(`https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${encodeURIComponent(player.tag)}`);
		}
		if (member.op === 'LEFT') {
			embed.setFooter({ text: `Left ${data.clan.name} [${data.memberList.length}/50]`, iconURL: data.clan.badge });
			embed.setDescription(
				[
					`${TOWN_HALLS[player.townHallLevel]!} **${player.townHallLevel}**`,
					`${EMOJIS.EXP} **${player.expLevel}**`,
					`${EMOJIS.TROOPS_DONATE} **${member.donations}**${EMOJIS.UP_KEY} **${member.donationsReceived}**${EMOJIS.DOWN_KEY}`
				].join(' ')
			);
		}
		if (member.op === 'JOINED') {
			const flag = await this.client.db.collection(Collections.FLAGS).findOne({ guild: cache.guild, tag: member.tag });
			embed.setFooter({ text: `Joined ${data.clan.name} [${data.memberList.length}/50]`, iconURL: data.clan.badge });
			embed.setDescription(
				[
					`${TOWN_HALLS[player.townHallLevel]!}**${player.townHallLevel}**`,
					`${this.formatHeroes(player)}`,
					`${EMOJIS.WAR_STAR}**${player.warStars}**`,
					`${PLAYER_LEAGUES[player.league?.id ?? 29000000]!}**${player.trophies}**`
				].join(' ')
			);

			if (flag) {
				const guild = this.client.guilds.cache.get(cache.guild)!;
				const user = await this.client.users.fetch(flag.user, { cache: false }).catch(() => null);
				if (cache.role && guild.roles.cache.has(cache.role)) {
					const role = guild.roles.cache.get(cache.role)!;
					content = `${role.toString()}`;
				}
				embed.setDescription(
					[
						embed.data.description,
						'',
						'**Flag**',
						`${flag.reason as string}`,
						`\`${user ? user.tag : 'Unknown#0000'} (${moment.utc(flag.createdAt).format('DD-MM-YYYY kk:mm')})\``
					].join('\n')
				);
			}
		}
		embed.setTimestamp();
		return { content, embed };
	}

	private formatHeroes(member: Player) {
		if (member.heroes.length) {
			const heroes = member.heroes.filter(({ village }) => village === 'home');
			return heroes.length
				? heroes.length > 3
					? heroes.map((hero) => `${HEROES[hero.name]!}**${hero.level}**`).join(' ')
					: `${EMOJIS.EXP}**${member.expLevel}** ${heroes.map((hero) => `${HEROES[hero.name]!}**${hero.level}**`).join(' ')}`
				: `${EMOJIS.EXP} **${member.expLevel}**`;
		}

		return `${EMOJIS.EXP} **${member.expLevel}**`;
	}

	public async init() {
		await this.collection.find({ guild: { $in: this.client.guilds.cache.map((guild) => guild.id) } }).forEach((data) => {
			this.cached.set((data.clanId as ObjectId).toHexString(), {
				clanId: data.clanId,
				guild: data.guild,
				channel: data.channel,
				tag: data.tag,
				role: data.role,
				deepLink: data.deepLink,
				retries: data.retries ?? 0,
				webhook: data.webhook?.id ? new WebhookClient(data.webhook) : null
			});
		});
	}

	public async add(id: string) {
		const data = await this.collection.findOne({ clanId: new ObjectId(id) });
		if (!data) return null;

		return this.cached.set(id, {
			clanId: data.clanId,
			guild: data.guild,
			channel: data.channel,
			tag: data.tag,
			role: data.role,
			deepLink: data.deepLink,
			retries: data.retries ?? 0,
			webhook: data.webhook?.id ? new WebhookClient(data.webhook) : null
		});
	}
}

interface Member {
	op: string;
	tag: string;
	name: string;
	rand: number;
	role: string;
	donations: number;
	donationsReceived: number;
}

interface Feed {
	clan: {
		tag: string;
		name: string;
		badge: string;
	};
	members: Member[];
	memberList: {
		tag: string;
		role: string;
		clan: { tag: string };
	}[];
}

interface Cache {
	tag: string;
	clanId: ObjectId;
	webhook: WebhookClient | null;
	deleted?: boolean;
	channel: string;
	role: string | null;
	guild: string;
	threadId?: string;
	retries: number;
	deepLink?: string;
}
