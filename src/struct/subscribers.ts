import { Collections, COLOR_CODES, FeatureFlags, Settings } from '@app/constants';
import { PatreonMembersEntity } from '@app/entities';
import { captureException } from '@sentry/node';
import { EmbedBuilder, Interaction, WebhookClient } from 'discord.js';
import { Collection, WithId } from 'mongodb';
import { timeoutSignal } from './clash-client.js';
import { Client } from './client.js';

export const rewards = {
  bronze: '3705318',
  silver: '4742718',
  gold: '5352215',
  /** @deprecated */
  gold_deprecated: '21789215'
};

export enum CustomScopes {
  CUSTOM_BOT = 'discounted_custom_bot'
}

export enum CustomTiers {
  GIFTED = 'gifted',
  SPONSORED = 'sponsored',
  SPONSORED_CUSTOM_BOT = 'sponsored_custom_bot',
  LIFETIME = 'lifetime',
  LIFETIME_CUSTOM_BOT = 'lifetime_custom_bot'
}

export const customTierLimits = {
  [CustomTiers.GIFTED]: 3,
  [CustomTiers.SPONSORED]: 3,
  [CustomTiers.SPONSORED_CUSTOM_BOT]: 5,
  [CustomTiers.LIFETIME]: 10,
  [CustomTiers.LIFETIME_CUSTOM_BOT]: 10
} as const;

export const guildLimits: Record<string, number> = {
  [rewards.bronze]: 1,
  [rewards.silver]: 5,
  [rewards.gold]: 10,
  [rewards.gold_deprecated]: 5,
  ...customTierLimits
};

export class Subscribers {
  private readonly collection: Collection<PatreonMembersEntity>;
  private readonly patrons = new Map<string, { note: string }>();

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

  public has(interaction: Interaction<'cached'> | string): boolean {
    if (typeof interaction === 'string') return this.patrons.has(interaction);
    return this.patrons.has(interaction.guildId);
  }

  public get(interaction: Interaction<'cached'> | string) {
    if (typeof interaction === 'string') return this.patrons.get(interaction);
    return this.patrons.get(interaction.guildId);
  }

  public async findOne(userId: string) {
    return this.collection.findOne({ userId, active: true });
  }

  public async attachCustomBot(patronId: string, applicationId: string) {
    return this.collection.updateOne({ id: patronId }, { $set: { applicationId } });
  }

  public async detachCustomBot(patronId: string) {
    return this.collection.updateOne({ id: patronId }, { $unset: { applicationId: true } });
  }

  public async getMemberByGuildId(guildId: string) {
    return this.collection.findOne({
      active: true,
      applicationId: { $exists: true },
      guilds: { $elemMatch: { id: guildId } }
    });
  }

  public async refresh() {
    const patrons = await this.collection.find({ active: true }).toArray();
    this.patrons.clear(); // clear old user_id and guild_id

    for (const data of patrons) {
      if (data.userId) this.patrons.set(data.userId, { note: data.note });

      for (const guild of data.guilds) {
        this.patrons.set(guild.id, { note: data.note });

        const guildLimit = this.client.settings.get(guild.id, Settings.CLAN_LIMIT, 2);
        if (guildLimit !== guild.limit && this.client.guilds.cache.has(guild.id)) {
          await this.client.settings.set(guild.id, Settings.CLAN_LIMIT, guild.limit);
        }
      }
    }
  }

  public async autoSyncSubscription(debug = false) {
    if (this.client.isCustom()) return null;
    if (this.client.cluster.id !== 0) return null;

    const res = await this.fetchAPI();
    if (!res) return null;
    if (debug) this.client.logger.info(`Patreon Handler Initialized.`, { label: 'PATREON' });

    if (!this.client.isFeatureEnabled(FeatureFlags.AUTO_SYNC_PATREON, 'global')) {
      this.client.logger.info('Sync is disabled', { label: 'PATREON' });
      return;
    }

    const patrons = await this.collection.find().toArray();
    for (const patron of patrons) {
      if (patron.id === '00000000') continue;

      const pledge =
        res.data.find((entry) => entry.relationships.user.data.id === patron.id) ?? null;
      await this.resyncPatron(patron, pledge);
    }
  }

  public async resyncPatron(patron: WithId<PatreonMembersEntity>, pledge: PatreonMember | null) {
    const isLifetime = !!(pledge && Object.values(CustomTiers).includes(pledge.attributes.note));
    const isGifted = !!(pledge && pledge.attributes.is_gifted);
    const patronStatus = pledge
      ? (pledge.attributes.patron_status ?? 'unknown_status')
      : 'account_deleted';

    if (
      pledge &&
      !(
        pledge.attributes.campaign_lifetime_support_cents === patron.lifetimeSupport &&
        pledge.attributes.currently_entitled_amount_cents === patron.entitledAmount &&
        new Date(pledge.attributes.last_charge_date).getTime() ===
          patron.lastChargeDate.getTime() &&
        isGifted === patron.isGifted &&
        isLifetime === patron.isLifetime &&
        patron.note === pledge.attributes.note &&
        patron.email === pledge.attributes.email &&
        patronStatus === patron.status
      )
    ) {
      await this.collection.updateOne(
        { _id: patron._id },
        {
          $set: {
            lastChargeDate: new Date(pledge.attributes.last_charge_date),
            entitledAmount: pledge.attributes.currently_entitled_amount_cents,
            lifetimeSupport: pledge.attributes.campaign_lifetime_support_cents,
            isGifted,
            isLifetime,
            email: pledge.attributes.email,
            note: pledge.attributes.note,
            status: patronStatus
          }
        }
      );
      this.client.logger.info(
        `Patreon Data Synced ${patron.username} (${patron.userId}/${patron.id})`,
        {
          label: 'PATREON'
        }
      );
    }

    if (!pledge && patron.status !== 'account_deleted') {
      await this.collection.updateOne({ _id: patron._id }, { $set: { status: patronStatus } });
      this.client.logger.info(
        `Patreon Data Synced (deleted) ${patron.username} (${patron.userId}/${patron.id})`,
        {
          label: 'PATREON'
        }
      );
      await this.sendWebhook(patron, {
        label: 'Patreon Account Deleted',
        color: COLOR_CODES.RED,
        status: patronStatus
      });
    }

    const rewardId = pledge?.relationships.currently_entitled_tiers.data[0]?.id;

    // Downgrade Subscription
    if (pledge && rewardId && patron.rewardId !== rewardId && guildLimits[rewardId]) {
      await this.collection.updateOne({ _id: patron._id }, { $set: { rewardId } });

      if (pledge.attributes.patron_status === 'active_patron') {
        for (const guild of (patron.guilds ?? []).slice(0, guildLimits[rewardId]))
          await this.restoreGuild(guild.id);
        for (const guild of (patron.guilds ?? []).slice(guildLimits[rewardId]))
          await this.deleteGuild(guild.id, patron.id);

        if (
          ![rewards.gold, rewards.gold_deprecated].includes(rewardId) &&
          ![
            CustomTiers.LIFETIME_CUSTOM_BOT,
            CustomTiers.SPONSORED_CUSTOM_BOT,
            CustomScopes.CUSTOM_BOT
          ].includes(patron.note) &&
          patron.applicationId
        ) {
          await this.client.customBotManager.suspendService(patron.applicationId);
        }

        this.client.logger.info(
          `Subscription Updated ${patron.username} (${patron.userId}/${patron.id})`,
          {
            label: 'PATRON'
          }
        );
        await this.sendWebhook(patron, {
          label: 'Subscription Updated',
          color: COLOR_CODES.YELLOW,
          status: patronStatus
        });
      }
    }

    const isActive = pledge?.attributes.patron_status === 'active_patron' || isGifted || isLifetime;

    // Resume Subscription
    if (!patron.active && isActive) {
      await this.collection.updateOne(
        { id: patron.id },
        { $set: { declined: false, active: true, cancelled: false } }
      );

      for (const guild of patron.guilds ?? []) await this.restoreGuild(guild.id);
      if (patron.applicationId)
        await this.client.customBotManager.resumeService(patron.applicationId);

      this.client.logger.info(
        `Subscription Resumed ${patron.username} (${patron.userId}/${patron.id})`,
        {
          label: 'PATRON'
        }
      );

      await this.sendWebhook(patron, {
        label: 'Subscription Resumed',
        color: COLOR_CODES.GREEN,
        status: patronStatus
      });
    }

    const isFormer = pledge?.attributes.patron_status === 'former_patron' && !isActive;
    const isDeclined = pledge?.attributes.patron_status === 'declined_patron' && !isActive;
    const isUnknown = !pledge?.attributes.patron_status && !isActive;

    const canceled =
      (patron.active && isFormer) ||
      (patron.active && isUnknown) ||
      (patron.active &&
        isDeclined &&
        this.gracePeriodExpired(new Date(pledge.attributes.last_charge_date))) ||
      (patron.active && !pledge && patron.id !== '00000000');

    // Cancel Subscription
    if (canceled) {
      await this.collection.updateOne(
        { id: patron.id },
        { $set: { active: false, cancelled: isFormer, declined: isDeclined, status: patronStatus } }
      );

      for (const guild of patron.guilds ?? []) await this.deleteGuild(guild.id, patron.id);
      if (patron.applicationId)
        await this.client.customBotManager.suspendService(patron.applicationId);

      this.client.logger.info(
        `Subscription Canceled ${patron.username} (${patron.userId}/${patron.id})`,
        {
          label: 'PATRON'
        }
      );

      await this.sendWebhook(patron, {
        label: 'Subscription Canceled',
        color: COLOR_CODES.RED,
        status: patronStatus
      });

      // const user = await this.client.users.fetch(patron.userId);
      // if (embed) await user.send({ embeds: [embed] });
    }
  }

  private gracePeriodExpired(date: Date) {
    return Date.now() - date.getTime() >= 3 * 24 * 60 * 60 * 1000;
  }

  private async restoreGuild(guildId: string) {
    await this.client.db
      .collection(Collections.CLAN_STORES)
      .updateMany({ guild: guildId }, { $set: { active: true, patron: true } });

    const clans = await this.client.db
      .collection(Collections.CLAN_STORES)
      .find({ guild: guildId })
      .toArray();
    for (const data of clans) {
      try {
        await this.client.cluster.broadcastEval(
          (client, data) => {
            if (client.guilds.cache.has(data.guild)) {
              // @ts-expect-error it exists
              client.enqueuer.add(data._id.toString(), { tag: data.tag, guild: data.guild, op: 0 });
            }
          },
          { context: data }
        );
      } catch {
        if (this.client.guilds.cache.has(data.guild)) {
          await this.client.enqueuer.add({ tag: data.tag, guild: data.guild });
        }
      }
    }
  }

  public async deleteGuild(guildId: string, patronId: string) {
    const otherSubscription = await this.collection.findOne({
      'active': true,
      'id': { $ne: patronId },
      'guilds.id': guildId
    });
    if (otherSubscription) return;

    await this.client.settings.delete(guildId, Settings.CLAN_LIMIT);
    await this.client.db
      .collection(Collections.CLAN_STORES)
      .updateMany({ guild: guildId }, { $set: { patron: false } });

    const clans = await this.client.db
      .collection(Collections.CLAN_STORES)
      .find({ guild: guildId })
      .skip(2)
      .toArray();
    for (const data of clans) {
      await this.client.db
        .collection(Collections.CLAN_STORES)
        .updateOne({ _id: data._id }, { $set: { active: false } });
      await this.client.enqueuer.delete({ tag: data.tag, guild: guildId });
    }
  }

  public async fetchAPI() {
    const query = new URLSearchParams({
      'page[size]': '1000',
      'fields[tier]': 'amount_cents,created_at',
      'include': 'user,currently_entitled_tiers',
      'fields[user]': 'social_connections,email,full_name,email,image_url',
      'fields[member]':
        'last_charge_status,last_charge_date,patron_status,email,pledge_relationship_start,currently_entitled_amount_cents,campaign_lifetime_support_cents,is_gifted,note'
    }).toString();

    try {
      const res = await fetch(
        `https://www.patreon.com/api/oauth2/v2/campaigns/2589569/members?${query}`,
        {
          headers: { authorization: `Bearer ${process.env.PATREON_API_KEY}` },
          signal: timeoutSignal(10_000, 'GET /campaigns/:id/members')
        }
      );
      const result = (await res.json()) as PatreonApiOutput;
      return result?.data ? result : null;
    } catch (error) {
      this.client.logger.log('Failed to fetch Patreon API', { label: 'PATREON' });
      this.client.logger.error(error, { label: 'PATREON' });
      return null;
    }
  }

  public async sendWebhook(
    patron: PatreonMembersEntity,
    { status, label, color }: { status: string; label: string; color: number }
  ) {
    try {
      const webhook = new WebhookClient({
        url: this.client.settings.get<string>('global', Settings.DEPLOYMENT_WEBHOOK_URL, null)
      });

      const embed = new EmbedBuilder()
        .setTitle(`${patron.username} (${patron.userId})`)
        .setColor(color)
        .setDescription(
          [
            `<@${patron.userId}>`,
            '',
            `**Patron**`,
            `${patron.name} (${patron.id})`,
            '',
            `**Status:** [${status}](https://www.patreon.com/members?query=${encodeURIComponent(patron.email || patron.name)})`,
            `**Pledge:** $${(patron.entitledAmount / 100).toFixed(2)}`,
            `**Lifetime:** $${(patron.lifetimeSupport / 100).toFixed(2)}`,
            `**Last Charged:** ${patron.lastChargeDate.toUTCString()}`,
            `**Is Gifted:** ${patron.isGifted}`,
            `**Is Lifetime:** ${patron.isLifetime}`,
            `**Bot ID:** ${patron.applicationId ?? 'N/A'}`,
            `**Note:** ${patron.note || 'N/A'}`
          ].join('\n')
        )
        .setFooter({ text: label })
        .setTimestamp();

      await webhook.send({ embeds: [embed] });

      // const rest = new REST({ version: '10' }).setToken(process.env.MAIN_DISCORD_TOKEN!);
      // const dmChannel = await rest.post(Routes.userChannels(), {
      //   body: { recipient_id: patron.userId }
      // });
      // await rest.post(Routes.channelMessages((dmChannel as Record<string, string>).id), {
      //   body: { embeds: [embed.toJSON()] }
      // });

      return embed;
    } catch (error) {
      captureException(error);
      this.client.logger.error(error, { label: 'Subscriber' });
      return null;
    }
  }
}

export interface PatreonMember {
  attributes: {
    email: string;
    last_charge_date: string;
    currently_entitled_amount_cents: number;
    is_gifted: boolean;
    note: CustomTiers;
    campaign_lifetime_support_cents: number;
    pledge_relationship_start: string;
    patron_status: 'active_patron' | 'declined_patron' | 'former_patron' | 'account_deleted' | null;
    last_charge_status:
      | 'Paid'
      | 'Declined'
      | 'Deleted'
      | 'Pending'
      | 'Refunded'
      | 'Fraud'
      | 'Other'
      | null;
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

export interface PatreonApiOutput {
  data: PatreonMember[];
  included: PatreonUser[];
}
