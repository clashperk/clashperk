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
