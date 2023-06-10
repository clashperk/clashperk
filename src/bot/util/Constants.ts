import { GuildMember, GuildTextBasedChannel, PermissionsBitField, PermissionsString, User } from 'discord.js';
import i18next from 'i18next';

export const status = (code: number, locale: string) => i18next.t(`common.status_code.${code}`, { lng: locale });

export const RTL_LANGUAGE_SAMPLE = 'مرحبا بالعالم';

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

export const enum Collections {
	CLAN_STORES = 'ClanStores',
	DONATION_LOGS = 'DonationLogs',
	LAST_SEEN_LOGS = 'LastSeenLogs',
	CLAN_GAMES_LOGS = 'ClanGamesLogs',
	CLAN_EMBED_LOGS = 'ClanEmbedLogs',
	CLAN_FEED_LOGS = 'ClanFeedLogs',
	JOIN_LEAVE_LOGS = 'JoinLeaveLogs',
	CLAN_WAR_LOGS = 'ClanWarLogs',
	LEGEND_LOGS = 'LegendLogs',
	LEGEND_ATTACKS = 'LegendAttacks',

	CAPITAL_LOGS = 'CapitalLogs',

	EVENT_LOGS = 'EventLogs',

	FLAGS = 'Flags',

	PLAYER_LINKS = 'PlayerLinks',
	USERS = 'Users',

	REMINDERS = 'Reminders',
	SCHEDULERS = 'Schedulers',
	RAID_REMINDERS = 'RaidReminders',
	CG_REMINDERS = 'ClanGamesReminders',
	CG_SCHEDULERS = 'ClanGamesSchedulers',
	RAID_SCHEDULERS = 'RaidSchedulers',

	WAR_BASE_CALLS = 'WarBaseCalls',

	PATRONS = 'Patrons',
	SETTINGS = 'Settings',
	LAST_SEEN = 'LastSeen',
	CLAN_WARS = 'ClanWars',
	CLAN_GAMES = 'ClanGames',
	CWL_GROUPS = 'CWLGroups',

	PLAYER_RANKS = 'PlayerRanks',
	CAPITAL_RANKS = 'CapitalRanks',
	CLAN_RANKS = 'ClanRanks',

	GUILD_EVENTS = 'GuildEvents',

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

export enum ElasticIndex {
	USER_LINKED_PLAYERS = 'user_linked_players',
	USER_LINKED_CLANS = 'user_linked_clans',
	GUILD_LINKED_CLANS = 'guild_linked_clans',
	RECENT_PLAYERS = 'recently_searched_players',
	RECENT_CLANS = 'recently_searched_clans'
}

export const enum WarType {
	REGULAR = 1,
	FRIENDLY,
	CWL
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
	CLAN_EVENT_LOG = 1 << 13
}

export const enum Settings {
	BOT_ADMIN_ROLE = 'botAdminRole',
	PREFIX = 'prefix',
	COLOR = 'color',
	MANAGER_ROLE = 'managerRole',
	CLAN_LIMIT = 'clanLimit',
	USER_BLACKLIST = 'blacklist',
	GUILD_BLACKLIST = 'guildBans',
	EVENTS_CHANNEL = 'eventsChannel',
	TOWN_HALL_ROLES = 'townHallRoles',
	LEAGUE_ROLES = 'leagueRoles',
	ROLE_REFRESHED = 'roleRefreshed',
	LINK_EMBEDS = 'linkEmbeds',
	WEBHOOK_LIMIT = 'webhookLimit',
	ALLOW_EXTERNAL_ACCOUNTS = 'allowExternalAccounts',
	ALLOW_EXTERNAL_ACCOUNTS_LEAGUE = 'allowExternalAccountsLeague',
	CLAN_GAMES_EXCEPTIONAL_MONTHS = 'clanGamesExceptionalMonths',
	CLAN_GAMES_REMINDER_TIMESTAMP = 'clanGamesReminderTimestamp',
	NICKNAME_EXPRESSION = 'nicknameExpression',
	AUTO_NICKNAME = 'autoNickname'
}

export function missingPermissions(channel: GuildTextBasedChannel, member: GuildMember | User, permissions: PermissionsString[]) {
	const missingPerms = channel
		.permissionsFor(member)!
		.missing(permissions)
		.map((str) => {
			if (str === 'ViewChannel') return '**Read Messages**';
			if (str === 'SendTTSMessages') return '**Send TTS Messages**';
			if (str === 'UseVAD') return '**Use VAD**';
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

export const URLS = {
	PATREON: 'https://www.patreon.com/clashperk',
	SUPPORT_SERVER: 'https://discord.gg/ppuppun'
};

export const attackCounts: Record<string, string> = {
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
};

export const BOOST_DURATION = 3 * 24 * 60 * 60 * 1000;

export const MAX_TOWN_HALL_LEVEL = 15;

export const MAX_CLAN_SIZE = 50;

export const LEGEND_LEAGUE_ID = 29000022;

export const BIT_FIELD = new PermissionsBitField(292997688385n).bitfield;

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

export const PLAYER_LEAGUE_NAMES = Array.from(new Set(Object.values(PLAYER_LEAGUE_MAPS)));

export const locales: Record<string, string> = {
	'en-US': 'English, US',
	'en-GB': 'English, UK',
	'bg': 'Bulgarian',
	'zh-CN': 'Chinese, China',
	'zh-TW': 'Chinese, Taiwan',
	'hr': 'Croatian',
	'cs': 'Czech',
	'da': 'Danish',
	'nl': 'Dutch',
	'fi': 'Finnish',
	'fr': 'French',
	'de': 'German',
	'el': 'Greek',
	'hi': 'Hindi',
	'hu': 'Hungarian',
	'it': 'Italian',
	'ja': 'Japanese',
	'ko': 'Korean',
	'lt': 'Lithuanian',
	'no': 'Norwegian',
	'pl': 'Polish',
	'pt-BR': 'Portuguese, Brazilian',
	'ro': 'Romanian, Romania',
	'ru': 'Russian',
	'es-ES': 'Spanish',
	'sv-SE': 'Swedish',
	'th': 'Thai',
	'tr': 'Turkish',
	'uk': 'Ukrainian',
	'vi': 'Vietnamese'
};

export const CLAN_GAMES_MINIMUM_POINTS = [
	1, 50, 100, 250, 500, 750, 1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000, 3250, 3500, 3750, 4000, 4500, 5000
];

export const ClanFeedLogTypes = {
	TownHallUpgrade: 'TOWN_HALL_UPGRADE',
	WarPreferenceChange: 'WAR_PREFERENCE_CHANGE',
	PlayerNameChange: 'PLAYER_NAME_CHANGE',
	DonationReset: 'PLAYER_DONATION_RESET',
	RoleChange: 'PLAYER_ROLE_CHANGE',
	SeasonBestPlayers: 'SEASON_BEST_PLAYERS'
} as const;

export const DeepLinkTypes = {
	OpenInGame: 'OPEN_IN_GAME',
	OpenInCOS: 'OPEN_IN_COS'
} as const;

export const WarFeedLogTypes = {
	RegularWarEmbed: 'REGULAR_EMBED',
	MissedAttackEmbed: 'MISSED_ATTACK_EMBED',
	CWLWarEmbed: 'CWL_WAR_EMBED',
	FriendlyWarEmbed: 'FRIENDLY_WAR_EMBED'
} as const;

export const enum DonationLogFrequencyTypes {
	Instant = 'INSTANT',
	Daily = 'DAILY',
	Weekly = 'WEEKLY',
	Monthly = 'MONTHLY'
}

export const URL_REGEX = /^(http(s)?:\/\/)[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:\/?#[\]@!\$&'\(\)\*\+,;=.]+$/;

export const UnrankedCapitalLeagueId = 85000000;

export const CapitalLeagueMap: Record<string, string> = {
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

export const PlayerLeagueMap: Record<string, string> = {
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

export const UnrankedWarLeagueId = 48000000;

export const WarLeagueMap: Record<string, string> = {
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

export const promotionMap: Record<string, { promotion: number; demotion: number; name: string }> = {
	48000000: { promotion: 3, demotion: 9, name: 'Unranked' },
	48000001: { promotion: 3, demotion: 9, name: 'Bronze League III' },
	48000002: { promotion: 3, demotion: 8, name: 'Bronze League II' },
	48000003: { promotion: 3, demotion: 8, name: 'Bronze League I' },
	48000004: { promotion: 2, demotion: 8, name: 'Silver League III' },
	48000005: { promotion: 2, demotion: 7, name: 'Silver League II' },
	48000006: { promotion: 2, demotion: 7, name: 'Silver League I' },
	48000007: { promotion: 2, demotion: 7, name: 'Gold League III' },
	48000008: { promotion: 2, demotion: 7, name: 'Gold League II' },
	48000009: { promotion: 2, demotion: 7, name: 'Gold League I' },
	48000010: { promotion: 2, demotion: 7, name: 'Crystal League III' },
	48000011: { promotion: 2, demotion: 7, name: 'Crystal League II' },
	48000012: { promotion: 1, demotion: 7, name: 'Crystal League I' },
	48000013: { promotion: 1, demotion: 7, name: 'Master League III' },
	48000014: { promotion: 1, demotion: 7, name: 'Master League II' },
	48000015: { promotion: 1, demotion: 7, name: 'Master League I' },
	48000016: { promotion: 1, demotion: 7, name: 'Champion League III' },
	48000017: { promotion: 1, demotion: 7, name: 'Champion League II' },
	48000018: { promotion: 0, demotion: 6, name: 'Champion League I' }
};

export const medalsRankingMap: Record<string, number[]> = {
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

export const medalsPercentageMap: Record<string, number> = {
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

export const calculateCWLMedals = (leagueId: string, stars: number, rank: number) => {
	const percentage = medalsPercentageMap[Math.min(8, stars)];
	const ranks = medalsRankingMap[leagueId];
	const rankMedals = ranks[rank - 1];
	const totalMedals = Math.round((rankMedals * percentage) / 100);
	return totalMedals;
};
