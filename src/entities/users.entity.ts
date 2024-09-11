import { ObjectId } from 'mongodb';

export interface UsersEntity {
  _id: ObjectId;
  userId: string;
  username?: string;
  displayName?: string;
  discriminator?: string;
  clan?: {
    tag: string;
    name?: string;
  };
  lastSearchedClanTag?: string;
  lastSearchedPlayerTag?: string;
  timezone?: UserTimezone;
}

export interface UserTimezone {
  id: string;
  name: string;
  offset: number;
  location: string;
}
