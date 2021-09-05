import { MessageEmbed, PermissionString, TextChannel, Collection, WebhookClient, ThreadChannel } from 'discord.js';
import { TOWN_HALLS, EMOJIS, PLAYER_LEAGUES, HEROES } from '../util/Emojis';
import { Collections } from '../util/Constants';
import { Player } from 'clashofclans.js';
import Client from '../struct/Client';
import { ObjectId } from 'mongodb';
import moment from 'moment';

const OP: { [key: string]: number } = {
	JOINED: 0x38d863, // GREEN
	LEFT: 0xeb3508 // RED
};

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
		tag: string; role: string;
		clan: { tag: string };
	}[];
}

export default class ClanFeedLog {
	public cached: Collection<string, any>;

	public constructor(private readonly client: Client) {
		this.cached = new Collection();
	}

	public async exec(tag: string, data: any) {
		const clans = this.cached.filter(d => d.tag === tag);
		for (const id of clans.keys()) {
			const cache = this.cached.get(id);
			if (cache) await this.permissionsFor(cache, data, id);
		}

		return clans.clear();
	}

	private async delay(ms: number) {
		return new Promise(res => setTimeout(res, ms));
	}

	private async permissionsFor(cache: any, data: Feed, id: string) {
		const permissions: PermissionString[] = [
			'SEND_MESSAGES',
			'EMBED_LINKS',
			'USE_EXTERNAL_EMOJIS',
			'ADD_REACTIONS',
			'READ_MESSAGE_HISTORY',
			'VIEW_CHANNEL'
		];

		if (this.client.channels.cache.has(cache.channel)) {
			const channel = this.client.channels.cache.get(cache.channel)! as TextChannel | ThreadChannel;
			if (channel.isThread() && (channel.locked || channel.archived || !channel.permissionsFor(channel.guild.me!).has(1n << 38n))) return;
			if (channel.permissionsFor(channel.guild.me!)!.has(permissions, false)) {
				if (!channel.isThread() && this.hasWebhookPermission(channel)) {
					const webhook = await this.webhook(id);
					if (webhook) return this.handleMessage(id, webhook, data);
				}
				return this.handleMessage(id, channel, data);
			}
		}
	}

	private async handleMessage(id: string, channel: TextChannel | WebhookClient | ThreadChannel, data: Feed) {
		return this.clanUpdate(channel, data, id);
	}

	private hasWebhookPermission(channel: TextChannel) {
		return channel.permissionsFor(channel.guild.me!)!.has(['MANAGE_WEBHOOKS']) && channel.permissionsFor(channel.guild.id)!.has(['USE_EXTERNAL_EMOJIS']);
	}

	private recreateWebhook(id: string) {
		const cache = this.cached.get(id);
		cache.webhook = null;
		this.cached.set(id, cache);
		return this.webhook(id);
	}

	private stopWebhookCheck(id: string) {
		const cache = this.cached.get(id);
		cache.webhook = null;
		cache.no_webhook = true;
		this.cached.set(id, cache);
		return null;
	}

	private async webhook(id: string): Promise<WebhookClient | null> {
		const cache = this.cached.get(id);
		if (cache.no_webhook) return null;
		if (cache.webhook) return cache.webhook;

		const channel = this.client.channels.cache.get(cache.channel) as TextChannel;
		const webhooks = await channel.fetchWebhooks();
		if (webhooks.size) {
			const webhook = webhooks.find(hook => (hook.owner as any)?.id === this.client.user?.id);

			if (webhook) {
				cache.webhook = new WebhookClient({ id: webhook.id, token: webhook.token! });
				this.cached.set(id, cache);

				await this.client.db.collection(Collections.CLAN_FEED_LOGS)
					.updateOne(
						{ channel: channel.id, guild: channel.guild.id },
						{ $set: { webhook_id: webhook.id, webhook_token: webhook.token } }
					);

				return cache.webhook;
			}
		}

		if (webhooks.size === 10) return this.stopWebhookCheck(id);
		const webhook = await channel.createWebhook(
			this.client.user!.username,
			{ avatar: this.client.user!.displayAvatarURL({ size: 2048, format: 'png' }) }
		).catch(() => null);

		if (webhook) {
			cache.webhook = new WebhookClient({ id: webhook.id, token: webhook.token! });
			this.cached.set(id, cache);

			await this.client.db.collection(Collections.CLAN_FEED_LOGS)
				.updateOne(
					{ channel: channel.id, guild: channel.guild.id },
					{ $set: { webhook_id: webhook.id, webhook_token: webhook.token } }
				);

			return cache.webhook;
		}

		return this.stopWebhookCheck(id);
	}

	private async clanUpdate(channel: TextChannel | WebhookClient | ThreadChannel, data: Feed, id: string) {
		const members = data.members.filter(mem => ['JOINED', 'LEFT'].includes(mem.op));
		if (!members.length) return null;
		const delay = members.length >= 5 ? 2000 : 250;
		const cache = this.cached.get(id);

		members.sort((a, b) => a.rand - b.rand);
		const messages = await Promise.all(members.map(mem => this.embed(id, mem, data)));

		for (const message of messages) {
			if (!message) continue;
			if (channel instanceof TextChannel || channel instanceof ThreadChannel) {
				await channel.send({ embeds: [message.embed], content: message.content }).catch(() => null);
			} else {
				try {
					const msg = await channel.send({ embeds: [message.embed], content: message.content });
					if (msg.channel_id !== cache.channel) {
						await channel.deleteMessage(msg.id);
						return this.recreateWebhook(id);
					}
				} catch (error: any) {
					if (error.code === 10015) {
						return this.recreateWebhook(id);
					}
				}
			}

			await this.delay(delay);
		}

		return members.length;
	}

	private async embed(id: string, member: Member, data: Feed) {
		const cache = this.cached.get(id);
		if (!cache) return null;
		const player: Player = await this.client.http.player(member.tag);
		if (!player.ok) return null;

		let content = null;
		const embed = new MessageEmbed()
			.setColor(OP[member.op])
			.setTitle(`\u200e${player.name} (${player.tag})`)
			.setURL(`https://www.clashofstats.com/players/${player.tag.substr(1)}`);
		if (member.op === 'LEFT') {
			embed.setFooter(`Left ${data.clan.name}`, data.clan.badge);
			embed.setDescription([
				`${TOWN_HALLS[player.townHallLevel]} **${player.townHallLevel}**`,
				`${EMOJIS.EXP} **${player.expLevel}**`,
				`${EMOJIS.TROOPS_DONATE} **${member.donations}**${EMOJIS.UP_KEY} **${member.donationsReceived}**${EMOJIS.DOWN_KEY}`
			].join(' '));
		} else {
			const flag = await this.client.db.collection(Collections.FLAGS)
				.findOne({ guild: cache.guild, tag: member.tag });

			embed.setFooter(`Joined ${data.clan.name}`, data.clan.badge);
			embed.setDescription([
				`${TOWN_HALLS[player.townHallLevel]}**${player.townHallLevel}**`,
				`${this.formatHeroes(player)}`,
				`${EMOJIS.WAR_STAR}**${player.warStars}**`,
				`${PLAYER_LEAGUES[player.league ? player.league.id : 29000000]}**${player.trophies}**`
			].join(' '));

			if (flag) {
				const guild = this.client.guilds.cache.get(cache.guild)!;
				const user = await this.client.users.fetch(flag.user, { cache: false }).catch(() => null);
				if (guild.roles.cache.has(cache.role)) {
					const role = guild.roles.cache.get(cache.role);
					content = `${role!.toString()}`;
				}
				embed.setDescription([
					embed.description,
					'',
					'**Flag**',
					`${flag.reason as string}`,
					`\`${user ? user.tag : 'Unknown#0000'} (${moment.utc(flag.createdAt).format('DD-MM-YYYY kk:mm')})\``
				].join('\n'));
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
					? heroes.map(hero => `${HEROES[hero.name]}**${hero.level}**`).join(' ')
					: `${EMOJIS.EXP}**${member.expLevel}** ${heroes.map(hero => `${HEROES[hero.name]}**${hero.level}**`).join(' ')}`
				: `${EMOJIS.EXP} **${member.expLevel}**`;
		}

		return `${EMOJIS.EXP} **${member.expLevel}**`;
	}

	public async init() {
		await this.client.db.collection(Collections.CLAN_FEED_LOGS)
			.find({ guild: { $in: this.client.guilds.cache.map(guild => guild.id) } })
			.forEach(data => {
				this.cached.set((data.clan_id as ObjectId).toHexString(), {
					guild: data.guild,
					channel: data.channel,
					tag: data.tag, role: data.role,
					webhook: data.webhook_id ? new WebhookClient({ id: data.webhook_id, token: data.webhook_token }) : null
				});
			});
	}

	public async add(id: string) {
		const data = await this.client.db.collection(Collections.CLAN_FEED_LOGS)
			.findOne({ clan_id: new ObjectId(id) });

		if (!data) return null;
		return this.cached.set(id, {
			guild: data.guild,
			channel: data.channel,
			tag: data.tag, role: data.role
		});
	}

	public delete(id: string) {
		return this.cached.delete(id);
	}
}
