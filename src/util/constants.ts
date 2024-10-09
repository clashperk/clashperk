import { GuildMember, GuildTextBasedChannel, PermissionsBitField, PermissionsString, User } from 'discord.js';
import i18next from 'i18next';

export const BOOST_DURATION = 3 * 24 * 60 * 60 * 1000;

export const MAX_TOWN_HALL_LEVEL = 16;

export const MAX_BUILDER_HALL_LEVEL = 10;

export const MAX_CLAN_SIZE = 50;

export const BIT_FIELD = new PermissionsBitField(17893773667409n).bitfield;

export const BOT_MANAGER_HYPERLINK = '[Bot Manager](<https://docs.clashperk.com/others/bot-manager>)';

export const URL_REGEX = /^(http(s)?:\/\/)[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:\/?#[\]@!\$&'\(\)\*\+,;=.]+$/;

export const UNRANKED_CAPITAL_LEAGUE_ID = 85000000;

export const LEGEND_LEAGUE_ID = 29000022;

export const DIAMOND_LEAGUE_ID = 44000041;

export const UNRANKED_WAR_LEAGUE_ID = 48000000;

export const ESCAPE_CHAR_REGEX = /[\u200e|\u200f|\u200b|\u2002]+/g;

export const TAG_REGEX = /^#?[0289CGJLOPQRUVY]+$/i;

export const DISCORD_ID_REGEX = /^\d{17,19}/;

export const DISCORD_MENTION_REGEX = /<@!?(\d{17,19})>/;

export const UNICODE_EMOJI_REGEX = /\p{Extended_Pictographic}/u;

export const RTL_LANGUAGE_SAMPLE = 'مرحبا بالعالم';

export const PATREON_LINK = 'https://www.patreon.com/clashperk';

export const SUPPORT_SERVER_LINK = 'https://discord.gg/ppuppun';

export const CLAN_GAMES_STARTING_DATE = 22;

export const UP_ARROW = '↑';
export const DOWN_ARROW = '↓';
export const LEFT_ARROW = '←';
export const RIGHT_ARROW = '→';
export const UP_DOWN_ARROW = '↕';
export const LEFT_RIGHT_ARROW = '↔';
export const UP_LEFT_ARROW = '↖';
export const UP_RIGHT_ARROW = '↗';
export const DOWN_LEFT_ARROW = '↙';
export const DOWN_RIGHT_ARROW = '↘';
export const DOT = '•';

export enum DiscordErrorCodes {
  UNKNOWN_MESSAGE = 10008,
  UNKNOWN_CHANNEL = 10003,
  UNKNOWN_WEBHOOK = 10015,
  INVALID_FORM_BODY = 50035
}

export const COLOR_CODES = {
  GREEN: 0x38d863,
  DARK_GREEN: 0x6dbc1e,
  RED: 0xeb3508,
  DARK_RED: 0xd74c1d,
  PEACH: 0xdf9666,
  CYAN: 0x00dbf3,
  YELLOW: 0xeffd5f,
  PURPLE: 0x5865f2
};

export const enum Collections {
  CLAN_STORES = 'ClanStores',
  FLAG_ALERT_LOGS = 'FlagAlertLogs',
  CLAN_LOGS = 'ClanLogs',
  COMPETE_BOARDS = 'CompeteBoards',

  AUTO_BOARDS = 'AutoBoardLogs',

  LEGEND_ATTACKS = 'LegendAttacks',

  EVENT_LOGS = 'EventLogs',

  FLAGS = 'Flags',

  PLAYER_LINKS = 'PlayerLinks',
  USERS = 'Users',

  PLAYER_ACTIVITIES = 'PlayerActivities',

  REMINDERS = 'Reminders',
  SCHEDULERS = 'Schedulers',
  RAID_REMINDERS = 'RaidReminders',
  CLAN_GAMES_REMINDERS = 'ClanGamesReminders',
  CLAN_GAMES_SCHEDULERS = 'ClanGamesSchedulers',
  RAID_SCHEDULERS = 'RaidSchedulers',

  WAR_BASE_CALLS = 'WarBaseCalls',

  PATREON_MEMBERS = 'Patrons',
  SETTINGS = 'Settings',
  PLAYERS = 'Players',
  CLAN_WARS = 'ClanWars',
  CLAN_GAMES = 'ClanGames',
  CWL_GROUPS = 'CWLGroups',

  PLAYER_RANKS = 'PlayerRanks',
  CAPITAL_RANKS = 'CapitalRanks',
  CLAN_RANKS = 'ClanRanks',
  CLAN_CATEGORIES = 'ClanCategories',

  GUILD_EVENTS = 'GuildEvents',

  CUSTOM_BOTS = 'CustomBots',

  AUTO_ROLE_DELAYS = 'AutoRoleDelays',

  ROSTERS = 'Rosters',
  ROSTER_CATEGORIES = 'RosterCategories',

  CLAN_MEMBERS = 'ClanMembers',
  CLAN_GAMES_POINTS = 'ClanGamesPoints',
  PLAYER_SEASONS = 'PlayerSeasons',
  CAPITAL_CONTRIBUTIONS = 'CapitalContributions',
  CAPITAL_RAID_SEASONS = 'CapitalRaidSeasons',

  BOT_GROWTH = 'BotGrowth',
  BOT_USAGE = 'BotUsage',
  BOT_GUILDS = 'BotGuilds',
  BOT_USERS = 'BotUsers',
  BOT_STATS = 'BotStats',
  BOT_COMMANDS = 'BotCommands',
  BOT_INTERACTIONS = 'BotInteractions'
}

export const enum Settings {
  BOT_ADMIN_ROLE = 'botAdminRole',
  PREFIX = 'prefix',
  COLOR = 'color',
  IS_TRUSTED_GUILD = 'isTrustedGuild',
  COMMAND_WHITELIST = 'commandWhitelist',
  MANAGER_ROLE = 'managerRole',
  ROSTER_MANAGER_ROLE = 'rosterManagerRole',
  FLAGS_MANAGER_ROLE = 'flagsManagerRole',
  LINKS_MANAGER_ROLE = 'linksManagerRole',
  CLAN_LIMIT = 'clanLimit',
  USER_BLACKLIST = 'blacklist',
  GUILD_BLACKLIST = 'guildBans',
  EVENTS_CHANNEL = 'eventsChannel',
  TOWN_HALL_ROLES = 'townHallRoles',
  BUILDER_HALL_ROLES = 'builderHallRoles',
  LEAGUE_ROLES = 'leagueRoles',
  BUILDER_LEAGUE_ROLES = 'builderLeagueRoles',
  LINK_EMBEDS = 'linkEmbeds',
  REFRESH_EMBEDS = 'refreshEmbeds',
  WEBHOOK_LIMIT = 'webhookLimit',
  ALLOW_EXTERNAL_ACCOUNTS = 'allowExternalAccounts',
  ALLOW_EXTERNAL_ACCOUNTS_LEAGUE = 'allowExternalAccountsLeague',
  VERIFIED_ONLY_CLAN_ROLES = 'verifiedOnlyClanRoles',
  EOS_PUSH_CLANS = 'eosPushClans',
  EOS_PUSH_CLAN_ROLES = 'eosPushClanRoles',
  CLAN_GAMES_EXCEPTIONAL_MONTHS = 'clanGamesExceptionalMonths',
  CLAN_GAMES_REMINDER_TIMESTAMP = 'clanGamesReminderTimestamp',
  FAMILY_NICKNAME_FORMAT = 'familyNicknameFormat',
  NON_FAMILY_NICKNAME_FORMAT = 'nonFamilyNicknameFormat',
  AUTO_NICKNAME = 'autoNickname',
  USE_AUTO_ROLE = 'useAutoRole',
  AUTO_ROLE_ALLOW_NOT_LINKED = 'autoRoleAllowNotLinked',
  FORCE_REFRESH_ROLES = 'forceRefreshRoles',
  NICKNAMING_ACCOUNT_PREFERENCE = 'nicknamingAccountPreference',
  ROSTER_DEFAULT_SETTINGS = 'rosterDefaultSettings',
  HAS_CUSTOM_BOT = 'hasCustomBot',
  GUILD_LOG_WEBHOOK_URL = 'guildLogWebhookURL',
  RATE_LIMIT_WEBHOOK_URL = 'rateLimitWebhookURL',
  EMOJI_SERVERS = 'emojiServers',
  FAMILY_ROLE = 'familyRole',
  EXCLUSIVE_FAMILY_ROLE = 'exclusiveFamilyRole',
  FAMILY_LEADERS_ROLE = 'familyLeadersRole',
  ACCOUNT_LINKED_ROLE = 'accountLinkedRole',
  ACCOUNT_VERIFIED_ROLE = 'accountVerifiedRole',
  GUEST_ROLE = 'guestRole',
  CLANS_SORTING_KEY = 'clansSortingKey',
  CLAN_CATEGORY_EXCLUSION = 'clanCategoryExclusion',
  HAS_FLAG_ALERT_LOG = 'hasFlagAlertLog',
  DISPLAY_CLAN_TAG = 'displayClanTag',
  ROLE_REPLACEMENT_LABELS = 'roleReplacementLabels',
  ROSTER_CHANGELOG = 'rosterChangeLog',
  REMINDER_EXCLUSION = 'reminderExclusion',
  DEPLOYMENT_WEBHOOK_URL = 'deploymentWebhook',
  ROLE_REMOVAL_DELAYS = 'roleRemovalDelays',
  ROLE_ADDITION_DELAYS = 'roleAdditionDelays',
  DISABLED_PATREON_IDS = 'disabledPatreonIds',
  USE_GROUPED_TODO_LIST = 'useGroupedTodoList'
}

export enum ElasticIndex {
  USER_LINKED_PLAYERS = 'user_linked_players',
  USER_LINKED_CLANS = 'user_linked_clans',
  GUILD_LINKED_CLANS = 'guild_linked_clans',
  RECENT_PLAYERS = 'recently_searched_players',
  RECENT_CLANS = 'recently_searched_clans'
}

export enum FeatureFlags {
  CLAN_LOG_SEPARATION = 'clan-log-separation',
  CLAN_MEMBERS_PROMOTION_LOG = 'clan-member-promotion-log',

  /** unused */
  LEGEND_ATTACKS_DAILY_LOG = 'legend-attacks-daily-log',
  /** unused */
  CLAN_GAMES_EMBED = 'clan-games-embed',
  /** unused */
  LAST_SEEN_EMBED = 'last-seen-embed',

  COMMAND_WHITELIST = 'command-whitelist',

  GUILD_EVENT_SCHEDULER = 'guild-event-scheduler',

  NO_PERMISSION_MESSAGE = 'no-permission-message',

  TRUSTED_GUILD = 'trusted-guild',

  RANDOM_DONATOR = 'random-donator',

  ALLOW_NO_MISSED_ATTACKS_LOG = 'allow-no-missed-attacks-log',

  DONATIONS_RECOVERY = 'donations-recovery'
}

export const enum Flags {
  DONATION_LOG = 1 << 0,
  CLAN_FEED_LOG = 1 << 1,
  LAST_SEEN_LOG = 1 << 2,
  CLAN_EMBED_LOG = 1 << 3,
  CLAN_GAMES_LOG = 1 << 4,
  CLAN_WAR_LOG = 1 << 5,
  CHANNEL_LINKED = 1 << 6,
  SERVER_LINKED = 1 << 7,
  LEGEND_LOG = 1 << 8,
  TOWN_HALL_LOG = 1 << 9,
  PLAYER_FEED_LOG = 1 << 10,
  JOIN_LEAVE_LOG = 1 << 11,
  CAPITAL_LOG = 1 << 12,
  CLAN_EVENT_LOG = 1 << 13,
  DONATION_LOG_V2 = 1 << 14
}

export const enum WarType {
  REGULAR = 1,
  FRIENDLY,
  CWL
}

export enum CommandCategories {
  SEARCH = 'search',
  CONFIG = 'config',
  SETUP = 'setup',
  WAR = 'war',
  CWL = 'cwl',
  ROSTER = 'roster',
  UTIL = 'util',
  ACTIVITY = 'activity',
  SUMMARY = 'summary',
  EXPORT = 'export',
  LINK = 'link',
  FLAG = 'flag',
  PROFILE = 'profile',
  REMINDERS = 'reminders',
  HISTORY = 'history'
}

export const SUPER_SCRIPTS: Record<string, string> = {
  0: '⁰',
  1: '¹',
  2: '²',
  3: '³',
  4: '⁴',
  5: '⁵',
  6: '⁶',
  7: '⁷',
  8: '⁸',
  9: '⁹'
} as const;

export const ATTACK_COUNTS: Record<string, string> = {
  ...SUPER_SCRIPTS
};

export const BUILDER_HALL_LEVELS_FOR_ROLES = Array(MAX_BUILDER_HALL_LEVEL - 2)
  .fill(0)
  .map((_, i) => i + 3);

export const TOWN_HALL_LEVELS_FOR_ROLES = Array(MAX_TOWN_HALL_LEVEL - 2)
  .fill(0)
  .map((_, i) => i + 3);

export const PLAYER_LEAGUE_MAPS: Record<string, string> = {
  29000000: 'unranked',
  29000001: 'bronze',
  29000002: 'bronze',
  29000003: 'bronze',
  29000004: 'silver',
  29000005: 'silver',
  29000006: 'silver',
  29000007: 'gold',
  29000008: 'gold',
  29000009: 'gold',
  29000010: 'crystal',
  29000011: 'crystal',
  29000012: 'crystal',
  29000013: 'master',
  29000014: 'master',
  29000015: 'master',
  29000016: 'champion',
  29000017: 'champion',
  29000018: 'champion',
  29000019: 'titan',
  29000020: 'titan',
  29000021: 'titan',
  29000022: 'legend'
};

export const BUILDER_BASE_LEAGUE_MAPS: Record<string, string> = {
  44000000: 'wood',
  44000001: 'wood',
  44000002: 'wood',
  44000003: 'wood',
  44000004: 'wood',
  44000005: 'clay',
  44000006: 'clay',
  44000007: 'clay',
  44000008: 'clay',
  44000009: 'clay',
  44000010: 'stone',
  44000011: 'stone',
  44000012: 'stone',
  44000013: 'stone',
  44000014: 'stone',
  44000015: 'copper',
  44000016: 'copper',
  44000017: 'copper',
  44000018: 'copper',
  44000019: 'copper',
  44000020: 'brass',
  44000021: 'brass',
  44000022: 'brass',
  44000023: 'iron',
  44000024: 'iron',
  44000025: 'iron',
  44000026: 'steel',
  44000027: 'steel',
  44000028: 'steel',
  44000029: 'titanium',
  44000030: 'titanium',
  44000031: 'titanium',
  44000032: 'platinum',
  44000033: 'platinum',
  44000034: 'platinum',
  44000035: 'emerald',
  44000036: 'emerald',
  44000037: 'emerald',
  44000038: 'ruby',
  44000039: 'ruby',
  44000040: 'ruby',
  44000041: 'diamond'
};

export const PLAYER_LEAGUE_NAMES = Array.from(new Set(Object.values(PLAYER_LEAGUE_MAPS)));

export const BUILDER_BASE_LEAGUE_NAMES = Array.from(new Set(Object.values(BUILDER_BASE_LEAGUE_MAPS)));

export const CLAN_GAMES_MINIMUM_POINTS = [
  1, 50, 100, 250, 500, 750, 1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000, 3250, 3500, 3750, 4000, 4500, 5000
];

export const CLAN_FEED_LOG_TYPES = {
  TOWN_HALL_UPGRADE: 'TOWN_HALL_UPGRADE',
  WAR_PREFERENCE_CHANGE: 'WAR_PREFERENCE_CHANGE',
  PLAYER_NAME_CHANGE: 'PLAYER_NAME_CHANGE',
  DONATION_RESET: 'PLAYER_DONATION_RESET',
  ROLE_CHANGE: 'PLAYER_ROLE_CHANGE',
  SEASON_BEST_PLAYERS: 'SEASON_BEST_PLAYERS'
} as const;

export const DEEP_LINK_TYPES = {
  OPEN_IN_GAME: 'OPEN_IN_GAME',
  OPEN_IN_COS: 'OPEN_IN_COS'
} as const;

export const WAR_FEED_LOG_TYPES = {
  REGULAR_WAR_EMBED: 'REGULAR_EMBED',
  MISSED_ATTACK_EMBED: 'MISSED_ATTACK_EMBED',
  CWL_WAR_EMBED: 'CWL_WAR_EMBED',
  FRIENDLY_WAR_EMBED: 'FRIENDLY_WAR_EMBED'
} as const;
export const enum DonationLogFrequencyTypes {
  INSTANT = 'INSTANT',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY'
}

export const PLAYER_ROLES_MAP: Record<string, string> = {
  admin: 'Elder',
  coLeader: 'Co-Leader',
  leader: 'Leader',
  member: 'Member'
};

export const CAPITAL_LEAGUE_MAP: Record<string, string> = {
  85000000: 'Unranked',
  85000001: 'Bronze League III',
  85000002: 'Bronze League II',
  85000003: 'Bronze League I',
  85000004: 'Silver League III',
  85000005: 'Silver League II',
  85000006: 'Silver League I',
  85000007: 'Gold League III',
  85000008: 'Gold League II',
  85000009: 'Gold League I',
  85000010: 'Crystal League III',
  85000011: 'Crystal League II',
  85000012: 'Crystal League I',
  85000013: 'Master League III',
  85000014: 'Master League II',
  85000015: 'Master League I',
  85000016: 'Champion League III',
  85000017: 'Champion League II',
  85000018: 'Champion League I',
  85000019: 'Titan League III',
  85000020: 'Titan League II',
  85000021: 'Titan League I',
  85000022: 'Legend League'
};

export const PLAYER_LEAGUE_MAP: Record<string, string> = {
  29000000: 'Unranked',
  29000001: 'Bronze League III',
  29000002: 'Bronze League II',
  29000003: 'Bronze League I',
  29000004: 'Silver League III',
  29000005: 'Silver League II',
  29000006: 'Silver League I',
  29000007: 'Gold League III',
  29000008: 'Gold League II',
  29000009: 'Gold League I',
  29000010: 'Crystal League III',
  29000011: 'Crystal League II',
  29000012: 'Crystal League I',
  29000013: 'Master League III',
  29000014: 'Master League II',
  29000015: 'Master League I',
  29000016: 'Champion League III',
  29000017: 'Champion League II',
  29000018: 'Champion League I',
  29000019: 'Titan League III',
  29000020: 'Titan League II',
  29000021: 'Titan League I',
  29000022: 'Legend League'
};

export const WAR_LEAGUE_MAP: Record<string, string> = {
  48000000: 'Unranked',
  48000001: 'Bronze League III',
  48000002: 'Bronze League II',
  48000003: 'Bronze League I',
  48000004: 'Silver League III',
  48000005: 'Silver League II',
  48000006: 'Silver League I',
  48000007: 'Gold League III',
  48000008: 'Gold League II',
  48000009: 'Gold League I',
  48000010: 'Crystal League III',
  48000011: 'Crystal League II',
  48000012: 'Crystal League I',
  48000013: 'Master League III',
  48000014: 'Master League II',
  48000015: 'Master League I',
  48000016: 'Champion League III',
  48000017: 'Champion League II',
  48000018: 'Champion League I',
  48000019: 'Titan League III',
  48000020: 'Titan League II',
  48000021: 'Titan League I',
  48000022: 'Legend League'
};

export const WAR_LEAGUE_PROMOTION_MAP: Record<string, { promotion: number; demotion: number; name: string; bonuses: number }> = {
  48000000: { promotion: 3, demotion: 9, name: 'Unranked', bonuses: 0 },
  48000001: { promotion: 3, demotion: 9, name: 'Bronze League III', bonuses: 1 },
  48000002: { promotion: 3, demotion: 8, name: 'Bronze League II', bonuses: 1 },
  48000003: { promotion: 3, demotion: 8, name: 'Bronze League I', bonuses: 1 },
  48000004: { promotion: 2, demotion: 8, name: 'Silver League III', bonuses: 1 },
  48000005: { promotion: 2, demotion: 7, name: 'Silver League II', bonuses: 1 },
  48000006: { promotion: 2, demotion: 7, name: 'Silver League I', bonuses: 1 },
  48000007: { promotion: 2, demotion: 7, name: 'Gold League III', bonuses: 2 },
  48000008: { promotion: 2, demotion: 7, name: 'Gold League II', bonuses: 2 },
  48000009: { promotion: 2, demotion: 7, name: 'Gold League I', bonuses: 2 },
  48000010: { promotion: 2, demotion: 7, name: 'Crystal League III', bonuses: 2 },
  48000011: { promotion: 2, demotion: 7, name: 'Crystal League II', bonuses: 2 },
  48000012: { promotion: 1, demotion: 7, name: 'Crystal League I', bonuses: 2 },
  48000013: { promotion: 1, demotion: 7, name: 'Master League III', bonuses: 3 },
  48000014: { promotion: 1, demotion: 7, name: 'Master League II', bonuses: 3 },
  48000015: { promotion: 1, demotion: 7, name: 'Master League I', bonuses: 3 },
  48000016: { promotion: 1, demotion: 7, name: 'Champion League III', bonuses: 4 },
  48000017: { promotion: 1, demotion: 7, name: 'Champion League II', bonuses: 4 },
  48000018: { promotion: 0, demotion: 6, name: 'Champion League I', bonuses: 4 }
};

export const MEDALS_RANKING_MAP: Record<string, number[]> = {
  48000000: [34, 32, 30, 28, 26, 24, 22, 20],
  48000001: [34, 32, 30, 28, 26, 24, 22, 20],
  48000002: [46, 44, 42, 40, 38, 36, 34, 32],
  48000003: [58, 56, 54, 52, 50, 48, 46, 44],
  48000004: [76, 73, 70, 67, 64, 61, 58, 55],
  48000005: [94, 91, 88, 85, 82, 79, 76, 73],
  48000006: [112, 109, 106, 103, 100, 97, 94, 91],
  48000007: [136, 132, 128, 124, 120, 116, 112, 108],
  48000008: [160, 156, 152, 148, 144, 140, 136, 132],
  48000009: [184, 180, 176, 172, 168, 164, 160, 156],
  48000010: [214, 209, 204, 199, 194, 189, 184, 179],
  48000011: [244, 239, 234, 229, 224, 219, 214, 209],
  48000012: [274, 269, 264, 259, 254, 249, 244, 239],
  48000013: [310, 304, 298, 292, 286, 280, 274, 268],
  48000014: [346, 340, 334, 328, 322, 316, 310, 304],
  48000015: [382, 376, 370, 364, 358, 352, 346, 340],
  48000016: [424, 417, 410, 403, 396, 389, 382, 375],
  48000017: [466, 459, 452, 445, 438, 431, 424, 417],
  48000018: [508, 501, 494, 487, 480, 473, 466, 459]
};

export const MEDALS_PERCENTAGE_MAP: Record<string, number> = {
  '0': 20,
  '1': 30,
  '2': 40,
  '3': 50,
  '4': 60,
  '5': 70,
  '6': 80,
  '7': 90,
  '8': 100
};

export const BUILDER_BASE_LEAGUES = [
  {
    id: 44000000,
    name: 'Wood League V'
  },
  {
    id: 44000001,
    name: 'Wood League IV'
  },
  {
    id: 44000002,
    name: 'Wood League III'
  },
  {
    id: 44000003,
    name: 'Wood League II'
  },
  {
    id: 44000004,
    name: 'Wood League I'
  },
  {
    id: 44000005,
    name: 'Clay League V'
  },
  {
    id: 44000006,
    name: 'Clay League IV'
  },
  {
    id: 44000007,
    name: 'Clay League III'
  },
  {
    id: 44000008,
    name: 'Clay League II'
  },
  {
    id: 44000009,
    name: 'Clay League I'
  },
  {
    id: 44000010,
    name: 'Stone League V'
  },
  {
    id: 44000011,
    name: 'Stone League IV'
  },
  {
    id: 44000012,
    name: 'Stone League III'
  },
  {
    id: 44000013,
    name: 'Stone League II'
  },
  {
    id: 44000014,
    name: 'Stone League I'
  },
  {
    id: 44000015,
    name: 'Copper League V'
  },
  {
    id: 44000016,
    name: 'Copper League IV'
  },
  {
    id: 44000017,
    name: 'Copper League III'
  },
  {
    id: 44000018,
    name: 'Copper League II'
  },
  {
    id: 44000019,
    name: 'Copper League I'
  },
  {
    id: 44000020,
    name: 'Brass League III'
  },
  {
    id: 44000021,
    name: 'Brass League II'
  },
  {
    id: 44000022,
    name: 'Brass League I'
  },
  {
    id: 44000023,
    name: 'Iron League III'
  },
  {
    id: 44000024,
    name: 'Iron League II'
  },
  {
    id: 44000025,
    name: 'Iron League I'
  },
  {
    id: 44000026,
    name: 'Steel League III'
  },
  {
    id: 44000027,
    name: 'Steel League II'
  },
  {
    id: 44000028,
    name: 'Steel League I'
  },
  {
    id: 44000029,
    name: 'Titanium League III'
  },
  {
    id: 44000030,
    name: 'Titanium League II'
  },
  {
    id: 44000031,
    name: 'Titanium League I'
  },
  {
    id: 44000032,
    name: 'Platinum League III'
  },
  {
    id: 44000033,
    name: 'Platinum League II'
  },
  {
    id: 44000034,
    name: 'Platinum League I'
  },
  {
    id: 44000035,
    name: 'Emerald League III'
  },
  {
    id: 44000036,
    name: 'Emerald League II'
  },
  {
    id: 44000037,
    name: 'Emerald League I'
  },
  {
    id: 44000038,
    name: 'Ruby League III'
  },
  {
    id: 44000039,
    name: 'Ruby League II'
  },
  {
    id: 44000040,
    name: 'Ruby League I'
  },
  {
    id: 44000041,
    name: 'Diamond League'
  }
];

export const BUILDER_BASE_LEAGUES_MAP = BUILDER_BASE_LEAGUES.reduce<Record<string, string>>((record, league) => {
  record[league.id] = league.name;
  return record;
}, {});

export const calculateCWLMedals = (leagueId: string, stars: number, rank: number) => {
  const percentage = MEDALS_PERCENTAGE_MAP[Math.min(8, stars)];
  const ranks = MEDALS_RANKING_MAP[leagueId];
  const rankMedals = ranks[rank - 1];
  const totalMedals = Math.round((rankMedals * percentage) / 100);
  return totalMedals;
};

export const getHttpStatusText = (code: number, locale: string) => i18next.t(`common.status_code.${code}`, { lng: locale });

export const getInviteLink = (id: string, guildId?: string, noPermissions = false) => {
  const query = new URLSearchParams({
    client_id: id,
    scope: 'bot applications.commands',
    permissions: noPermissions ? '0' : BIT_FIELD.toString(),
    ...(guildId ? { guild_id: guildId } : {})
  }).toString();
  return `https://discord.com/api/oauth2/authorize?${query}`;
};

export function missingPermissions(channel: GuildTextBasedChannel, member: GuildMember | User, permissions: PermissionsString[]) {
  const missingPerms = channel.permissionsFor(member)!.missing(permissions);
  return mapMissingPermissions(missingPerms);
}

export function mapMissingPermissions(missing: PermissionsString[]) {
  const missingPerms = missing.map((str) => {
    if (str === 'ManageGuild') return '**Manage Server**';
    return `**${str
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .trim()
      .replace(/\b(\w)/g, (char) => char.toUpperCase())}**`;
  });

  return {
    missing: Boolean(missingPerms.length > 0),
    permissionStrings: missingPerms,
    missingPerms:
      missingPerms.length > 1
        ? `${missingPerms.slice(0, -1).join(', ')} and ${missingPerms.slice(-1)[0]!} permissions`
        : `${missingPerms[0]!} permission`
  };
}
