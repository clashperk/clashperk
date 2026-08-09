import { Collections } from '@app/constants';
import { TicketEntity, TicketPanelEntity } from '@app/entities';
import { CategoryChannel, TextChannel } from 'discord.js';
import { ObjectId } from 'mongodb';
import type { Client } from './client.js';

const REDIS_KEY = (channelId: string) => `ticket:autosleep:${channelId}`;

export class TicketHandler {
  public constructor(private readonly client: Client) {}

  public init() {
    setInterval(() => this.processSleepQueue(), 5 * 60 * 1000);
  }

  public async getPanel(guildId: string, name: string) {
    return this.client.db
      .collection<TicketPanelEntity>(Collections.TICKET_PANELS)
      .findOne({ guildId, name });
  }

  public async setAutoSleepCache(channelId: string, creatorId: string, autoSleepHours: number) {
    await this.client.redis.connection.set(REDIS_KEY(channelId), `${creatorId}:${autoSleepHours}`, {
      EX: autoSleepHours * 60 * 60
    });
  }

  public async resetAutoSleep(channelId: string, userId: string) {
    const raw = await this.client.redis.connection.get(REDIS_KEY(channelId));
    if (!raw) return;

    const [creatorId, hoursStr] = raw.split(':');
    if (creatorId !== userId) return;

    const hours = Number(hoursStr);
    await this.client.redis.connection.expire(REDIS_KEY(channelId), hours * 60 * 60);
  }

  private async processSleepQueue() {
    const tickets = await this.client.db
      .collection<TicketEntity>(Collections.TICKETS)
      .find({ status: 'open', autoSleepAt: { $lte: new Date() } })
      .toArray();

    for (const ticket of tickets) {
      const raw = await this.client.redis.connection.get(REDIS_KEY(ticket.channelId));

      if (raw) {
        // Creator replied — TTL was reset; sync DB autoSleepAt to match
        const hours = Number(raw.split(':')[1]);
        const ttl = await this.client.redis.connection.ttl(REDIS_KEY(ticket.channelId));
        await this.client.db.collection<TicketEntity>(Collections.TICKETS).updateOne(
          { _id: ticket._id },
          {
            $set: {
              autoSleepAt: new Date(Date.now() + (ttl > 0 ? ttl : hours * 60 * 60) * 1000),
              updatedAt: new Date()
            }
          }
        );
      } else {
        await this.autoSleepTicket(ticket).catch(() => null);
      }
    }
  }

  private async autoSleepTicket(ticket: TicketEntity) {
    const guild = this.client.guilds.cache.get(ticket.guildId);
    if (!guild) return;

    const channel = guild.channels.cache.get(ticket.channelId) as TextChannel | undefined;
    if (!channel) return;

    const panel = await this.client.db
      .collection<TicketPanelEntity>(Collections.TICKET_PANELS)
      .findOne({ _id: new ObjectId(ticket.panelId) });
    const btn = panel?.ticketTypes.find((t) => t.id === ticket.buttonId);

    await channel.permissionOverwrites
      .edit(ticket.creatorId, { SendMessages: false, ViewChannel: true })
      .catch(() => null);

    if (btn?.sleepCategoryId) {
      const sleepCat = guild.channels.cache.get(btn.sleepCategoryId) as CategoryChannel | undefined;
      if (sleepCat) await channel.setParent(sleepCat, { lockPermissions: false }).catch(() => null);
    }

    await this.client.db
      .collection<TicketEntity>(Collections.TICKETS)
      .updateOne(
        { _id: ticket._id },
        { $set: { status: 'sleep', autoSleepAt: undefined, updatedAt: new Date() } }
      );

    await channel
      .send({
        content: `Ticket automatically put to sleep — no reply from <@${ticket.creatorId}> in ${btn?.autoSleepHours ?? 24} hours.`
      })
      .catch(() => null);

    if (panel?.logChannels.statusChange) {
      const logCh = guild.channels.cache.get(panel.logChannels.statusChange) as
        | TextChannel
        | undefined;
      await logCh
        ?.send({
          embeds: [
            {
              title: 'Ticket Status Changed',
              color: 0xeffd5f,
              fields: [
                {
                  name: 'Ticket',
                  value: `#${String(ticket.count).padStart(4, '0')} <#${ticket.channelId}>`,
                  inline: true
                },
                { name: 'Changed by', value: 'Auto-sleep', inline: true },
                { name: 'Status', value: 'open → sleep', inline: true }
              ]
            }
          ]
        })
        .catch(() => null);
    }
  }
}
