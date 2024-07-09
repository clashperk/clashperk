import { Guild } from 'discord.js';
import { Collection, Db } from 'mongodb';
import { unique } from 'radash';
import { Collections, Settings as SettingsEnum } from '../util/_constants.js';

export default class SettingsProvider {
  protected db: Collection<Settings>;
  private readonly settings = new Map();

  public constructor(db: Db) {
    this.db = db.collection(Collections.SETTINGS);

    const watchStream = this.db.watch(
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
  }

  public async init() {
    const collection = await this.db.find({}, { projection: { _id: 0 } }).toArray();
    for (const data of collection) {
      this.settings.set(data.guildId, data);
    }
  }

  public async addToWhiteList(
    guild: string | Guild,
    { userOrRoleId, isRole, commandId }: { userOrRoleId: string; isRole: boolean; commandId: string }
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
    return this.db.updateOne({ guildId }, { $set: { [SettingsEnum.COMMAND_WHITELIST]: whiteList } }, { upsert: true });
  }

  public async removeFromWhiteList(guild: string | Guild, { userOrRoleId, commandId }: { userOrRoleId: string; commandId: string }) {
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
    return this.db.updateOne({ guildId }, { $set: { [SettingsEnum.COMMAND_WHITELIST]: filtered } });
  }

  public get<T>(guild: string | Guild, key: string, defaultValue?: any): T {
    const guildId = (this.constructor as typeof SettingsProvider).guildId(guild);
    if (this.settings.has(guildId)) {
      const value = this.settings.get(guildId)[key];
      // eslint-disable-next-line
      return value == null ? defaultValue : value;
    }

    return defaultValue;
  }

  public async set(guild: string | Guild, key: string, value: any) {
    const guildId = (this.constructor as typeof SettingsProvider).guildId(guild);
    const data = this.settings.get(guildId) || {};
    data[key] = value;
    this.settings.set(guildId, data);
    return this.db.updateOne({ guildId }, { $set: { [key]: value } }, { upsert: true });
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
    return this.db.updateOne({ guildId }, { $set: { [key]: value } }, { upsert: true });
  }

  public async delete(guild: string | Guild, key: string) {
    const guildId = (this.constructor as typeof SettingsProvider).guildId(guild);
    const data = this.settings.get(guildId) || {};
    delete data[key]; // eslint-disable-line

    return this.db.updateOne({ guildId }, { $unset: { [key]: '' } });
  }

  public async clear(guild: string | Guild) {
    const guildId = (this.constructor as typeof SettingsProvider).guildId(guild);
    this.settings.delete(guildId);
    return this.db.deleteOne({ guildId });
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
    if (guild === 'global' || guild === null) return 'global'; // eslint-disable-line
    if (/^\d+$/.test(guild)) return guild;
    throw new TypeError('Invalid guild specified. Must be a Guild instance, guild ID, "global", or null.');
  }
}

interface Settings {
  guildId: string;
}
