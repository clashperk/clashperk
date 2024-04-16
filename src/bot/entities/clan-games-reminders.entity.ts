import { ObjectId } from 'mongodb';

export interface ClanGamesRemindersEntity {
	_id: ObjectId;
	guild: string;
	channel: string;
	message: string;
	duration: number;
	allMembers: boolean;
	webhook?: { id: string; token: string } | null;
	threadId?: string;
	minPoints: number;
	linkedOnly?: boolean;
	roles: string[];
	clans: string[];
	createdAt: Date;
}
