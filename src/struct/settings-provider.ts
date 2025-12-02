import { Collections, FeatureFlags, Settings as SettingsEnum } from '@app/constants';
import { FeatureFlagsEntity } from '@app/entities';
import { Guild } from 'discord.js';
import { Collection } from 'mongodb';
import { unique } from 'radash';
import { Client } from './client.js';

export class SettingsProvider {
  private readonly settings = new Map();
  private flags = new Map<string, FeatureFlagsEntity>();
  protected settingsCollection: Collection<Settings>;
  protected featureFlagsCollection: Collection<FeatureFlagsEntity>;

  public constructor(private client: Client) {
    this.settingsCollection = client.db.collection(Collections.SETTINGS);
    this.featureFlagsCollection = client.db.collection(Collections.FEATURE_FLAGS);

    const watchStream = this.settingsCollection.watch(
      [
        {
          $match: {
            operationType: { $in: ['insert', 'update', 'delete'] }
          }
        }
      ],
      { fullDocument: 'updateLookup' }
    );
    watchStream.on('change', (change) => {
      if (change.operationType === 'insert' || change.operationType === 'update') {
        this.settings.set(change.fullDocument!.guildId, change.fullDocument);
      }
    });

    this.featureFlagsCollection
      .watch(
        [
          {
            $match: {
              operationType: { $in: ['insert', 'update', 'delete'] }
            }
          }
        ],
        { fullDocument: 'updateLookup' }
      )
      .on('change', (change) => {
        if (change.operationType === 'insert' || change.operationType === 'update') {
          this.flags.set(change.fullDocument!.key as string, change.fullDocument!);
        }
        if (change.operationType === 'delete') {
          this.flags.delete(change.documentKey.key);
        }
      });
  }

  public isFeatureEnabled(flagKey: FeatureFlags, distinctId: string | 'global') {
    const flag = this.flags.get(flagKey);
    if (!flag) return false;

    if (distinctId === 'global') {
      return flag.enabled;
    }

    if (flag.limited) {
      return flag.guildIds.includes(distinctId);
    }

    return flag.enabled;
  }

  public async init({ globalOnly }: { globalOnly: boolean }) {
    const cursor = this.settingsCollection.find(
      globalOnly
        ? { guildId: 'global' }
        : {
            guildId: { $in: this.client.guilds.cache.map((guild) => guild.id) }
          },
      { projection: { _id: 0 } }
    );

    for await (const data of cursor) {
      this.settings.set(data.guildId, data);
    }

    if (globalOnly) {
      const cursor = this.featureFlagsCollection.find({}, { projection: { _id: 0 } });
      for await (const data of cursor) {
        this.flags.set(data.key, data);
      }
    }
  }

  public async loadGuild(guildId: string) {
    const cursor = this.settingsCollection.find({ guildId }, { projection: { _id: 0 } });

    for await (const data of cursor) {
      this.settings.set(data.guildId, data);
    }
  }

  public async addToWhitelist(
    guild: string | Guild,
    {
      userOrRoleId,
      isRole,
      commandId
    }: { userOrRoleId: string; isRole: boolean; commandId: string }
  ) {
    const guildId = (this.constructor as typeof SettingsProvider).guildId(guild);
    const record = this.settings.get(guildId) || {};

    const whiteList = (record[SettingsEnum.COMMAND_WHITELIST] || []) as {
      key: string;
      userOrRoleId: string;
      commandId: string;
      isRole: boolean;
    }[];

    whiteList.push({
      key: `${userOrRoleId}-${commandId}`,
      userOrRoleId,
      commandId,
      isRole
    });

    record[SettingsEnum.COMMAND_WHITELIST] = unique(whiteList, (list) => list.key);

    this.settings.set(guildId, record);
    return this.settingsCollection.updateOne(
      { guildId },
      { $set: { [SettingsEnum.COMMAND_WHITELIST]: whiteList } },
      { upsert: true }
    );
  }

  public async clearWhitelist(
    guild: string | Guild,
    { userOrRoleId, commandId }: { userOrRoleId: string; commandId: string }
  ) {
    const guildId = (this.constructor as typeof SettingsProvider).guildId(guild);
    const record = this.settings.get(guildId) || {};

    const whiteList = (record[SettingsEnum.COMMAND_WHITELIST] || []) as {
      key: string;
      userOrRoleId: string;
      commandId: string;
      isRole: boolean;
    }[];

    const key = `${userOrRoleId}-${commandId}`;
    const filtered = whiteList.filter((list) => list.key !== key);
    record[SettingsEnum.COMMAND_WHITELIST] = filtered;

    this.settings.set(guildId, record);
    return this.settingsCollection.updateOne(
      { guildId },
      { $set: { [SettingsEnum.COMMAND_WHITELIST]: filtered } }
    );
  }

  public get<T>(guild: string | Guild, key: string, defaultValue?: any): T {
    const guildId = (this.constructor as typeof SettingsProvider).guildId(guild);
    if (this.settings.has(guildId)) {
      const value = this.settings.get(guildId)[key];
      return value == null ? defaultValue : value;
    }

    return defaultValue;
  }

  public async set(guild: string | Guild, key: string, value: any) {
    const guildId = (this.constructor as typeof SettingsProvider).guildId(guild);
    const data = this.settings.get(guildId) || {};
    data[key] = value;
    this.settings.set(guildId, data);
    return this.settingsCollection.updateOne(
      { guildId },
      { $set: { [key]: value } },
      { upsert: true }
    );
  }

  public async push(guild: string | Guild, key: string, items: string[]) {
    const guildId = (this.constructor as typeof SettingsProvider).guildId(guild);
    const record = this.settings.get(guildId) || {};

    let value = record[key] || [];
    if (Array.isArray(value)) value = value.concat(items);
    else if (value) value = [value, ...items];
    else value = items;

    record[key] = unique(value);

    this.settings.set(guildId, record);
    return this.settingsCollection.updateOne(
      { guildId },
      { $set: { [key]: value } },
      { upsert: true }
    );
  }

  public async delete(guild: string | Guild, key: string) {
    const guildId = (this.constructor as typeof SettingsProvider).guildId(guild);
    const data = this.settings.get(guildId) || {};
    delete data[key];

    return this.settingsCollection.updateOne({ guildId }, { $unset: { [key]: '' } });
  }

  public async clear(guild: string | Guild) {
    const guildId = (this.constructor as typeof SettingsProvider).guildId(guild);
    this.settings.delete(guildId);
    return this.settingsCollection.deleteOne({ guildId });
  }

  public flatten() {
    return this.settings.values();
  }

  public hasCustomBot(guild: string | Guild) {
    return this.get(guild, SettingsEnum.HAS_CUSTOM_BOT, false);
  }

  public setCustomBot(guild: string | Guild) {
    return this.set(guild, SettingsEnum.HAS_CUSTOM_BOT, true);
  }

  public deleteCustomBot(guild: string | Guild) {
    return this.delete(guild, SettingsEnum.HAS_CUSTOM_BOT);
  }

  private static guildId(guild: string | Guild) {
    if (guild instanceof Guild) return guild.id;
    if (guild === 'global' || guild === null) return 'global';
    if (/^\d+$/.test(guild)) return guild;
    throw new TypeError(
      'Invalid guild specified. Must be a Guild instance, guild ID, "global", or null.'
    );
  }
}

interface Settings {
  guildId: string;
}
