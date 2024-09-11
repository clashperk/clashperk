import { ObjectId } from 'mongodb';

export interface ClanWarSchedulersEntity {
  _id: ObjectId;
  guild: string;
  key: string;
  name: string;
  tag: string;
  warTag?: string;
  duration: number;
  source?: string;
  reminderId: ObjectId;
  isFriendly: boolean;
  triggered: boolean;
  timestamp: Date;
  createdAt: Date;
}
