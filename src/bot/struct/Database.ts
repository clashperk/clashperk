import { ClanLogsEntity, ClanStoresEntity, ClanWarRemindersEntity, PlayerLinksEntity } from '@app/entities';
import { Db, MongoClient } from 'mongodb';
import { CapitalRanksEntity } from '../entities/capital-ranks.entity.js';
import { ClanRanksEntity } from '../entities/clan-ranks.entity.js';
import { PlayerRanksEntity } from '../entities/player-ranks.entity.js';
import { PlayersEntity } from '../entities/players.entity.js';
import { PlayerSeasonModel } from '../types/index.js';
import { Collections } from '../util/Constants.js';

interface CollectionsMap {
  [Collections.CLAN_STORES]: ClanStoresEntity;
  [Collections.PLAYER_SEASONS]: PlayerSeasonModel; // TODO: Fix this
  [Collections.PLAYERS]: PlayersEntity;
  [Collections.PLAYER_LINKS]: PlayerLinksEntity;
  [Collections.CLAN_LOGS]: ClanLogsEntity;
  [Collections.REMINDERS]: ClanWarRemindersEntity;
  [Collections.CLAN_RANKS]: ClanRanksEntity;
  [Collections.PLAYER_RANKS]: PlayerRanksEntity;
  [Collections.CAPITAL_RANKS]: CapitalRanksEntity;
}

declare module 'mongodb' {
  interface Db {
    collection<T extends keyof CollectionsMap>(name: T): Collection<CollectionsMap[T]>;
  }
}

export class MongoDbClient extends MongoClient {
  public dbName = 'clashperk';

  public constructor() {
    super(process.env.MONGODB_URL!);
    this.on('open', () => this.createIndex(this.db(this.dbName)));
  }

  public async connect() {
    return super.connect();
  }

  public async createIndex(db: Db) {
    return Promise.all([
      db.collection(Collections.BOT_GROWTH).createIndex({ key: 1 }, { unique: true }),

      db.collection(Collections.BOT_GUILDS).createIndexes([
        {
          key: { guild: 1 },
          unique: true
        },
        {
          key: { usage: 1 }
        }
      ]),

      db.collection(Collections.BOT_INTERACTIONS).createIndex({ user: 1, guild: 1 }, { unique: true }),

      db.collection(Collections.BOT_STATS).createIndex({ name: 1 }, { unique: true }),

      db.collection(Collections.BOT_USAGE).createIndexes([
        {
          key: { key: 1 },
          unique: true
        }
      ]),

      db.collection(Collections.BOT_USERS).createIndex({ user: 1 }, { unique: true }),

      db.collection(Collections.GUILD_EVENTS).createIndexes([
        {
          key: { guildId: 1 }
        }
      ]),

      db.collection(Collections.CUSTOM_BOTS).createIndexes([
        {
          key: { applicationId: 1 },
          unique: true
        }
      ]),

      db.collection(Collections.CWL_GROUPS).createIndexes([
        {
          key: { 'clans.tag': 1, 'season': 1 }
        },
        {
          key: { uid: 1 },
          unique: true
        },
        {
          key: { id: 1 }
        },
        {
          key: { createdAt: 1 }
        }
      ]),

      db.collection(Collections.CLAN_GAMES).createIndexes([
        {
          key: { tag: 1, season: 1 },
          unique: true
        },
        {
          key: { tag: 1 }
        }
      ]),

      db.collection(Collections.PLAYER_RANKS).createIndexes([
        {
          key: { countryCode: 1, season: 1 },
          unique: true
        },
        {
          key: { 'players.tag': 1 }
        }
      ]),

      db.collection(Collections.CLAN_CATEGORIES).createIndex({ guildId: 1 }),

      db.collection(Collections.CLAN_RANKS).createIndexes([
        {
          key: { countryCode: 1, season: 1 },
          unique: true
        },
        {
          key: { 'clans.tag': 1 }
        }
      ]),

      db.collection(Collections.CAPITAL_RANKS).createIndexes([
        {
          key: { countryCode: 1, season: 1 },
          unique: true
        },
        {
          key: { 'clans.tag': 1 }
        }
      ]),

      db.collection(Collections.PLAYER_SEASONS).createIndexes([
        {
          key: { tag: 1, season: 1 },
          unique: true
        },
        {
          key: { __clans: 1, season: 1 }
        }
      ]),

      db.collection(Collections.CLAN_GAMES_POINTS).createIndexes([
        {
          key: { tag: 1, season: 1 },
          unique: true
        },
        {
          key: { __clans: 1, season: 1 }
        }
      ]),

      db.collection(Collections.WAR_BASE_CALLS).createIndexes([
        {
          key: { warId: 1, guild: 1 },
          unique: true
        }
      ]),

      db.collection(Collections.CAPITAL_CONTRIBUTIONS).createIndexes([
        {
          key: { tag: 1, season: 1 }
        },
        {
          key: { 'clan.tag': 1 }
        }
      ]),

      db.collection(Collections.CAPITAL_RAID_SEASONS).createIndexes([
        {
          key: { tag: 1, weekId: 1 },
          unique: true
        },
        {
          key: { tag: 1 }
        },
        {
          key: { 'members.tag': 1 }
        }
      ]),

      db.collection(Collections.AUTO_ROLE_DELAYS).createIndexes([
        {
          key: { guildId: 1, userId: 1 },
          unique: true
        },
        {
          key: { guildId: 1 }
        },
        {
          key: { updatedAt: 1 },
          expireAfterSeconds: 60 * 60 * 24 * 10 // 10 days
        }
      ]),

      db.collection(Collections.CLAN_STORES).createIndexes([
        {
          key: { guild: 1, tag: 1 },
          unique: true
        },
        {
          key: { alias: 1 }
        },
        {
          key: { tag: 1 }
        },
        {
          key: { channels: 1 }
        }
      ]),

      db.collection(Collections.CLAN_EMBED_LOGS).createIndexes([
        {
          key: { clanId: 1 }
        },
        {
          key: { guild: 1, tag: 1 },
          unique: true
        }
      ]),

      db.collection(Collections.CLAN_FEED_LOGS).createIndexes([
        {
          key: { clanId: 1 }
        },
        {
          key: { guild: 1, tag: 1 },
          unique: true
        }
      ]),

      db.collection(Collections.CLAN_LOGS).createIndexes([
        {
          key: { guildId: 1, clanTag: 1, logType: 1 },
          unique: true
        }
      ]),

      db.collection(Collections.AUTO_BOARDS).createIndexes([
        {
          key: { guildId: 1, boardType: 1 },
          unique: true
        }
      ]),

      db.collection(Collections.FLAG_ALERT_LOGS).createIndexes([
        {
          key: { guildId: 1 },
          unique: true
        }
      ]),

      db.collection(Collections.JOIN_LEAVE_LOGS).createIndexes([
        {
          key: { clanId: 1 }
        },
        {
          key: { guild: 1, tag: 1 },
          unique: true
        }
      ]),

      db.collection(Collections.LEGEND_LOGS).createIndexes([
        {
          key: { clanId: 1 }
        },
        {
          key: { lastPosted: 1 }
        },
        {
          key: { guild: 1, tag: 1 },
          unique: true
        }
      ]),

      db.collection(Collections.CAPITAL_LOGS).createIndexes([
        {
          key: { clanId: 1 }
        },
        {
          key: { lastPosted: 1 }
        },
        {
          key: { guild: 1, tag: 1 },
          unique: true
        }
      ]),

      db.collection(Collections.CLAN_GAMES_LOGS).createIndexes([
        {
          key: { clanId: 1 }
        },
        {
          key: { guild: 1, tag: 1 },
          unique: true
        }
      ]),

      db.collection(Collections.CLAN_WAR_LOGS).createIndexes([
        {
          key: { clanId: 1 }
        },
        {
          key: { guild: 1, tag: 1 },
          unique: true
        }
      ]),

      db.collection(Collections.LAST_SEEN_LOGS).createIndexes([
        {
          key: { clanId: 1 }
        },
        {
          key: { guild: 1, tag: 1 },
          unique: true
        }
      ]),

      db.collection(Collections.DONATION_LOGS).createIndexes([
        {
          key: { clanId: 1 }
        },
        {
          key: { guild: 1, tag: 1 },
          unique: true
        }
      ]),

      db.collection(Collections.CLAN_WARS).createIndexes([
        {
          key: { uid: 1 },
          unique: true
        },
        {
          key: { id: 1 }
        },
        {
          key: { 'clan.tag': 1 }
        },
        {
          key: { 'opponent.tag': 1 }
        },
        {
          key: { 'clan.members.tag': 1 }
        },
        {
          key: { 'opponent.members.tag': 1 }
        },
        {
          key: { leagueGroupId: 1 },
          sparse: true
        },
        {
          key: { warTag: 1 },
          sparse: true
        }
      ]),

      db.collection(Collections.FLAGS).createIndex({ guild: 1, tag: 1 }),

      db.collection(Collections.PLAYERS).createIndexes([
        {
          key: { 'clan.tag': 1, 'tag': 1 }
        },
        {
          key: { 'clan.tag': 1 }
        },
        {
          key: { tag: 1 },
          unique: true
        }
      ]),

      db.collection(Collections.USERS).createIndexes([
        {
          key: { userId: 1 },
          unique: true
        }
      ]),

      db.collection(Collections.PLAYER_LINKS).createIndexes([
        {
          key: { name: 'text' }
        },
        {
          key: { tag: 1 },
          unique: true
        },
        {
          key: { userId: 1 }
        }
      ]),

      db.collection(Collections.ROSTERS).createIndexes([
        {
          key: { name: 'text' }
        },
        {
          key: { guildId: 1 }
        }
      ]),

      db.collection(Collections.ROSTER_CATEGORIES).createIndexes([
        {
          key: { name: 'text' }
        },
        {
          key: { guildId: 1 }
        }
      ]),

      db.collection(Collections.PATREON_MEMBERS).createIndex({ id: 1 }, { unique: true }),

      db.collection(Collections.SETTINGS).createIndex({ guildId: 1 }, { unique: true }),

      db.collection(Collections.REMINDERS).createIndexes([
        {
          key: { guild: 1 }
        },
        {
          key: { clans: 1 }
        }
      ]),

      db.collection(Collections.RAID_REMINDERS).createIndexes([
        {
          key: { guild: 1 }
        },
        {
          key: { clans: 1 }
        }
      ]),

      db.collection(Collections.CG_REMINDERS).createIndexes([
        {
          key: { guild: 1 }
        },
        {
          key: { clans: 1 }
        }
      ]),

      db.collection(Collections.SCHEDULERS).createIndexes([
        {
          key: { tag: 1 }
        },
        {
          key: { guild: 1 }
        },
        {
          key: { reminderId: 1 }
        },
        {
          key: { timestamp: 1 },
          expireAfterSeconds: 60 * 60 * 24 * 3
        }
      ]),

      db.collection(Collections.RAID_SCHEDULERS).createIndexes([
        {
          key: { tag: 1 }
        },
        {
          key: { guild: 1 }
        },
        {
          key: { reminderId: 1 }
        },
        {
          key: { timestamp: 1 },
          expireAfterSeconds: 60 * 60 * 24 * 3
        }
      ]),

      db.collection(Collections.CG_SCHEDULERS).createIndexes([
        {
          key: { tag: 1 }
        },
        {
          key: { guild: 1 }
        },
        {
          key: { reminderId: 1 }
        },
        {
          key: { timestamp: 1 },
          expireAfterSeconds: 60 * 60 * 24 * 3
        }
      ])
    ]);
  }
}

export const mongoClient = new MongoDbClient();
