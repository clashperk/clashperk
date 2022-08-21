import { ChannelType, NewsChannel, PermissionsString, TextChannel } from 'discord.js';
import { Client } from '../struct/Client.js';

export default class WebhookHandler {
	public constructor(private readonly client: Client) {}

	private async getWorkload(guild: string, webhookIds: string[]) {
		const clans = await this.client.storage.getWebhookWorkloads(guild);
		const webhooks = webhookIds
			.map((webhookId) => {
				const count = clans.reduce((counter, clan) => {
					if (clan.webhook.id === webhookId) counter += 1;
					return counter;
				}, 0);
				return { webhookId, count };
			})
			.sort((a, b) => a.count - b.count);
		return webhooks.length ? webhooks[0] : null;
	}

	public async getWebhook(channel: TextChannel | NewsChannel) {
		const allWebhooks = await channel.fetchWebhooks();

		const estimated = await this.getWorkload(
			channel.guild.id,
			allWebhooks
				.filter((webhook) => webhook.channelId === channel.id && webhook.owner?.id === this.client.user!.id)
				.map((webhook) => webhook.id)
		);

		if (estimated && (estimated.count <= 6 || allWebhooks.size >= 10)) {
			this.client.logger.info(`Found existing webhook for ${channel.id}`, { label: 'WEBHOOK' });
			return allWebhooks.find((webhook) => webhook.id === estimated.webhookId)!;
		}

		if (allWebhooks.size >= 10) return null;

		const webhook = await channel
			.createWebhook({
				name: this.client.user!.username,
				avatar: this.client.user!.displayAvatarURL({ extension: 'png', size: 2048 })
			})
			.catch(() => null);
		this.client.logger.info(`Created new webhook for ${channel.id}`, { label: 'WEBHOOK' });
		return webhook;
	}

	public permissionsFor(channelId: string, permissions: PermissionsString[]) {
		const channel = this.getTextBasedChannel(channelId);
		if (channel) {
			if (
				channel.isThread() &&
				channel.permissionsFor(this.client.user!.id)!.has(permissions) &&
				this.hasWebhookPermission(channel.parent!)
			) {
				return { isThread: true, channel, parent: channel.parent! };
			}

			if (!channel.isThread() && channel.permissionsFor(this.client.user!)?.has(permissions) && this.hasWebhookPermission(channel)) {
				return { isThread: false, channel, parent: channel };
			}
		}

		return null;
	}

	private getTextBasedChannel(channelId: string) {
		const channel = this.client.channels.cache.get(channelId)!;
		if ((channel.isThread() && channel.parent) || channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildNews) {
			return channel;
		}
		return null;
	}

	private hasWebhookPermission(channel: TextChannel | NewsChannel) {
		return (
			channel.permissionsFor(this.client.user!.id)!.has(['ManageWebhooks', 'ViewChannel']) &&
			channel.permissionsFor(channel.guild.id)!.has(['UseExternalEmojis'])
		);
	}
}
