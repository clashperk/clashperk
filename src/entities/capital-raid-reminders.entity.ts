import { ObjectId } from 'mongodb';

export interface RaidRemindersEntity {
  _id: ObjectId;
  guild: string;
  channel: string;
  message: string;
  duration: number;
  allMembers: boolean;
  minThreshold: number;
  webhook?: { id: string; token: string } | null;
  threadId?: string;
  linkedOnly?: boolean;
  roles: string[];
  clans: string[];
  remaining: number[];
  createdAt: Date;
}
