import { ObjectId } from 'mongodb';

export interface GlobalPlayersEntity {
  tag: string;
  name: string;
  clanTag: string;
  trackingId: ObjectId;
  createdAt: Date;
}
