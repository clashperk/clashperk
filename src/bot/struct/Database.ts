import { Collections } from '../util/Constants';
import { MongoClient, Db } from 'mongodb';

class MongoDB extends MongoClient {
	public constructor() {
		super(process.env.MONGODB_URL!);
	}

	public async connect() {
		return super.connect();
	}

	public async createIndex(db: Db) {
		return Promise.all([
			db.collection(Collections.BOT_GROWTH).createIndex({ key: 1 }, { unique: true }),

			db.collection(Collections.BOT_GUILDS).createIndexes([
				{
					key: { guild: 1 },
					unique: true
				},
				{
					key: { usage: 1 }
				}
			]),

			db.collection(Collections.BOT_INTERACTIONS).createIndex({ user: 1 }, { unique: true }),

			db.collection(Collections.BOT_STATS).createIndex({ name: 1 }, { unique: true }),

			db.collection(Collections.BOT_USAGE).createIndexes([
				{
					key: { key: 1 },
					unique: true
				}
			]),

			db.collection(Collections.BOT_USERS).createIndex({ user: 1, guild: 1 }, { unique: true }),

			db.collection(Collections.CWL_GROUPS).createIndexes([
				{
					key: { 'clans.tag': 1, 'season': 1 },
					unique: true
				},
				{
					key: { id: 1 }
				},
				{
					key: { createdAt: 1 }
				}
			]),

			db.collection(Collections.CLAN_GAMES).createIndexes([
				{
					key: { tag: 1, season: 1 },
					unique: true
				},
				{
					key: { tag: 1 }
				}
			]),

			db.collection(Collections.CLAN_MEMBERS).createIndexes([
				{
					key: { tag: 1, season: 1, clanTag: 1 },
					unique: true
				},
				{
					key: { season: 1, clanTag: 1 }
				},
				{
					key: { clanTag: 1 }
				}
			]),

			db.collection(Collections.CLAN_STORES).createIndexes([
				{
					key: { guild: 1, tag: 1 },
					unique: true
				},
				{
					key: { alias: 1 }
				},
				{
					key: { role_ids: 1 }
				},
				{
					key: { tag: 1 }
				},
				{
					key: { channels: 1 }
				}
			]),

			db.collection(Collections.CLAN_EMBED_LOGS).createIndexes([
				{
					key: { clan_id: 1 }
				},
				{
					key: { guild: 1, tag: 1 },
					unique: true
				}
			]),

			db.collection(Collections.CLAN_FEED_LOGS).createIndexes([
				{
					key: { clan_id: 1 }
				},
				{
					key: { guild: 1, tag: 1 },
					unique: true
				}
			]),

			db.collection(Collections.CLAN_GAMES_LOGS).createIndexes([
				{
					key: { clan_id: 1 }
				},
				{
					key: { guild: 1, tag: 1 },
					unique: true
				}
			]),

			db.collection(Collections.CLAN_WAR_LOGS).createIndexes([
				{
					key: { clan_id: 1 }
				},
				{
					key: { guild: 1, tag: 1 },
					unique: true
				}
			]),

			db.collection(Collections.LAST_SEEN_LOGS).createIndexes([
				{
					key: { clan_id: 1 }
				},
				{
					key: { guild: 1, tag: 1 },
					unique: true
				}
			]),

			db.collection(Collections.DONATION_LOGS).createIndexes([
				{
					key: { clan_id: 1 }
				},
				{
					key: { guild: 1, tag: 1 },
					unique: true
				}
			]),

			db.collection(Collections.CLAN_WARS).createIndexes([
				{
					key: { uid: 1 },
					unique: true
				},
				{
					key: { id: 1 }
				},
				{
					key: { 'clan.tag': 1 }
				},
				{
					key: { 'opponent.tag': 1 }
				},
				{
					key: { 'clan.members.tag': 1 }
				},
				{
					key: { 'opponent.members.tag': 1 }
				},
				{
					key: { leagueGroupId: 1 },
					sparse: true
				},
				{
					key: { warTag: 1 },
					sparse: true
				},
				{
					key: { warType: 1 }
				}
			]),

			db.collection(Collections.CLANS).createIndexes([
				{
					key: { ttl: 1 },
					expireAfterSeconds: 60 * 24
				},
				{
					key: { tag: 1 },
					unique: true
				}
			]),

			db.collection(Collections.FLAGS).createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection(Collections.LAST_SEEN).createIndexes([
				{
					key: { lastSeen: 1 },
					expireAfterSeconds: 60 * 60 * 24 * 99
				},
				{
					key: { 'clan.tag': 1, 'tag': 1 }
				},
				{
					key: { 'clan.tag': 1 }
				},
				{
					key: { tag: 1 },
					unique: true
				}
			]),

			db.collection(Collections.LINKED_PLAYERS).createIndexes([
				{
					key: { 'entries.tag': 1 },
					unique: true,
					sparse: true
				},
				{
					key: { user: 1 },
					unique: true
				}
			]),

			db.collection(Collections.PATRONS).createIndex({ id: 1 }, { unique: true }),

			db.collection(Collections.SETTINGS).createIndex({ id: 1 }, { unique: true }),

			db.collection(Collections.REMINDERS).createIndexes([
				{
					key: { guild: 1 }
				},
				{
					key: { clans: 1 }
				}
			]),

			db.collection(Collections.REMINDERS_TEMP).createIndexes([
				{
					key: { key: 1 }
				},
				{
					key: { tag: 1 }
				},
				{
					key: { guild: 1 }
				},
				{
					key: { reminderId: 1 }
				},
				{
					key: { timestamp: 1 },
					expireAfterSeconds: 60 * 60 * 24
				}
			])
		]);
	}
}

export const Database = new MongoDB();
