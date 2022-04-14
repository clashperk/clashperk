import { GuildMember, Permissions, PermissionString, TextChannel } from 'discord.js';

export const codes: Record<string, string> = {
	504: '504 Request Timeout',
	400: 'Client provided incorrect parameters for the request.',
	403: 'Access denied, either because of missing/incorrect credentials or used API token does not grant access to the requested resource.',
	404: 'No matches found for the specified tag!',
	429: 'Request was throttled, because amount of requests was above the threshold defined for the used API token.',
	500: 'Unknown error happened when handling the request.',
	503: 'Service is temporarily unavailable because of maintenance.'
};

export const status = (code: number) => codes[code];

export const enum Collections {
	CLAN_STORES = 'ClanStores',
	DONATION_LOGS = 'DonationLogs',
	LAST_SEEN_LOGS = 'LastSeenLogs',
	CLAN_GAMES_LOGS = 'ClanGamesLogs',
	CLAN_EMBED_LOGS = 'ClanEmbedLogs',
	CLAN_FEED_LOGS = 'ClanFeedLogs',
	CLAN_WAR_LOGS = 'ClanWarLogs',

	EVENT_LOGS = 'EventLogs',

	FLAGS = 'Flags',

	LINKED_PLAYERS = 'LinkedPlayers',
	LINKED_CHANNELS = 'LinkedChannels',
	REMINDERS = 'Reminders',
	REMINDERS_TEMP = 'RemindersTemp',

	PATRONS = 'Patrons',
	SETTINGS = 'Settings',
	LAST_SEEN = 'LastSeen',
	CLAN_WARS = 'ClanWars',
	CLAN_GAMES = 'ClanGames',
	CWL_GROUPS = 'CWLGroups',
	CLAN_MEMBERS = 'ClanMembers',

	PLAYERS = 'Players',
	CLANS = 'Clans',

	BOT_GROWTH = 'BotGrowth',
	BOT_USAGE = 'BotUsage',
	BOT_GUILDS = 'BotGuilds',
	BOT_USERS = 'BotUsers',
	BOT_STATS = 'BotStats',
	BOT_COMMANDS = 'BotCommands',
	BOT_INTERACTIONS = 'BotInteractions'
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
	SERVER_LINKED = 1 << 7
}

export const enum Settings {
	PREFIX = 'prefix',
	COLOR = 'color',
	CLAN_LIMIT = 'clanLimit',
	USER_BLACKLIST = 'blacklist',
	GUILD_BLACKLIST = 'guildBans',
	EVENTS_CHANNEL = 'eventsChannel'
}

export function missingPermissions(channel: TextChannel, member: GuildMember, permissions: string[]) {
	const missingPerms = channel
		.permissionsFor(member)!
		.missing(permissions as PermissionString[])
		.map((str) => {
			if (str === 'VIEW_CHANNEL') return '`Read Messages`';
			return `\`${str
				.replace(/_/g, ' ')
				.toLowerCase()
				.replace(/\b(\w)/g, (char) => char.toUpperCase())}\``;
		});

	return {
		missing: Boolean(missingPerms.length > 0),
		missingPerms:
			missingPerms.length > 1
				? `${missingPerms.slice(0, -1).join(', ')} and ${missingPerms.slice(-1)[0]} permissions`
				: `${missingPerms[0]} permission`
	};
}

export const URLS = {
	PATREON: 'https://www.patreon.com/clashperk',
	SUPPORT_SERVER: 'https://discord.gg/ppuppun'
};

export const BOOST_DURATION = 3 * 24 * 60 * 60 * 1000;

export const BIT_FIELD = new Permissions([
	'CREATE_INSTANT_INVITE',
	'ADD_REACTIONS',
	'VIEW_CHANNEL',
	'SEND_MESSAGES',
	'EMBED_LINKS',
	'ATTACH_FILES',
	'READ_MESSAGE_HISTORY',
	'USE_EXTERNAL_EMOJIS',
	'MANAGE_MESSAGES',
	'MANAGE_WEBHOOKS',
	'MANAGE_NICKNAMES',
	'MANAGE_ROLES',
	'MANAGE_THREADS',
	'SEND_MESSAGES_IN_THREADS'
]).bitfield;
