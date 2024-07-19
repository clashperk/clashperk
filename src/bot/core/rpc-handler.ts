import { captureException } from '@sentry/node';
import { Collection } from 'discord.js';
import { inspect } from 'node:util';
import { Client } from '../struct/client-module.js';
import Queue from '../struct/queue.js';
import { Collections, Flags } from '../util/constants.js';
import AutoBoardLog from './auto-board-log.js';
import CapitalLogV2 from './capital-log-v2.js';
import ClanEmbedLogV2 from './clan-embed-log-v2.js';
import ClanGamesLogV2 from './clan-games-log-v2.js';
import ClanLogV2 from './clan-log-v2.js';
import ClanWarLogV2 from './clan-war-log-v2.js';
import DonationLogV2 from './donation-log-v2.js';
import FlagAlertLog from './flag-alert-log.js';
import LastSeenLogV2 from './last-seen-log-v2.js';
import LegendLogV2 from './legend-log-v2.js';
import MaintenanceHandler from './maintenance.js';

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

export default class RPCHandler {
  public cached = new Collection<string, Cached[]>();

  private paused = Boolean(false);
  private queue = new Queue();
  private api: MaintenanceHandler;

  private autoBoard = new AutoBoardLog(this);
  public flagAlertLog = new FlagAlertLog(this);

  public capitalLogV2 = new CapitalLogV2(this);
  public clanEmbedLogV2 = new ClanEmbedLogV2(this);
  public clanGamesLogV2 = new ClanGamesLogV2(this);
  public clanLogV2 = new ClanLogV2(this);
  public clanWarLogV2 = new ClanWarLogV2(this);
  public donationLogV2 = new DonationLogV2(this);
  public lastSeenLogV2 = new LastSeenLogV2(this);
  public legendLogV2 = new LegendLogV2(this);

  public get isInMaintenance() {
    return this.api.isMaintenance;
  }

  public constructor(public readonly client: Client) {
    this.api = new MaintenanceHandler(this.client);
    this.api.init();
    this.paused = Boolean(false);
  }

  public pause(forced = false, ms = 5 * 60 * 1000) {
    if (this.paused) return this.paused;
    this.paused = Boolean(true);
    if (forced) setTimeout(() => (this.paused = Boolean(false)), ms);
    return this.paused;
  }

  private async broadcast() {
    await this.client.subscriber.subscribe('channel', async (message) => {
      const data = JSON.parse(message);

      if (this.paused) return;
      if (this.queue.remaining >= 2000) return;

      await this.queue.wait();
      try {
        switch (data.op) {
          case Flags.DONATION_LOG:
            break;
          case Flags.CLAN_FEED_LOG:
            await Promise.all([this.flagAlertLog.exec(data.tag, data), this.clanLogV2.exec(data.tag, data)]);
            this.client.rolesManager.exec(data.tag, data);
            break;
          case Flags.CLAN_EMBED_LOG:
            break;
          case Flags.CLAN_GAMES_LOG:
            await this.clanGamesLogV2.exec(data.tag, data);
            break;
          case Flags.CLAN_EVENT_LOG:
            await this.clanLogV2.exec(data.tag, data);
            break;
          case Flags.TOWN_HALL_LOG:
            await this.clanLogV2.exec(data.tag, data);
            break;
          case Flags.PLAYER_FEED_LOG:
            await this.clanLogV2.exec(data.tag, data);
            break;
          case Flags.CLAN_WAR_LOG:
            await this.clanWarLogV2.exec(data.clan.tag, data);
            this.client.rolesManager.exec(data.tag, data);
            break;
          case Flags.DONATION_LOG_V2:
            await this.clanLogV2.exec(data.clan.tag, data);
            break;
          case Flags.CAPITAL_LOG:
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

    return this.client.publisher.publish(
      'CONNECT',
      JSON.stringify({ shardId: this.client.shard?.ids[0] ?? 0, shards: this.client.shard?.count ?? 1 })
    );
  }

  private async _loadClans(tag?: string) {
    const result = await this.client.db
      .collection(Collections.CLAN_STORES)
      .aggregate<AggregatedResult>([
        {
          $match: {
            guild: { $in: this.client.guilds.cache.map((guild) => guild.id) },
            paused: false,
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
    if (this.api.isMaintenance) return;

    await this._loadClans();

    await this.capitalLogV2.init();
    await this.clanEmbedLogV2.init();
    await this.clanGamesLogV2.init();
    await this.clanWarLogV2.init();
    await this.donationLogV2.init();
    await this.lastSeenLogV2.init();
    await this.clanLogV2.init();
    await this.legendLogV2.init();

    await this.autoBoard.init();
    await this.flagAlertLog.init();

    await this.broadcast();
    return this.client.publisher.publish('INIT', '{}');
  }

  public async add(data: { tag: string; guild: string }) {
    if (!this.client.guilds.cache.has(data.guild)) return;

    const [result] = await this.client.db
      .collection(Collections.CLAN_STORES)
      .aggregate<{ tag: string; lastRan?: string; uniqueId: number }>([
        {
          $match: {
            tag: data.tag,
            // active: true,
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
      await this.client.publisher.publish('ADD', JSON.stringify(clan));
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
          // active: true,
          paused: false,
          guild: { $ne: data.guild }
        },
        { projection: { _id: 1 } }
      )
      .toArray();

    const logs = await this.client.db.collection(Collections.CLAN_LOGS).find({ guildId: data.guild, clanTag: data.tag }).toArray();
    for (const log of logs) this.deleteLog(log._id.toHexString());

    if (!clans.length) {
      this.cached.delete(data.tag);
      await this.client.publisher.publish('REMOVE', JSON.stringify(data));
    } else {
      await this._loadClans(data.tag);
    }
  }

  public deleteLog(logId: string) {
    this.capitalLogV2.delete(logId);
    this.clanEmbedLogV2.delete(logId);
    this.clanGamesLogV2.delete(logId);
    this.clanLogV2.delete(logId);
    this.clanWarLogV2.delete(logId);
    this.donationLogV2.delete(logId);
    this.lastSeenLogV2.delete(logId);
    this.legendLogV2.delete(logId);
  }

  public async addLog(guildId: string) {
    await Promise.all([
      this.capitalLogV2.add(guildId),
      this.clanEmbedLogV2.add(guildId),
      this.clanGamesLogV2.add(guildId),
      this.clanLogV2.add(guildId),
      this.clanWarLogV2.add(guildId),
      this.donationLogV2.add(guildId),
      this.lastSeenLogV2.add(guildId),
      this.legendLogV2.add(guildId)
    ]);
  }

  public async addAutoBoard(id: string) {
    return this.autoBoard.add(id);
  }

  public async delAutoBoard(id: string) {
    return this.autoBoard.del(id);
  }

  public async flush() {
    this.autoBoard.cached.clear();
    this.flagAlertLog.cached.clear();

    this.capitalLogV2.cached.clear();
    this.clanEmbedLogV2.cached.clear();
    this.clanGamesLogV2.cached.clear();
    this.clanLogV2.cached.clear();
    this.clanWarLogV2.cached.clear();
    this.donationLogV2.cached.clear();
    this.lastSeenLogV2.cached.clear();
    this.legendLogV2.cached.clear();

    await this.client.subscriber.unsubscribe('channel');
    return this.client.publisher.publish('FLUSH', '{}');
  }
}
