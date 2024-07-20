import { BaseInteraction, Guild } from 'discord.js';
import { Collections } from '../util/constants.js';
import { Client } from './client-module.js';

export default class StatsHandler {
  public messages = new Map<string, NodeJS.Timeout>();

  public constructor(private readonly client: Client) {}

  private get key() {
    return new Date(Date.now() + 198e5).toISOString().slice(0, 10);
  }

  public async post() {
    if (this.client.isCustom() || !this.client.isPrimary()) return;

    const values = this.client.shard
      ? ((await this.client.shard.fetchClientValues('guilds.cache.size').catch(() => [0])) as number[])
      : [this.client.guilds.cache.size];
    const guilds = values.reduce((prev, curr) => prev + curr, 0);
    if (!guilds) return;

    const clans = await this.client.db.collection(Collections.CLAN_STORES).estimatedDocumentCount();
    const players = await this.client.db.collection(Collections.PLAYERS).estimatedDocumentCount();

    const collection = this.client.db.collection(Collections.BOT_STATS);
    await collection.updateOne({ name: 'GUILDS' }, { $set: { count: guilds } });
    await collection.updateOne({ name: 'PLAYERS' }, { $set: { count: players } });
    await collection.updateOne({ name: 'CLANS' }, { $set: { count: clans } });

    const res = await fetch(`https://top.gg/api/bots/${this.client.user!.id}/stats`, {
      headers: {
        'Authorization': process.env.DBL!,
        'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify({
        server_count: guilds,
        shard_count: this.client.shard?.count ?? 1
      })
    });

    const body = await res.json();
    if (!res.ok) {
      this.client.logger.error(body, { label: 'TOP.GG' });
    }
  }

  public message(id: string) {
    if (this.messages.has(id)) return null;
    this.messages.set(id, setTimeout(() => this.messages.delete(id), 60 * 60 * 1000).unref());

    return this.client.db.collection(Collections.BOT_GUILDS).updateOne(
      { guild: id },
      {
        $max: { updatedAt: new Date() },
        $min: { createdAt: new Date() },
        $inc: { usage: 0 }
      },
      { upsert: true }
    );
  }

  public async interactions(interaction: BaseInteraction<'cached'>, command: string) {
    await this.client.db.collection(Collections.BOT_INTERACTIONS).updateOne(
      { user: interaction.user.id, guild: interaction.guild.id },
      {
        $inc: { usage: 1 },
        $set: {
          locale: interaction.locale,
          guildLocale: interaction.guildLocale,
          lastUpdated: new Date()
        }
      },
      { upsert: true }
    );
    await this.client.db.collection(Collections.BOT_COMMANDS).updateOne({ command }, { $inc: { total: 1, uses: 1 } }, { upsert: true });
  }

  public historic(command: string) {
    return this.client.db.collection(Collections.BOT_USAGE).updateOne(
      { key: this.key },
      {
        $inc: {
          usage: 1,
          [`commands.${command}`]: 1
        },
        $set: {
          key: this.key
        },
        $min: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
  }

  public async commands(command: string) {
    await this.client.db.collection(Collections.BOT_STATS).updateOne({ name: 'COMMANDS_USED' }, { $inc: { count: 1 } }, { upsert: true });

    return this.historic(command);
  }

  public deletion() {
    return this.client.db.collection(Collections.BOT_GROWTH).updateOne(
      { key: this.key },
      {
        $inc: {
          addition: 0,
          deletion: 1,
          retention: 0
        },
        $set: {
          key: this.key
        },
        $min: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
  }

  public async addition(guild: string) {
    const old = await this.client.db.collection(Collections.BOT_GUILDS).countDocuments({ guild });

    return this.client.db.collection(Collections.BOT_GROWTH).updateOne(
      { key: this.key },
      {
        $inc: {
          addition: 1,
          deletion: 0,
          retention: old ? 1 : 0
        },
        $set: {
          key: this.key
        },
        $min: {
          createdAt: new Date()
        },
        $max: {
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
  }

  public users(interaction: BaseInteraction) {
    return this.client.db.collection(Collections.BOT_USERS).updateOne(
      { user: interaction.user.id },
      {
        $set: {
          user: interaction.user.id,
          username: interaction.user.username,
          displayName: interaction.user.displayName,
          locale: interaction.locale
        },
        $inc: { usage: 1 },
        $min: { createdAt: new Date() }
      },
      { upsert: true }
    );
  }

  public async localeSuggested(interaction: BaseInteraction) {
    if (['en-GB', 'en-US'].includes(interaction.locale)) return true;
    const user = await this.client.db.collection(Collections.BOT_USERS).findOneAndUpdate(
      { user: interaction.user.id },
      {
        $set: {
          suggestedAt: new Date()
        }
      },
      {
        returnDocument: 'before'
      }
    );
    if (!user) return true;
    return Boolean(user.suggestedAt && (user.suggestedAt.getTime() as number) + 3 * 24 * 60 * 60 * 1000 > Date.now());
  }

  public async featureSuggested(interaction: BaseInteraction) {
    const user = await this.client.db.collection(Collections.BOT_USERS).findOneAndUpdate(
      { user: interaction.user.id },
      {
        $set: {
          suggestedAt: new Date()
        }
      },
      {
        returnDocument: 'before'
      }
    );
    if (!user) return true;
    return Boolean(user.suggestedAt && (user.suggestedAt.getTime() as number) + 7 * 24 * 60 * 60 * 1000 > Date.now());
  }

  public guilds(guild: Guild, usage = 1) {
    return this.client.db.collection(Collections.BOT_GUILDS).updateOne(
      { guild: guild.id },
      {
        $set: {
          guild: guild.id,
          name: guild.name,
          locale: guild.preferredLocale,
          memberCount: guild.approximateMemberCount || guild.memberCount
        },
        $inc: { usage },
        $max: { updatedAt: new Date() },
        $min: { createdAt: new Date() }
      },
      { upsert: true }
    );
  }
}
