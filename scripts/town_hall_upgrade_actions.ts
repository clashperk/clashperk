process.env.TZ = 'UTC';
import { Collections, MAX_TOWN_HALL_LEVEL } from '@app/constants';
import { ClanWarRemindersEntity } from '@app/entities';
import 'dotenv/config';
import { mongoClient } from '../src/struct/database.js';
import { IRoster } from '../src/struct/roster-manager.js';

async function main() {
  await mongoClient.connect().then(() => console.log('MongoDB Connected!'));
  const db = mongoClient.db('clashperk');

  const pevTownHallLevel = MAX_TOWN_HALL_LEVEL - 1;

  await db.collection<ClanWarRemindersEntity>(Collections.WAR_REMINDERS).updateMany(
    {
      $and: [{ townHalls: pevTownHallLevel }, { townHalls: { $ne: MAX_TOWN_HALL_LEVEL } }]
    },
    { $push: { townHalls: MAX_TOWN_HALL_LEVEL } }
  );
  console.log('Updated WAR_REMINDERS');

  await db.collection<ClanWarRemindersEntity>(Collections.CLAN_GAMES_REMINDERS).updateMany(
    {
      $and: [{ townHalls: pevTownHallLevel }, { townHalls: { $ne: MAX_TOWN_HALL_LEVEL } }]
    },
    { $push: { townHalls: MAX_TOWN_HALL_LEVEL } }
  );
  console.log('Updated CLAN_GAMES_REMINDERS');

  await db.collection<ClanWarRemindersEntity>(Collections.RAID_REMINDERS).updateMany(
    {
      $and: [{ townHalls: pevTownHallLevel }, { townHalls: { $ne: MAX_TOWN_HALL_LEVEL } }]
    },
    { $push: { townHalls: MAX_TOWN_HALL_LEVEL } }
  );
  console.log('Updated RAID_REMINDERS');

  await db.collection<IRoster>(Collections.ROSTERS).updateMany(
    {
      maxTownHall: pevTownHallLevel
    },
    { $set: { maxTownHall: MAX_TOWN_HALL_LEVEL } }
  );
  console.log('Updated ROSTERS');
}
main();
