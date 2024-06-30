import { captureException } from '@sentry/node';
import { Collection } from 'discord.js';
import { inspect } from 'node:util';
import { Client } from '../struct/Client.js';
import Queue from '../struct/Queue.js';
import { Collections, Flags } from '../util/Constants.js';
import AutoBoardLog from './AutoBoardLog.js';
import CapitalLog from './CapitalLog.js';
import CapitalLogV2 from './CapitalLogV2.js';
import ClanEmbedLog from './ClanEmbedLog.js';
import ClanEmbedLogV2 from './ClanEmbedLogV2.js';
import ClanFeedLog from './ClanFeedLog.js';
import ClanGamesLog from './ClanGamesLog.js';
import ClanGamesLogV2 from './ClanGamesLogV2.js';
import ClanLog from './ClanLog.js';
import ClanWarLog from './ClanWarLog.js';
import ClanWarLogV2 from './ClanWarLogV2.js';
import DonationLog from './DonationLog.js';
import DonationLogV2 from './DonationLogV2.js';
import FlagAlertLog from './FlagAlertLog.js';
import JoinLeaveLog from './JoinLeaveLog.js';
import LastSeenLog from './LastSeenLog.js';
import LastSeenLogV2 from './LastSeenLogV2.js';
import LegendLog from './LegendLog.js';
import LegendLogV2 from './LegendLogV2.js';
import MaintenanceHandler from './Maintenance.js';

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

  private clanWarLog = new ClanWarLog(this);
  private donationLog = new DonationLog(this);
  private clanEmbedLog = new ClanEmbedLog(this);
  private clanGamesLog = new ClanGamesLog(this);
  private lastSeenLog = new LastSeenLog(this);
  private autoBoard = new AutoBoardLog(this);
  private clanFeedLog = new ClanFeedLog(this);
  private legendLog = new LegendLog(this);
  private capitalLog = new CapitalLog(this);
  private joinLeaveLog = new JoinLeaveLog(this);
  public flagAlertLog = new FlagAlertLog(this);

  public capitalLogV2 = new CapitalLogV2(this);
  public clanEmbedLogV2 = new ClanEmbedLogV2(this);
  public clanGamesLogV2 = new ClanGamesLogV2(this);
  public clanLog = new ClanLog(this);
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
            await this.donationLog.exec(data.tag, data);
            break;
          case Flags.CLAN_FEED_LOG:
            await Promise.all([
              this.clanFeedLog.exec(data.tag, data),
              this.joinLeaveLog.exec(data.tag, data),
              this.flagAlertLog.exec(data.tag, data),
              this.clanLog.exec(data.tag, data)
            ]);
            this.client.rolesManager.exec(data.tag, data);
            break;
          case Flags.CLAN_EMBED_LOG:
            await this.clanEmbedLog.exec(data.tag, data);
            break;
          case Flags.CLAN_GAMES_LOG:
            await this.clanGamesLog.exec(data.tag, data);
            await this.clanGamesLogV2.exec(data.tag, data);
            break;
          case Flags.CLAN_EVENT_LOG:
            await Promise.all([this.clanFeedLog.exec(data.tag, data), this.clanLog.exec(data.tag, data)]);
            break;
          case Flags.TOWN_HALL_LOG:
            await Promise.all([this.clanFeedLog.exec(data.tag, data), this.clanLog.exec(data.tag, data)]);
            break;
          case Flags.PLAYER_FEED_LOG:
            await Promise.all([this.clanFeedLog.exec(data.tag, data), this.clanLog.exec(data.tag, data)]);
            break;
          case Flags.CLAN_WAR_LOG:
            await Promise.all([this.clanWarLog.exec(data.clan.tag, data), this.clanWarLogV2.exec(data.clan.tag, data)]);
            this.client.rolesManager.exec(data.tag, data);
            break;
          case Flags.DONATION_LOG_V2:
            await this.clanLog.exec(data.clan.tag, data);
            break;
          // case Flags.CAPITAL_LOG:
          //   await this.clanLog.exec(data.clan.tag, data);
          //   break;
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
    await this.clanLog.init();
    await this.clanWarLogV2.init();
    await this.donationLogV2.init();
    await this.lastSeenLogV2.init();
    await this.legendLogV2.init();

    await this.clanEmbedLog.init();
    await this.donationLog.init();
    await this.clanFeedLog.init();
    await this.lastSeenLog.init();
    await this.clanGamesLog.init();
    await this.clanWarLog.init();
    await this.legendLog.init();
    await this.joinLeaveLog.init();
    await this.capitalLog.init();
    await this.autoBoard.init();
    await this.flagAlertLog.init();

    await this.broadcast();
    return this.client.publisher.publish('INIT', '{}');
  }

  public async add(id: string, data: { tag: string; guild: string; op: number }) {
    if (!this.client.guilds.cache.has(data.guild)) return;

    const [result] = await this.client.db
      .collection(Collections.CLAN_STORES)
      .aggregate<{ tag: string; patron: boolean; flags: number[]; lastRan?: string; uniqueId: number }>([
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
            patron: {
              $addToSet: '$patron'
            },
            uniqueId: {
              $max: '$uniqueId'
            },
            flags: {
              $addToSet: '$flag'
            },
            lastRan: {
              $max: '$lastRan'
            }
          }
        },
        {
          $set: {
            tag: '$_id',
            patron: {
              $in: [true, '$patron']
            }
          }
        },
        {
          $unset: '_id'
        }
      ])
      .toArray();

    const OP = {
      [Flags.DONATION_LOG]: this.donationLog,
      [Flags.CLAN_FEED_LOG]: this.clanFeedLog,
      [Flags.LAST_SEEN_LOG]: this.lastSeenLog,
      [Flags.CLAN_EMBED_LOG]: this.clanEmbedLog,
      [Flags.CLAN_GAMES_LOG]: this.clanGamesLog,
      [Flags.CLAN_WAR_LOG]: this.clanWarLog,
      [Flags.LEGEND_LOG]: this.legendLog,
      [Flags.CAPITAL_LOG]: this.capitalLog,
      [Flags.JOIN_LEAVE_LOG]: this.joinLeaveLog
    };

    if (data.op.toString() in OP) {
      await OP[data.op as keyof typeof OP].add(id); // eslint-disable-line
    } else {
      Object.values(OP).map((Op) => Op.add(id));
    }

    await this.addV2(data.guild);

    if (result) {
      const clan = {
        tag: result.tag,
        patron: result.patron,
        uniqueId: result.uniqueId,
        flag: this.bitWiseOR(result.flags),
        lastRan: result.lastRan
      };

      await this._loadClans(data.tag);
      await this.client.publisher.publish('ADD', JSON.stringify({ ...clan, op: data.op }));
    } else {
      this.cached.delete(data.tag);
    }
  }

  public async delete(id: string, data: { tag: string; op: number; guild: string }) {
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

    const OP = {
      [Flags.DONATION_LOG]: this.donationLog,
      [Flags.CLAN_FEED_LOG]: this.clanFeedLog,
      [Flags.LAST_SEEN_LOG]: this.lastSeenLog,
      [Flags.CLAN_EMBED_LOG]: this.clanEmbedLog,
      [Flags.CLAN_GAMES_LOG]: this.clanGamesLog,
      [Flags.CLAN_WAR_LOG]: this.clanWarLog,
      [Flags.LEGEND_LOG]: this.legendLog,
      [Flags.CAPITAL_LOG]: this.capitalLog,
      [Flags.JOIN_LEAVE_LOG]: this.joinLeaveLog
    };

    if (data.op.toString() in OP) {
      OP[data.op as keyof typeof OP].delete(id); // eslint-disable-line
    } else {
      Object.values(OP).map((Op) => Op.delete(id));
    }

    if (!data.op) {
      await this.deleteV2(data.guild);
    }

    if (!clans.length) {
      this.cached.delete(data.tag);
      await this.client.publisher.publish('REMOVE', JSON.stringify(data));
    } else {
      await this._loadClans(data.tag);
    }
  }

  public async addV2(guildId: string) {
    await Promise.all([
      this.capitalLogV2.add(guildId),
      this.clanEmbedLogV2.add(guildId),
      this.clanGamesLogV2.add(guildId),
      this.clanLog.add(guildId),
      this.clanWarLogV2.add(guildId),
      this.donationLogV2.add(guildId),
      this.lastSeenLogV2.add(guildId),
      this.legendLogV2.add(guildId)
    ]);
  }

  public async deleteV2(guildId: string) {
    const logs = await this.client.db.collection(Collections.CLAN_LOGS).find({ guildId }).toArray();
    for (const log of logs) {
      this.removeV2(log._id.toHexString());
    }
  }

  public removeV2(_id: string) {
    this.capitalLogV2.delete(_id);
    this.clanEmbedLogV2.delete(_id);
    this.clanGamesLogV2.delete(_id);
    this.clanLog.delete(_id);
    this.clanWarLogV2.delete(_id);
    this.donationLogV2.delete(_id);
    this.lastSeenLogV2.delete(_id);
    this.legendLogV2.delete(_id);
  }

  public async addAutoBoard(id: string) {
    return this.autoBoard.add(id);
  }

  public async delAutoBoard(id: string) {
    return this.autoBoard.del(id);
  }

  private bitWiseOR(flags: number[]) {
    return flags.reduce((acc, curr) => acc | curr, 0);
  }

  public async flush() {
    this.clanWarLog.cached.clear();
    this.donationLog.cached.clear();
    this.clanGamesLog.cached.clear();
    this.clanEmbedLog.cached.clear();
    this.clanFeedLog.cached.clear();
    this.lastSeenLog.cached.clear();
    this.legendLog.cached.clear();
    this.capitalLog.cached.clear();
    this.autoBoard.cached.clear();
    this.flagAlertLog.cached.clear();

    this.capitalLogV2.cached.clear();
    this.clanEmbedLogV2.cached.clear();
    this.clanGamesLogV2.cached.clear();
    this.clanLog.cached.clear();
    this.clanWarLogV2.cached.clear();
    this.donationLogV2.cached.clear();
    this.lastSeenLogV2.cached.clear();
    this.legendLogV2.cached.clear();

    await this.client.subscriber.unsubscribe('channel');
    return this.client.publisher.publish('FLUSH', '{}');
  }
}
