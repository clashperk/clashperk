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
