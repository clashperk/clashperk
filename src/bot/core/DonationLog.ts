import { MessageEmbed, Collection, PermissionString, TextChannel, WebhookClient, ThreadChannel } from 'discord.js';
import { ObjectId } from 'mongodb';
import { BLUE_NUMBERS, RED_NUMBERS, PLAYER_LEAGUES, EMOJIS } from '../util/Emojis.js';
import { Collections } from '../util/Constants.js';
import { Client } from '../struct/Client.js';

export interface Donation {
	clan: {
		tag: string;
		name: string;
		badge: string;
		members: number;
	};
	donated: {
		donated: number;
		name: string;
		tag: string;
		league: number;
	}[];
	received: {
		received: number;
		name: string;
		tag: string;
		league: number;
	}[];
	unmatched?: {
		in: number;
		out: number;
	};
}

export default class DonationLog {
	public cached: Collection<string, any>;

	public constructor(private readonly client: Client) {
		this.client = client;
		this.cached = new Collection();
	}

	public async exec(tag: string, data: any) {
		const clans = this.cached.filter((d) => d.tag === tag);
		for (const id of clans.keys()) {
			const cache = this.cached.get(id);
			if (cache) await this.permissionsFor(id, cache, data);
		}

		return clans.clear();
	}

	private async permissionsFor(id: string, cache: any, data: any) {
		const permissions: PermissionString[] = ['SEND_MESSAGES', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'VIEW_CHANNEL'];

		if (this.client.channels.cache.has(cache.channel)) {
			const channel = this.client.channels.cache.get(cache.channel)! as TextChannel | ThreadChannel;
			if (channel.isThread() && (channel.locked || !channel.permissionsFor(this.client.user!)?.has('SEND_MESSAGES_IN_THREADS')))
				return;
			if (channel.permissionsFor(this.client.user!)?.has(permissions)) {
				if (!channel.isThread() && this.hasWebhookPermission(channel)) {
					const webhook = await this.webhook(id);
					if (webhook) return this.handleMessage(id, webhook, data);
				}
				if (channel.isThread() && channel.archived && !(await this.unarchive(channel))) return;
				return this.handleMessage(id, channel, data);
			}
		}
	}

	private async unarchive(thread: ThreadChannel) {
		if (!(thread.editable && thread.manageable)) return null;
		return thread.edit({ autoArchiveDuration: 'MAX', archived: false, locked: false });
	}

	private hasWebhookPermission(channel: TextChannel) {
		return (
			channel.permissionsFor(channel.guild.me!)!.has(['MANAGE_WEBHOOKS']) &&
			channel.permissionsFor(channel.guild.id)!.has(['USE_EXTERNAL_EMOJIS'])
		);
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
			const webhook = webhooks.find((hook) => (hook.owner as any)?.id === this.client.user?.id);

			if (webhook) {
				cache.webhook = new WebhookClient({ id: webhook.id, token: webhook.token! });
				this.cached.set(id, cache);

				await this.client.db
					.collection(Collections.DONATION_LOGS)
					.updateOne(
						{ channel: channel.id, guild: channel.guild.id },
						{ $set: { webhook_id: webhook.id, webhook_token: webhook.token } }
					);

				return cache.webhook;
			}
		}

		if (webhooks.size === 10) return this.stopWebhookCheck(id);
		const webhook = await channel
			.createWebhook(this.client.user!.username, { avatar: this.client.user!.displayAvatarURL({ size: 2048, format: 'png' }) })
			.catch(() => null);

		if (webhook) {
			cache.webhook = new WebhookClient({ id: webhook.id, token: webhook.token! });
			this.cached.set(id, cache);

			await this.client.db
				.collection(Collections.DONATION_LOGS)
				.updateOne(
					{ channel: channel.id, guild: channel.guild.id },
					{ $set: { webhook_id: webhook.id, webhook_token: webhook.token } }
				);

			return cache.webhook;
		}

		return this.stopWebhookCheck(id);
	}

	private async handleMessage(id: string, channel: TextChannel | WebhookClient | ThreadChannel, data: Donation) {
		const cache = this.cached.get(id);
		const embed = new MessageEmbed()
			.setTitle(`${data.clan.name} (${data.clan.tag})`)
			.setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(data.clan.tag)}`)
			.setThumbnail(data.clan.badge)
			.setFooter({ text: `${data.clan.members} Members`, iconURL: this.client.user!.displayAvatarURL({ format: 'png' }) })
			.setTimestamp();
		if (cache.color) embed.setColor(cache.color);

		if (data.donated.length) {
			embed.addField(
				`${EMOJIS.USER_BLUE} Donated`,
				[
					data.donated
						.map((m) => {
							if (m.donated > 200) {
								const [div, mod] = this.divmod(m.donated);
								const list = [
									`\u200e${PLAYER_LEAGUES[m.league]!} ${BLUE_NUMBERS[(div > 900 ? 900 : div).toString()]!} ${m.name}`
								];
								if (mod > 0)
									return list
										.concat(`\u200e${PLAYER_LEAGUES[m.league]!} ${BLUE_NUMBERS[mod.toString()]!} ${m.name}`)
										.join('\n');
								return list.join('\n');
							}
							return `\u200e${PLAYER_LEAGUES[m.league]!} ${BLUE_NUMBERS[m.donated]!} ${m.name}`;
						})
						.join('\n')
						.substring(0, 1024)
				].join('\n')
			);
		}

		if (data.received.length) {
			embed.addField(
				`${EMOJIS.USER_RED} Received`,
				[
					data.received
						.map((m) => {
							if (m.received > 200) {
								const [div, mod] = this.divmod(m.received);
								const list = [
									`\u200e${PLAYER_LEAGUES[m.league]!} ${RED_NUMBERS[(div > 900 ? 900 : div).toString()]!} ${m.name}`
								];
								if (mod > 0)
									return list
										.concat(`\u200e${PLAYER_LEAGUES[m.league]!} ${RED_NUMBERS[mod.toString()]!} ${m.name}`)
										.join('\n');
								return list.join('\n');
							}
							return `\u200e${PLAYER_LEAGUES[m.league]!} ${RED_NUMBERS[m.received]!} ${m.name}`;
						})
						.join('\n')
						.substring(0, 1024)
				].join('\n')
			);
		}

		if (channel instanceof TextChannel || channel instanceof ThreadChannel) {
			await channel.send({ embeds: [embed] }).catch(() => null);
			return this.client.db
				.collection(Collections.DONATION_LOGS)
				.updateOne({ clanId: new ObjectId(id) }, { $set: { updatedAt: new Date() } });
		}

		try {
			const message = await channel.send({ embeds: [embed] });
			await this.client.db
				.collection(Collections.DONATION_LOGS)
				.updateOne({ clanId: new ObjectId(id) }, { $set: { updatedAt: new Date() } });
			if (message.channel_id !== cache.channel) {
				await channel.deleteMessage(message.id);
				return await this.recreateWebhook(id);
			}
		} catch (error: any) {
			if (error.code === 10015) {
				return this.recreateWebhook(id);
			}
		}
	}

	private divmod(num: number) {
		return [Math.floor(num / 100) * 100, num % 100];
	}

	public async init() {
		await this.client.db
			.collection(Collections.DONATION_LOGS)
			.find({ guild: { $in: this.client.guilds.cache.map((guild) => guild.id) } })
			.forEach((data) => {
				this.cached.set((data.clanId as ObjectId).toHexString(), {
					tag: data.tag,
					color: data.color,
					channel: data.channel,
					webhook: data.webhook_id ? new WebhookClient({ id: data.webhook_id, token: data.webhook_token }) : null
				});
			});
	}

	public async add(id: string) {
		const data = await this.client.db.collection(Collections.DONATION_LOGS).findOne({ clanId: new ObjectId(id) });

		if (!data) return null;
		return this.cached.set(id, {
			tag: data.tag,
			color: data.color,
			channel: data.channel,
			webhook: data.webhook_id ? new WebhookClient({ id: data.webhook_id, token: data.webhook_token }) : null
		});
	}

	public delete(id: string) {
		return this.cached.delete(id);
	}
}
