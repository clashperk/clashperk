import { TextChannel, User, PermissionString, MessageEmbed } from 'discord.js';
import { Clan } from 'clashofclans.js';

export const codes: { [key: string]: string } = {
	504: '504 Request Timeout',
	400: 'Client provided incorrect parameters for the request.',
	403: 'Access denied, either because of missing/incorrect credentials or used API token does not grant access to the requested resource.',
	404: 'No matches found for the specified tag!',
	429: 'Request was throttled, because amount of requests was above the threshold defined for the used API token.',
	500: 'Unknown error happened when handling the request.',
	503: 'Service is temporarily unavailable because of maintenance.'
};

export const status = (code: number) => codes[code];

export enum Collections {
	// LOG_CHANNELS
	CLAN_STORES = 'ClanStores',
	DONATION_LOGS = 'DonationLogs',
	LAST_SEEN_LOGS = 'LastSeenLogs',
	CLAN_GAMES_LOGS = 'ClanGamesLogs',
	CLAN_EMBED_LOGS = 'ClanEmbedLogs',
	CLAN_FEED_LOGS = 'ClanFeedLogs',
	CLAN_WAR_LOGS = 'ClanWarLogs',

	EVENT_LOGS = 'EventLogs',

	// FLAGS
	FLAGS = 'Flags',

	// LINKED_DATA
	LINKED_PLAYERS = 'LinkedPlayers',
	LINKED_CHANNELS = 'LinkedChannels',
	REMINDERS = 'Reminders',
	REMINDERS_TEMP = 'RemindersTemp',

	// LARGE_DATA
	PATRONS = 'Patrons',
	SETTINGS = 'Settings',
	LAST_SEEN = 'LastSeen',
	CLAN_WARS = 'ClanWars',
	CLAN_GAMES = 'ClanGames',
	CWL_GROUPS = 'CWLGroups',
	CLAN_MEMBERS = 'ClanMembers',

	PLAYERS = 'Players',
	CLANS = 'Clans',

	// BOT_STATS
	BOT_GROWTH = 'BotGrowth',
	BOT_USAGE = 'BotUsage',
	BOT_GUILDS = 'BotGuilds',
	BOT_USERS = 'BotUsers',
	BOT_STATS = 'BotStats',
	BOT_INTERACTIONS = 'BotInteractions'
}

export enum WarType {
	REGULAR = 1,
	FRIENDLY,
	CWL
}

export enum Flags {
	DONATION_LOG = 1 << 0,
	CLAN_FEED_LOG = 1 << 1,
	LAST_SEEN_LOG = 1 << 2,
	CLAN_EMBED_LOG = 1 << 3,
	CLAN_GAMES_LOG = 1 << 4,
	CLAN_WAR_LOG = 1 << 5,
	CHANNEL_LINKED = 1 << 6
}

export enum Settings {
	PREFIX = 'prefix',
	COLOR = 'color',
	CLAN_LIMIT = 'clanLimit',
	USER_BLACKLIST = 'blacklist',
	GUILD_BLACKLIST = 'guildBans',
	EVENTS_CHANNEL = 'eventsChannel'
}

export const Messages = {
	COMPONENT: {
		EXPIRED: 'This component has expired, run the command again.',
		UNAUTHORIZED: 'You must run the command to interact with components.'
	}
};

export const STOP_REASONS = ['channelDelete', 'guildDelete', 'messageDelete'];

export const URLS = {
	PATREON: 'https://www.patreon.com/clashperk',
	SUPPORT_SERVER: 'https://discord.gg/ppuppun'
};

export const EMBEDS = {
	CLAN_LIMIT: (prefix: string) => new MessageEmbed()
		.setDescription([
			`You can only claim 2 clans per server!`,
			'',
			'**Want more than that?**',
			'Please consider supporting us on patreon!',
			'',
			'[Become a Patron](https://www.patreon.com/clashperk)',
			'',
			`Use \`${prefix}setup\` command to view all linked clans and \`${prefix}help remove\` to know about the process of removing any clan.`
		].join('\n')),

	VERIFY_CLAN: (clan: Clan, code: string, prefix: string) => new MessageEmbed()
		.setTitle(`${clan.name} (${clan.tag})`)
		.setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(clan.tag)}`)
		.setDescription([
			`${clan.description || 'No Description'}`,
			'\u200b'
		].join('\n'))
		.addField('Verify Your Clan', [
			'It\'s a security feature of the bot to ensure you are a **Leader** or **Co-Leader** in the clan.',
			'',
			'*You can use any of the following methods.*'
		].join('\n'))
		.addField('• Simplified', [
			'Verify your Player account using Player [API Token](https://link.clashofclans.com/?action=OpenMoreSettings) and run this command again.',
			`Type \`${prefix}verify\` to know more about the Player API Token. Run \`${prefix}verify #PLAYER_TAG TOKEN\` to quickly verify your player account.`,
			'\u200b'
		].join('\n'), true)
		.addField('• Manual', [
			`Add the code \`${code}\` at the end of the [Clan Description](https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(clan.tag)}) and run this command again.`,
			'If you\'ve already added the code, wait at least 2 minutes before you run the command again and you can remove the code after verification.'
		].join('\n'), true)
};

export function missingPermissions(channel: TextChannel, user: User, permissions: string[]) {
	const missingPerms = channel.permissionsFor(user)!.missing(permissions as PermissionString[])
		.map(str => {
			if (str === 'VIEW_CHANNEL') return '`Read Messages`';
			return `\`${str.replace(/_/g, ' ').toLowerCase().replace(/\b(\w)/g, char => char.toUpperCase())}\``;
		});

	return {
		missing: Boolean(missingPerms.length > 0),
		missingPerms: missingPerms.length > 1
			? `${missingPerms.slice(0, -1).join(', ')} and ${missingPerms.slice(-1)[0]} permissions`
			: `${missingPerms[0]} permission`
	};
}

export const leagueId = (trophies: number) => {
	let leagueId = 29000000;
	if (trophies <= 399) {
		leagueId = 29000000;
	} else if (trophies >= 400 && trophies <= 499) {
		leagueId = 29000001;
	} else if (trophies >= 500 && trophies <= 599) {
		leagueId = 29000002;
	} else if (trophies >= 600 && trophies <= 799) {
		leagueId = 29000003;
	} else if (trophies >= 800 && trophies <= 999) {
		leagueId = 29000004;
	} else if (trophies >= 1000 && trophies <= 1199) {
		leagueId = 29000005;
	} else if (trophies >= 1200 && trophies <= 1399) {
		leagueId = 29000006;
	} else if (trophies >= 1400 && trophies <= 1599) {
		leagueId = 29000007;
	} else if (trophies >= 1600 && trophies <= 1799) {
		leagueId = 29000008;
	} else if (trophies >= 1800 && trophies <= 1999) {
		leagueId = 29000009;
	} else if (trophies >= 2000 && trophies <= 2199) {
		leagueId = 29000010;
	} else if (trophies >= 2200 && trophies <= 2399) {
		leagueId = 29000011;
	} else if (trophies >= 2400 && trophies <= 2599) {
		leagueId = 29000012;
	} else if (trophies >= 2600 && trophies <= 2799) {
		leagueId = 29000013;
	} else if (trophies >= 2800 && trophies <= 2999) {
		leagueId = 29000014;
	} else if (trophies >= 3000 && trophies <= 3199) {
		leagueId = 29000015;
	} else if (trophies >= 3200 && trophies <= 3499) {
		leagueId = 29000016;
	} else if (trophies >= 3500 && trophies <= 3799) {
		leagueId = 29000017;
	} else if (trophies >= 3800 && trophies <= 4099) {
		leagueId = 29000018;
	} else if (trophies >= 4100 && trophies <= 4399) {
		leagueId = 29000019;
	} else if (trophies >= 4400 && trophies <= 4799) {
		leagueId = 29000020;
	} else if (trophies >= 4800 && trophies <= 4999) {
		leagueId = 29000021;
	} else if (trophies >= 5000) {
		leagueId = 29000022;
	}

	return leagueId;
};

export interface TroopJSON {
	[key: string]: {
		id: number;
		name: string;
		village: string;
		category: string;
		subCategory: string;
		unlock: {
			hall: number;
			cost: number;
			time: number;
			resource: string;
			building: string;
			buildingLevel: number;
		};
		upgrade: {
			cost: number[];
			time: number[];
			resource: string;
		};
		seasonal: boolean;
		levels: number[];
	}[];
}

export interface TroopInfo {
	type: string;
	village: string;
	name: string;
	level: number;
	hallMaxLevel: number;
	maxLevel: number;
}

export const TROOPS_HOUSING = [
	{
		hall: 1,
		troops: 20,
		spells: 0
	},
	{
		hall: 2,
		troops: 30,
		spells: 0
	},
	{
		hall: 3,
		troops: 70,
		spells: 0
	},
	{
		hall: 4,
		troops: 80,
		spells: 0
	},
	{
		hall: 5,
		troops: 135,
		spells: 2
	},
	{
		hall: 6,
		troops: 150,
		spells: 4
	},
	{
		hall: 7,
		troops: 200,
		spells: 6
	},
	{
		hall: 8,
		troops: 200,
		spells: 7
	},
	{
		hall: 9,
		troops: 220,
		spells: 9
	},
	{
		hall: 10,
		troops: 240,
		spells: 11
	},
	{
		hall: 11,
		troops: 260,
		spells: 11
	},
	{
		hall: 12,
		troops: 280,
		spells: 11
	},
	{
		hall: 13,
		troops: 300,
		spells: 11
	},
	{
		hall: 14,
		troops: 300,
		spells: 11
	}
];
