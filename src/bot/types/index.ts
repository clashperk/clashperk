import { ObjectId } from 'mongodb';

export interface UserInfo {
	_id: ObjectId;
	user: string;
	user_tag?: string;
	clan?: {
		tag: string;
		name?: string;
	};
	entries: {
		tag: string;
		name?: string;
		verified: boolean;
		unknown: boolean;
	}[];
	timezone?: {
		id: string;
		name: string;
		offset: number;
	};
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

export interface PlayerSeason {
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

export interface ClanGamesData {
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

export interface ClanCapitalRaidsData {
	name: string;
	tag: string;
	season: string;
	initial: number;
	current: number;
	clans: { name: string; tag: string; collected: number; timestamp: number }[];
	__clans: string[];
	completedAt: Date;
	updatedAt: Date;
	createdAt: Date;
}

export interface ClanCapitalGoldData {
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
