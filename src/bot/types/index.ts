import { ObjectId } from 'mongodb';

export const achievements = {
	'Most Valuable Clanmate': 'capitalGoldContributions',
	'Aggressive Capitalism': 'clanCapitalRaids',
	'Games Champion': 'clanGamesPoints',

	'Heroic Heist': 'darkElixirLoots',
	'Elixir Escapade': 'elixirLoots',
	'Gold Grab': 'goldLoots',

	// 'Well Seasoned': 'seasonChallengePoints',

	'Siege Sharer': 'siegeMachinesDonations',
	'Friend in Need': 'troopsDonations',
	'Sharing is caring': 'spellsDonations',

	'War Hero': 'clanWarStars',
	'War League Legend': 'clanWarLeagueStars'
} as const;

type GetDictValue<T extends string, O> = T extends keyof O ? O[T] : never;
export type AchievementsValues = GetDictValue<keyof typeof achievements, typeof achievements>;
type AchievementsMap = { [key in AchievementsValues]: { initial: number; current: number } };

export interface PlayerSeasonModel extends AchievementsMap {
	name: string;
	tag: string;
	season: string;
	townHallLevel: number;
	builderHallLevel: number;
	attackWins: number;
	defenseWins: number;
	versusTrophies: {
		initial: number;
		current: number;
	};
	versusBattleWins: {
		initial: number;
		current: number;
	};
	trophies: {
		initial: number;
		current: number;
	};
	clans: Record<
		string,
		{
			tag: string;
			name: string;
			donations: {
				current: number;
				total: number;
			};
			donationsReceived: {
				current: number;
				total: number;
			};
			createdTimestamp: number;
			updatedTimestamp: number;
		}
	>;
	__clans: string[];
	updatedAt: Date;
	createdAt: Date;
}

export interface UserInfoModel {
	_id: ObjectId;
	userId: string;
	username?: string;
	clan?: {
		tag: string;
		name?: string;
	};
	timezone?: {
		id: string;
		name: string;
		offset: number;
		location: string;
	};
}

export interface PlayerLinks {
	userId: string;
	username: string;
	tag: string;
	name: string;
	order: number;
	verified: boolean;
	createdAt: Date;
}

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

export interface PlayerModel {
	name: string;
	tag: string;
	lastSeen: Date;
	season: string;
	capitalGoldContributions: {
		initial: number;
		current: number;
	};
	clanCapitalRaids: {
		initial: number;
		current: number;
	};
	clanGamesPoints: {
		initial: number;
		current: number;
	};
	superTroops?: { name: string; timestamp: number }[];
	updatedAt?: Date;
	createdAt: Date;
}

export interface ClanGamesModel {
	name: string;
	tag: string;
	season: string;
	initial: number;
	current: number;
	clans: { name: string; tag: string; score: number; timestamp: number }[];
	__clans: string[];
	completedAt: Date | null;
	updatedAt: Date;
	createdAt: Date;
}

export interface ClanCapitalRaidAttackData {
	name: string;
	tag: string;
	weekId: string;
	members: RaidAttack[];
	updatedAt: Date;
	createdAt: Date;
}

export interface RaidAttack {
	name: string;
	tag: string;
	attacks: number;
	attackLimit: number;
	bonusAttackLimit: number;
	capitalResourcesLooted: number;
}

export interface ClanCapitalGoldModel {
	name: string;
	tag: string;
	season: string;
	initial: number;
	current: number;
	clans: { name: string; tag: string; contributed: number; timestamp: number }[];
	__clans: string[];
	completedAt: Date;
	updatedAt: Date;
	createdAt: Date;
}
