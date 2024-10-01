import { Collections, Settings } from '@app/constants';
import { PatreonMembersEntity } from '@app/entities';
import { BaseInteraction } from 'discord.js';
import { Collection, WithId } from 'mongodb';
import { Client } from './client.js';
import { timeoutSignal } from './http.js';

export const rewards = {
  bronze: '3705318',
  silver: '4742718',
  platinum: '21789215',
  gold: '5352215'
};

export const guildLimits: Record<string, number> = {
  [rewards.bronze]: 1,
  [rewards.silver]: 3,
  [rewards.platinum]: 5,
  [rewards.gold]: 10
};

export class PatreonHandler {
  private readonly collection: Collection<PatreonMembersEntity>;
  private readonly patrons = new Set<string>();

  public constructor(private readonly client: Client) {
    this.collection = this.client.db.collection(Collections.PATREON_MEMBERS);
    const watchStream = this.collection.watch([
      {
        $match: {
          operationType: { $in: ['insert', 'update', 'delete'] }
        }
      }
    ]);
    watchStream.on('change', async (change) => {
      if (['update', 'insert'].includes(change.operationType)) {
        await this.refresh();
      }
    });
  }

  public async init() {
    await this.refresh();
    await this.autoSyncSubscription(true);
    setInterval(() => this.autoSyncSubscription(false), 10 * 60 * 1000).unref();
  }

  public get(interaction: BaseInteraction | string): boolean {
    if (typeof interaction === 'string') return this.patrons.has(interaction);
    return this.patrons.has(interaction.guildId!);
  }

  public async findOne(userId: string) {
    return this.collection.findOne({ userId, active: true });
  }

  public async attachCustomBot(patronId: string, applicationId: string) {
    return this.collection.updateOne({ id: patronId }, { $set: { applicationId } });
  }

  public async detachCustomBot(patronId: string) {
    return this.collection.updateOne({ id: patronId }, { $unset: { applicationId: '' } });
  }

  public async findGuild(guildId: string) {
    return this.collection.findOne({ active: true, applicationId: { $exists: true }, guilds: { $elemMatch: { id: guildId } } });
  }

  public async refresh() {
    const patrons = await this.collection.find({ active: true }).toArray();
    this.patrons.clear(); // clear old user_id and guild_id

    for (const data of patrons) {
      if (data.userId) this.patrons.add(data.userId);

      for (const guild of data.guilds) {
        this.patrons.add(guild.id);
        if (this.client.settings.get(guild.id, Settings.CLAN_LIMIT, 2) !== guild.limit) {
          await this.client.settings.set(guild.id, Settings.CLAN_LIMIT, guild.limit);
        }
      }
    }
  }

  public async autoSyncSubscription(debug = false) {
    if (this.client.isCustom()) return null;
    if (this.client.shard?.ids[0] !== 0) return null;

    const res = await this.fetchAPI();
    if (!res) return null;
    if (debug) this.client.logger.info(`Patreon Handler Initialized.`, { label: 'PATREON' });

    const patrons = await this.collection.find().toArray();
    for (const patron of patrons) {
      const pledge = res.data.find((entry) => entry.relationships.user.data.id === patron.id) ?? null;
      await this.resyncPatron(patron, pledge);
    }
  }

  public async resyncPatron(patron: WithId<PatreonMembersEntity>, pledge: PatreonMember | null) {
    const rewardId: string | null = pledge?.relationships.currently_entitled_tiers.data[0]?.id ?? null;
    if (rewardId && patron.rewardId !== rewardId && guildLimits[rewardId]) {
      await this.collection.updateOne({ _id: patron._id }, { $set: { rewardId } });
      if (pledge?.attributes.patron_status === 'active_patron') {
        // eslint-disable-next-line
        for (const guild of (patron.guilds ?? []).slice(0, guildLimits[rewardId])) await this.restoreGuild(guild.id);
        // eslint-disable-next-line
        for (const guild of (patron.guilds ?? []).slice(guildLimits[rewardId])) await this.deleteGuild(guild.id);

        if (![rewards.gold, rewards.platinum].includes(rewardId)) {
          // if (patron.applicationId) await this.suspendService(patron.applicationId);
        }
      }
    }

    if (pledge && new Date(pledge.attributes.last_charge_date).getTime() >= patron.lastChargeDate.getTime()) {
      await this.collection.updateOne(
        { _id: patron._id },
        {
          $set: {
            lastChargeDate: new Date(pledge.attributes.last_charge_date)
          }
        }
      );
    }

    if (
      pledge &&
      !(
        pledge.attributes.lifetime_support_cents === patron.lifetimeSupport &&
        pledge.attributes.currently_entitled_amount_cents === patron.entitledAmount
      )
    ) {
      await this.collection.updateOne(
        { _id: patron._id },
        {
          $set: {
            entitledAmount: pledge.attributes.currently_entitled_amount_cents,
            lifetimeSupport: pledge.attributes.lifetime_support_cents
          }
        }
      );
    }

    // Resume Subscription
    if (!patron.active && (patron.declined || patron.cancelled) && pledge?.attributes.patron_status === 'active_patron') {
      await this.collection.updateOne({ id: patron.id }, { $set: { declined: false, active: true, cancelled: false } });
      // eslint-disable-next-line
      for (const guild of patron.guilds ?? []) await this.restoreGuild(guild.id);
      if (patron.applicationId) await this.client.customBotManager.resumeService(patron.applicationId);

      this.client.logger.info(`Subscription Resumed ${patron.username} (${patron.userId}/${patron.id})`, { label: 'PATRON' });
    }

    const isFormer = pledge?.attributes.patron_status === 'former_patron';
    const isDeclined = pledge?.attributes.patron_status === 'declined_patron';
    const canceled =
      (patron.active && isFormer) ||
      (patron.active && isDeclined && this.gracePeriodExpired(new Date(pledge.attributes.last_charge_date))) ||
      (patron.active && !pledge);

    // Cancel Subscription
    if (canceled) {
      await this.collection.updateOne({ id: patron.id }, { $set: { active: false, cancelled: isFormer, declined: isDeclined } });

      // eslint-disable-next-line
      for (const guild of patron.guilds ?? []) await this.deleteGuild(guild.id);
      if (patron.applicationId) await this.client.customBotManager.suspendService(patron.applicationId);

      this.client.logger.info(`Subscription Canceled ${patron.username} (${patron.userId}/${patron.id})`, { label: 'PATRON' });
    }
  }

  private gracePeriodExpired(date: Date) {
    return Date.now() - date.getTime() >= 3 * 24 * 60 * 60 * 1000;
  }

  private async restoreGuild(guildId: string) {
    await this.client.db.collection(Collections.CLAN_STORES).updateMany({ guild: guildId }, { $set: { active: true, patron: true } });

    const clans = await this.client.db.collection(Collections.CLAN_STORES).find({ guild: guildId }).toArray();
    for (const data of clans) {
      try {
        await this.client.shard!.broadcastEval(
          (client, data) => {
            if (client.guilds.cache.has(data.guild)) {
              // @ts-expect-error it exists
              client.rpcHandler.add(data._id.toString(), { tag: data.tag, guild: data.guild, op: 0 });
            }
          },
          { context: data }
        );
      } catch {
        if (this.client.guilds.cache.has(data.guild)) {
          await this.client.rpcHandler.add({ tag: data.tag, guild: data.guild });
        }
      }
    }
  }

  public async deleteGuild(guildId: string) {
    await this.client.settings.delete(guildId, Settings.CLAN_LIMIT);
    await this.client.db.collection(Collections.CLAN_STORES).updateMany({ guild: guildId }, { $set: { patron: false } });

    const clans = await this.client.db.collection(Collections.CLAN_STORES).find({ guild: guildId }).skip(2).toArray();
    for (const data of clans) {
      await this.client.db.collection(Collections.CLAN_STORES).updateOne({ _id: data._id }, { $set: { active: false } });
      await this.client.rpcHandler.delete({ tag: data.tag, guild: guildId });
    }
  }

  public async fetchAPI() {
    const query = new URLSearchParams({
      'page[size]': '1000',
      'fields[tier]': 'amount_cents,created_at',
      'include': 'user,currently_entitled_tiers',
      'fields[user]': 'social_connections,email,full_name,email,image_url',
      'fields[member]':
        'last_charge_status,last_charge_date,patron_status,email,pledge_relationship_start,currently_entitled_amount_cents,lifetime_support_cents'
    }).toString();

    const data = (await fetch(`https://www.patreon.com/api/oauth2/v2/campaigns/2589569/members?${query}`, {
      headers: { authorization: `Bearer ${process.env.PATREON_API}` },
      signal: timeoutSignal(10_000, 'GET /campaigns/:id/members')
    })
      .then((res) => res.json())
      .catch(() => null)) as { data: PatreonMember[]; included: PatreonUser[] } | null;

    return data?.data ? data : null;
  }
}

export interface PatreonMember {
  attributes: {
    email: string;
    last_charge_date: string;
    currently_entitled_amount_cents: number;
    lifetime_support_cents: number;
    pledge_relationship_start: string;
    patron_status: 'active_patron' | 'declined_patron' | 'former_patron' | null;
    last_charge_status: 'Paid' | 'Declined' | 'Deleted' | 'Pending' | 'Refunded' | 'Fraud' | 'Other' | null;
  };
  id: string;
  relationships: {
    currently_entitled_tiers: {
      data: {
        id: string;
        type: string;
      }[];
    };
    user: {
      data: {
        id: string;
        type: string;
      };
    };
  };
  type: string;
}

export interface PatreonUser {
  attributes: {
    full_name: string;
    image_url: string;
    social_connections?: {
      discord?: {
        user_id?: string;
      };
    };
    email: string;
  };
  id: string;
  type: string;
}
