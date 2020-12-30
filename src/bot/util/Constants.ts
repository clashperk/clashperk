import { TextChannel, User, PermissionString, MessageEmbed } from 'discord.js';
import { Clan } from 'clashofclans.js';

export const codes = {
	504: '504 Request Timeout',
	400: 'Client provided incorrect parameters for the request.',
	403: 'Access denied, either because of missing/incorrect credentials or used API token does not grant access to the requested resource.',
	404: 'Looks like the tag is invalid! Try again?',
	429: 'Request was throttled, because amount of requests was above the threshold defined for the used API token.',
	500: 'Unknown error happened when handling the request.',
	503: 'Service is temporarily unavailable because of maintenance.'
};

export interface KeyValue {
	[key: string]: string;
}

export const COLLECTIONS = {
	CLAN_STORES: 'clanstores',
	DONATION_LOGS: 'donationlogs',
	LAST_ONLINE_LOGS: 'lastonlinelogs',
	CLAN_GAMES_LOGS: 'clangameslogs',
	CLAN_EMBED_LOGS: 'clanembedlogs',
	PLAYER_LOGS: 'playerlogs',
	FLAGGED_USERS: 'flaggedusers',
	LINKED_CLANS: 'linkedclans',
	LINKED_USERS: 'linkedusers',
	SETTINGS: 'settings',
	CLAN_WARS: 'clanwars',
	LAST_ONLINES: 'lastonlines',
	CLAN_WAR_STORES: 'clanwarstores',
	CLAN_GAMES: 'clangames',
	CWL_WAR_TAGS: 'cwlwartags',
	CLAN_MEMBERS: 'clanmembers',
	BOT_GROWTH: 'botgrowth',
	BOT_USAGE: 'botusage',
	BOT_GUILDS: 'botguilds',
	BOT_USERS: 'botusers',
	PATRONS: 'patrons',
	CLAN_WAR_LOGS: 'clanwarlogs'
};

export const SETTINGS = {
	PREFIX: 'prefix',
	COLOR: 'color',
	LIMIT: 'clanLimit'
};

export const Op = {
	DONATION_LOG: 1 << 0,
	CLAN_MEMBER_LOG: 1 << 1,
	LAST_ONLINE_LOG: 1 << 2,
	CLAN_EMBED_LOG: 1 << 3,
	CLAN_GAMES_LOG: 1 << 4,
	CLAN_WAR_LOG: 1 << 5
};

export const EMBEDS = {
	CLAN_LIMIT: new MessageEmbed()
		.setDescription([
			`You can only claim 2 clans per server!`,
			'',
			'**Want more than that?**',
			'Please consider supporting us on patreon!',
			'',
			'[Become a Patron](https://www.patreon.com/clashperk)'
		]),

	VERIFY_CLAN: (clan: Clan, code: number) => new MessageEmbed()
		.setTitle(`${clan.name} (${clan.tag})`)
		.setURL(`https://link.clashofclans.com/?action=OpenClanProfile&tag=${encodeURIComponent(clan.tag)}`)
		.setThumbnail(clan.badgeUrls.small)
		.setDescription([
			'**Clan Description**',
			`${clan.description}`,
			'',
			'**Verify Your Clan**',
			`Add the code \`${code}\` at the end of the clan description. It's a security feature of the bot to ensure you are a Leader or Co-Leader in the clan.`,
			'If you\'ve already added the code please wait at least 2 min before you run the command again and remove the code after verification.'
		])
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

export const status = (code: number) => (codes as KeyValue)[code];

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
		name: string;
		village: string;
		productionBuilding: string;
		type: string;
		upgrade: {
			cost: number[];
			time: number[];
			resource: string;
		};
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
