import { Collections, Flags, INACTIVE_GUILD_DURATION } from '@app/constants';
import { ClanLogsEntity, ClanStoresEntity, FlagAlertLogsEntity } from '@app/entities';
import { captureException } from '@sentry/node';
import { Collection } from 'discord.js';
import { inspect } from 'node:util';
import { Client } from '../struct/client.js';
import { Queue } from '../struct/queue.js';
import { AutoBoardLog } from './auto-board-log.js';
import { CapitalLog } from './capital-log.js';
import { ClanEmbedLog } from './clan-embed-log.js';
import { ClanGamesLog } from './clan-games-log.js';
import { ClanLog } from './clan-log.js';
import { ClanWarLog } from './clan-war-log.js';
import { DonationLog } from './donation-log.js';
import { FlagAlertLog } from './flag-alert-log.js';
import { LastSeenLog } from './last-seen-log.js';
import { RankedBattleLog } from './ranked-battle-log.js';
import { LegendLog } from './legend-log.js';
import { MaintenanceLog } from './maintenance-log.js';

const REDIS_PUB_SUB_CHANNEL = 'upstream_feed';

export class Enqueuer {
  public cached = new Collection<string, Cached[]>();

  private paused = Boolean(false);
  private queue = new Queue();

  public flagAlertLog = new FlagAlertLog(this);
  private watching = false;

  private autoBoardLog = new AutoBoardLog(this);
  private maintenanceLog = new MaintenanceLog(this);

  private capitalLog = new CapitalLog(this);
  private clanEmbedLog = new ClanEmbedLog(this);
  private clanGamesLog = new ClanGamesLog(this);
  private clanLog = new ClanLog(this);
  private clanWarLog = new ClanWarLog(this);
  private donationLog = new DonationLog(this);
  private lastSeenLog = new LastSeenLog(this);
  private legendLog = new LegendLog(this);
  private rankedBattleLog = new RankedBattleLog(this);

  public constructor(public readonly client: Client) {
    this.maintenanceLog.init();
    this.paused = Boolean(false);
  }

  public pause(forced = false, ms = 5 * 60 * 1000) {
    if (this.paused) return this.paused;
    this.paused = Boolean(true);
    if (forced) setTimeout(() => (this.paused = Boolean(false)), ms);
    return this.paused;
  }

  private async broadcast() {
    await this.client.redis.subscriber.subscribe(REDIS_PUB_SUB_CHANNEL, async (message) => {
      const data = JSON.parse(message);

      const clanTag = data.tag || data.clanTag;
      if (this.paused || !this.cached.has(clanTag)) return;

      if (this.queue.remaining >= 2000) {
        this.client.logger.warn(
          `Queue is full (${this.queue.remaining}), skipping log processing...`,
          {
            label: 'Enqueuer'
          }
        );
        return;
      }

      await this.queue.wait();
      try {
        switch (data.op) {
          case Flags.DONATION_LOG:
            break;
          case Flags.CLAN_FEED_LOG:
            await Promise.all([
              this.flagAlertLog.exec(data.tag, data),
              this.clanLog.exec(data.tag, data)
            ]);
            this.client.rolesManager.exec(data.tag, data);
            break;
          case Flags.CLAN_EMBED_LOG:
            break;
          case Flags.CLAN_GAMES_LOG:
            await this.clanGamesLog.exec(data.tag, data);
            break;
          case Flags.CLAN_EVENT_LOG:
            await this.clanLog.exec(data.tag, data);
            break;
          case Flags.TOWN_HALL_LOG:
            await this.clanLog.exec(data.tag, data);
            break;
          case Flags.PLAYER_FEED_LOG:
            await this.clanLog.exec(data.tag, data);
            break;
          case Flags.CLAN_WAR_LOG:
            await this.clanWarLog.exec(data.clan.tag, data);
            this.client.rolesManager.exec(data.tag, data);
            break;
          case Flags.DONATION_LOG_V2:
            await this.clanLog.exec(data.clan.tag, data);
            break;
          case Flags.CAPITAL_LOG:
            await this.clanLog.exec(data.tag, data);
            break;
          default:
            break;
        }
      } catch (error) {
        console.error(inspect(error, { depth: Infinity }));
        captureException(error);
      } finally {
        this.queue.shift();
      }
    });

    return this.client.redis.publisher.publish('connect', JSON.stringify({}));
  }

  private async _loadClans(tag?: string) {
    const result = await this.client.db
      .collection(Collections.CLAN_STORES)
      .aggregate<AggregatedResult>([
        {
          $match: {
            guild: { $in: this.client.guilds.cache.map((guild) => guild.id) },
            paused: false,
            ...activeGuildFilter(),
            ...(tag ? { tag } : {})
          }
        },
        {
          $group: {
            _id: '$tag',
            clans: {
              $push: {
                _id: { $toString: '$_id' },
                tag: '$tag',
                guild: '$guild'
              }
            }
          }
        }
      ])
      .toArray();

    for (const { _id, clans } of result) this.cached.set(_id, clans);
  }

  public async init() {
    if (this.maintenanceLog.inMaintenance) return;

    await this._loadClans();

    await this.capitalLog.init();
    await this.clanEmbedLog.init();
    await this.clanGamesLog.init();
    await this.clanWarLog.init();
    await this.donationLog.init();
    await this.lastSeenLog.init();
    await this.rankedBattleLog.init();
    await this.clanLog.init();
    await this.legendLog.init();

    await this.autoBoardLog.init();
    await this.flagAlertLog.init();

    await this.broadcast();
    // init runs again after every maintenance break; the change streams must open once.
    if (this.watching) return;
    this.watching = true;
    this.watchClanLogs();
    this.watchClanStores();
    this.watchFlagAlertLogs();
  }

  /** Flag alert logs set up outside this bot (e.g. the web dashboard) reload like `/setup server-logs`. */
  private watchFlagAlertLogs() {
    const settingFields = ['channelId', 'roleId', 'useAutoRole'];
    const changed = settingFields.flatMap((field) => [
      { [`updateDescription.updatedFields.${field}`]: { $exists: true } },
      { 'updateDescription.removedFields': field }
    ]);

    this.client.changeStreams.on<FlagAlertLogsEntity>(
      Collections.FLAG_ALERT_LOGS,
      {
        $or: [
          { operationType: { $in: ['insert', 'replace', 'delete'] } },
          { operationType: 'update', $or: changed }
        ]
      },
      async (change) => {
        if (!('documentKey' in change)) return;
        if (change.operationType === 'delete') {
          const id = change.documentKey._id.toHexString();
          const cache = this.flagAlertLog.cached.find((c) => c._id === id);
          if (cache) this.flagAlertLog.del(cache.guildId);
          return;
        }
        const guildId = change.fullDocument?.guildId;
        if (guildId && this.client.guilds.cache.has(guildId)) await this.flagAlertLog.add(guildId);
      }
    );
  }

  /**
   * Logs set up outside this bot (e.g. the web dashboard) reload like `/setup clan-logs` does.
   * Only setting changes count; the bot's own `messageId`/`lastPostedAt` writes are ignored.
   */
  private watchClanLogs() {
    const settingFields = ['channelId', 'isEnabled', 'roleId', 'color', 'metadata'];
    const changed = settingFields.flatMap((field) => [
      { [`updateDescription.updatedFields.${field}`]: { $exists: true } },
      { 'updateDescription.removedFields': field }
    ]);

    this.client.changeStreams.on<ClanLogsEntity>(
      Collections.CLAN_LOGS,
      {
        $or: [
          { operationType: { $in: ['insert', 'replace', 'delete'] } },
          { operationType: 'update', $or: changed }
        ]
      },
      async (change) => {
        if (!('documentKey' in change)) return;
        this.deleteLog(change.documentKey._id.toHexString());
        if (change.operationType === 'delete' || !change.fullDocument) return;

        const { guildId, clanTag } = change.fullDocument;
        await this.add({ guild: guildId, tag: clanTag });
      }
    );
  }

  /** Clans added or removed outside this bot (e.g. the web dashboard) start or stop like `/setup clan`. */
  private watchClanStores() {
    this.client.changeStreams.on<ClanStoresEntity>(
      Collections.CLAN_STORES,
      { operationType: { $in: ['insert', 'delete'] } },
      async (change) => {
        if (change.operationType === 'insert') {
          const { tag, guild } = change.fullDocument;
          return await this.add({ tag, guild });
        }
        if (change.operationType !== 'delete') return;
        // A delete carries only the ID; the cache knows which clan and server it was.
        const id = change.documentKey._id.toHexString();
        const clan = [...this.cached.values()].flat().find((c) => c._id === id);
        if (clan) await this.delete({ tag: clan.tag, guild: clan.guild });
      }
    );
  }

  public async add(data: { tag: string; guild: string }) {
    if (!this.client.guilds.cache.has(data.guild)) return;

    await this.client.db
      .collection(Collections.CLAN_STORES)
      .updateMany({ guild: data.guild, tag: data.tag }, { $set: { lastExecution: new Date() } });

    const [result] = await this.client.db
      .collection(Collections.CLAN_STORES)
      .aggregate<{ tag: string; lastRan?: string; uniqueId: number }>([
        {
          $match: {
            tag: data.tag,
            paused: false
          }
        },
        {
          $group: {
            _id: '$tag',
            uniqueId: {
              $max: '$uniqueId'
            },
            lastRan: {
              $max: '$lastRan'
            }
          }
        },
        {
          $set: {
            tag: '$_id'
          }
        },
        {
          $unset: '_id'
        }
      ])
      .toArray();

    await this.addLog(data.guild);

    if (result) {
      const clan = {
        tag: result.tag,
        lastRan: result.lastRan,
        uniqueId: result.uniqueId
      };

      await this._loadClans(data.tag);
      await this.client.redis.publisher.publish('clan_added', JSON.stringify(clan));
    } else {
      this.cached.delete(data.tag);
    }
  }

  public async delete(data: { tag: string; guild: string }) {
    const clans = await this.client.db
      .collection(Collections.CLAN_STORES)
      .find(
        {
          tag: data.tag,
          paused: false,
          guild: { $ne: data.guild }
        },
        { projection: { _id: 1 } }
      )
      .toArray();

    const logs = await this.client.db
      .collection(Collections.CLAN_LOGS)
      .find({ guildId: data.guild, clanTag: data.tag })
      .toArray();
    for (const log of logs) this.deleteLog(log._id.toHexString());

    if (!clans.length) {
      this.cached.delete(data.tag);
      await this.client.redis.publisher.publish('clan_removed', JSON.stringify(data));
    } else {
      await this._loadClans(data.tag);
    }
  }

  public deleteLog(logId: string) {
    this.capitalLog.delete(logId);
    this.clanEmbedLog.delete(logId);
    this.clanGamesLog.delete(logId);
    this.clanLog.delete(logId);
    this.clanWarLog.delete(logId);
    this.donationLog.delete(logId);
    this.lastSeenLog.delete(logId);
    this.legendLog.delete(logId);
    this.rankedBattleLog.delete(logId);
  }

  public async addLog(guildId: string) {
    await Promise.all([
      this.capitalLog.add(guildId),
      this.clanEmbedLog.add(guildId),
      this.clanGamesLog.add(guildId),
      this.clanLog.add(guildId),
      this.clanWarLog.add(guildId),
      this.donationLog.add(guildId),
      this.lastSeenLog.add(guildId),
      this.legendLog.add(guildId),
      this.rankedBattleLog.add(guildId)
    ]);
  }

  public async addAutoBoard(id: string) {
    return this.autoBoardLog.add(id);
  }

  public async delAutoBoard(id: string) {
    return this.autoBoardLog.del(id);
  }

  public async flush() {
    this.autoBoardLog.cached.clear();
    this.flagAlertLog.cached.clear();

    this.capitalLog.cached.clear();
    this.clanEmbedLog.cached.clear();
    this.clanGamesLog.cached.clear();
    this.clanLog.cached.clear();
    this.clanWarLog.cached.clear();
    this.donationLog.cached.clear();
    this.lastSeenLog.cached.clear();
    this.legendLog.cached.clear();
    this.rankedBattleLog.cached.clear();

    await this.client.redis.subscriber.unsubscribe(REDIS_PUB_SUB_CHANNEL);
  }
}

const activeGuildFilter = () => ({
  $or: [
    { lastExecution: { $exists: false } },
    { lastExecution: { $gt: new Date(Date.now() - INACTIVE_GUILD_DURATION) } }
  ]
});

interface Cached {
  _id: string;
  guild: string;
  tag: string;
}

interface AggregatedResult {
  _id: string;
  clans: [
    {
      _id: string;
      tag: string;
      guild: string;
    }
  ];
}
