import { Collections, LEGEND_LEAGUE_ID } from '@app/constants';
import {
  AutoBoardLogsEntity,
  CapitalRaidSeasonsEntity,
  CapitalRanksEntity,
  ClanLogsEntity,
  ClanRanksEntity,
  ClanStoresEntity,
  ClanWarRemindersEntity,
  FlagAlertLogsEntity,
  GoogleSheetsEntity,
  LegendAttacksEntity,
  PlayerLinksEntity,
  PlayerRanksEntity,
  PlayerSeasonsEntity,
  PlayersEntity,
  SettingsEntity,
  UsersEntity
} from '@app/entities';
import { Db, MongoClient } from 'mongodb';

interface CollectionsMap {
  [Collections.CLAN_STORES]: ClanStoresEntity;
  [Collections.PLAYER_SEASONS]: PlayerSeasonsEntity;
  [Collections.PLAYERS]: PlayersEntity;
  [Collections.PLAYER_LINKS]: PlayerLinksEntity;
  [Collections.CLAN_LOGS]: ClanLogsEntity;
  [Collections.WAR_REMINDERS]: ClanWarRemindersEntity;
  [Collections.CLAN_RANKS]: ClanRanksEntity;
  [Collections.PLAYER_RANKS]: PlayerRanksEntity;
  [Collections.CAPITAL_RANKS]: CapitalRanksEntity;
  [Collections.LEGEND_ATTACKS]: LegendAttacksEntity;
  [Collections.USERS]: UsersEntity;
  [Collections.SETTINGS]: SettingsEntity;
  [Collections.AUTO_BOARDS]: AutoBoardLogsEntity;
  [Collections.FLAG_ALERT_LOGS]: FlagAlertLogsEntity;
  [Collections.CAPITAL_RAID_SEASONS]: CapitalRaidSeasonsEntity;
  [Collections.GOOGLE_SHEETS]: GoogleSheetsEntity;
}

declare module 'mongodb' {
  interface Db {
    collection<T extends keyof CollectionsMap>(name: T): Collection<CollectionsMap[T]>;
  }
}

class MongoDbClient extends MongoClient {
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

      db.collection(Collections.LAYOUTS).createIndexes([
        {
          key: { layoutId: 1 }
        },
        {
          key: { guildId: 1 }
        },
        {
          key: { messageIds: 1 }
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
          key: { serviceId: 1 },
          unique: true
        }
      ]),

      db.collection(Collections.LEGEND_ATTACKS).createIndexes([
        {
          key: { tag: 1, seasonId: 1 },
          unique: true
        },
        {
          key: { seasonId: 1 }
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

      db.collection(Collections.GOOGLE_SHEETS).createIndexes([
        {
          key: { hash: 1 },
          unique: true
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
        },
        {
          key: { createdAt: 1 },
          expireAfterSeconds: 60 * 60 * 24 * 30 * 36 // 36 months
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
        },
        {
          key: { createdAt: 1 },
          expireAfterSeconds: 60 * 60 * 24 * 30 * 24 // 24 months
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
          key: { tag: 1 }
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
        },
        {
          key: { endTime: 1 },
          expireAfterSeconds: 60 * 60 * 24 * 30 * 36 // 36 months
        }
      ]),

      db.collection(Collections.FLAGS).createIndex({ guild: 1, tag: 1 }),

      db.collection(Collections.PLAYERS).createIndexes([
        {
          key: { 'clan.tag': 1 }
        },
        {
          key: { tag: 1 },
          unique: true
        },
        {
          key: { lastSeen: 1 },
          expireAfterSeconds: 60 * 60 * 24 * 30 * 6, // 6 months
          partialFilterExpression: { leagueId: { $lt: LEGEND_LEAGUE_ID } }
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

      db.collection(Collections.WAR_REMINDERS).createIndexes([
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

      db.collection(Collections.CLAN_GAMES_REMINDERS).createIndexes([
        {
          key: { guild: 1 }
        },
        {
          key: { clans: 1 }
        }
      ]),

      db.collection(Collections.WAR_SCHEDULERS).createIndexes([
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
          expireAfterSeconds: 60 * 60 * 24 * 3 // 3 days
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
          expireAfterSeconds: 60 * 60 * 24 * 3 // 3 days
        }
      ]),

      db.collection(Collections.CLAN_GAMES_SCHEDULERS).createIndexes([
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
          expireAfterSeconds: 60 * 60 * 24 * 3 // 3 days
        }
      ])
    ]);
  }
}

export const mongoClient = new MongoDbClient();
