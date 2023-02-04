import { GuildMember, GuildTextBasedChannel, PermissionsBitField, PermissionsString, User } from 'discord.js';
import i18next from 'i18next';

export const status = (code: number, locale: string) => i18next.t(`common.status_code.${code}`, { lng: locale });

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

	PATRONS = 'Patrons',
	SETTINGS = 'Settings',
	LAST_SEEN = 'LastSeen',
	CLAN_WARS = 'ClanWars',
	CLAN_GAMES = 'ClanGames',
	CWL_GROUPS = 'CWLGroups',

	PLAYER_RANKS = 'PlayerRanks',

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
	CAPITAL_LOG = 1 << 12
}

export const enum Settings {
	BOT_ADMIN_ROLE = 'botAdminRole',
	PREFIX = 'prefix',
	COLOR = 'color',
	CLAN_LIMIT = 'clanLimit',
	USER_BLACKLIST = 'blacklist',
	GUILD_BLACKLIST = 'guildBans',
	EVENTS_CHANNEL = 'eventsChannel',
	TOWN_HALL_ROLES = 'townHallRoles',
	LEAGUE_ROLES = 'leagueRoles',
	ROLE_REFRESHED = 'roleRefreshed',
	ALLOW_EXTERNAL_ACCOUNTS = 'allowExternalAccounts',
	ALLOW_EXTERNAL_ACCOUNTS_LEAGUE = 'allowExternalAccountsLeague'
}

export function missingPermissions(channel: GuildTextBasedChannel, member: GuildMember | User, permissions: PermissionsString[]) {
	const missingPerms = channel
		.permissionsFor(member)!
		.missing(permissions)
		.map((str) => {
			if (str === 'ViewChannel') return '`Read Messages`';
			if (str === 'SendTTSMessages') return '`Send TTS Messages`';
			if (str === 'UseVAD') return '`Use VAD`';
			if (str === 'ManageGuild') return '`Manage Server`';
			return `\`${str
				.replace(/([A-Z])/g, ' $1')
				.toLowerCase()
				.trim()
				.replace(/\b(\w)/g, (char) => char.toUpperCase())}\``;
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
