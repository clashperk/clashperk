import { ObjectId } from 'mongodb';

export interface ClanStoresEntity {
  _id: ObjectId;
  uniqueId: number;
  name: string;
  tag: string;
  flag: number;
  alias?: string;
  nickname?: string;
  guild: string;
  patron: boolean;
  paused: boolean;
  active: boolean;
  verified: boolean;
  lastRan?: Date;
  channels?: string[];
  color?: number;
  order?: number;
  categoryId?: ObjectId | null;
  secureRole: boolean;
  warRole?: string;
  roles?: { coLeader?: string; admin?: string; member?: string; leader?: string; everyone?: string };
  createdAt: Date;
}
