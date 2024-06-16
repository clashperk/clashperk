import { APIPlayer } from 'clashofclans.js';
import { ObjectId } from 'mongodb';
import { container } from 'tsyringe';
import Client from '../struct/Client.js';

export interface PlayerClanHistory {
  _id: ObjectId;
  playerTag: string;
  trackingId: ObjectId;
  clanTag: string;
  createdAt: Date;
}

export interface ClanPlayerHistory {
  _id: ObjectId;
  clanTag: string;
  playerTag: string;
  firstSeen: Date;
  trackingId: ObjectId;
  lastSeen: Date;
}

export async function track(entry: PlayerClanHistory | null, player: APIPlayer) {
  const client = container.resolve(Client);

  const players = client.db.collection<PlayerClanHistory>('playerClanHistory');
  const clans = client.db.collection<ClanPlayerHistory>('clanPlayerHistory');

  const clanTag = player.clan?.tag ?? '#00000';
  const trackingId = entry && entry.clanTag === clanTag ? entry.trackingId : new ObjectId();

  if (!entry || entry.clanTag !== clanTag) {
    await players.updateOne(
      { playerTag: player.tag },
      {
        $setOnInsert: {
          createdAt: new Date()
        },
        $set: {
          playerTag: player.tag,
          clanTag
        }
      },
      { upsert: true }
    );
  }

  await clans.updateOne(
    { playerTag: player.tag, trackingId },
    {
      $setOnInsert: {
        firstSeen: new Date()
      },
      $set: {
        playerTag: player.tag,
        clanTag: player.clan?.tag ?? '#00000',
        lastSeen: new Date()
      }
    },
    { upsert: true }
  );
}
