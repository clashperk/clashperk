import { ObjectId } from 'mongodb';

export interface ClanWarRemindersEntity {
  _id: ObjectId;
  guild: string;
  channel: string;
  message: string;
  duration: number;
  disabled: boolean;
  webhook?: { id: string; token: string } | null;
  threadId?: string;
  roles: string[];
  townHalls: number[];
  linkedOnly?: boolean;
  smartSkip: boolean;
  silent: boolean;
  warTypes: string[];
  clans: string[];
  remaining: number[];
  createdAt: Date;
}
