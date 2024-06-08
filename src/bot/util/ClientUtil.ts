import {
  ActivityType,
  ChannelType,
  ForumChannel,
  GuildMember,
  MediaChannel,
  NewsChannel,
  PermissionsBitField,
  PermissionsString,
  TextChannel
} from 'discord.js';
import jwt from 'jsonwebtoken';
import Client from '../struct/Client.js';
import { Settings } from './Constants.js';

export class ClientUtil {
  public constructor(private readonly client: Client) {}

  public async setPresence() {
    if (this.client.isCustom()) return null;
    if (this.client.inMaintenance) return null;

    let guilds = 0;

    try {
      const values = (await this.client.shard?.broadcastEval((client) => client.guilds.cache.size)) ?? [this.client.guilds.cache.size];
      guilds = values.reduce((acc, val) => acc + val, 0);
    } catch {}

    if (!guilds) return null;

    return this.client.user?.setPresence({
      status: 'online',
      activities: [
        {
          type: ActivityType.Custom,
          name: `Watching ${guilds.toLocaleString()} servers`
        }
      ]
    });
  }

  public setMaintenanceBreak(cleared = false) {
    if (cleared) return this.client.user!.setPresence({ status: 'online', activities: [] });

    return this.client.user?.setPresence({
      status: 'online',
      activities: [
        {
          type: ActivityType.Custom,
          name: 'Maintenance Break!'
        }
      ]
    });
  }

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
    const channel = this.client.channels.cache.get(channelId);
    if (channel) {
      if (
        (channel.isThread() && channel.parent) ||
        channel.type === ChannelType.GuildText ||
        channel.type === ChannelType.GuildAnnouncement
      ) {
        return channel;
      }
    }
    return null;
  }

  public createToken({ userId, guildId }: { userId: string; guildId: string }) {
    const token = jwt.sign({ user_id: userId, guild_id: guildId }, process.env.JWT_DECODE_SECRET!, {
      expiresIn: '6h'
    });

    return token;
  }

  public createJWT() {
    const token = jwt.sign({ scopes: ['read'], roles: ['admin'] }, process.env.JWT_SECRET!, {
      expiresIn: '6h'
    });

    return token;
  }

  public isManager(member: GuildMember, roleKey?: string) {
    if (this.client.isOwner(member.user)) return true;
    const roleId = this.client.settings.get<string>(member.guild, Settings.MANAGER_ROLE, null);
    const roleOverrides = roleKey ? this.client.settings.get<string[] | string>(member.guild, roleKey, []) : null;
    return (
      member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
      member.roles.cache.has(roleId) ||
      Boolean(roleOverrides && member.roles.cache.hasAny(...roleOverrides))
    );
  }

  public hasWebhookPermission(channel: TextChannel | NewsChannel | ForumChannel | MediaChannel) {
    return channel.permissionsFor(this.client.user!.id)!.has(['ManageWebhooks', 'ViewChannel']);
  }
}
