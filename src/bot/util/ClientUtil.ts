import { ChannelType, NewsChannel, PermissionsString, TextChannel } from 'discord.js';
import Client from '../struct/Client.js';

export class ClientUtil {
	public constructor(private readonly client: Client) {}

	public hasPermissions(channelId: string, permissions: PermissionsString[]) {
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

	public getTextBasedChannel(channelId: string) {
		const channel = this.client.channels.cache.get(channelId)!;
		if ((channel.isThread() && channel.parent) || channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildNews) {
			return channel;
		}
		return null;
	}

	public hasWebhookPermission(channel: TextChannel | NewsChannel) {
		return (
			channel.permissionsFor(this.client.user!.id)!.has(['ManageWebhooks', 'ViewChannel']) &&
			channel.permissionsFor(channel.guild.id)!.has(['UseExternalEmojis'])
		);
	}
}
