import { COLLECTIONS } from '../util/Constants';
import { MongoClient, Db } from 'mongodb';

class MongoDB extends MongoClient {
	public constructor() {
		super(process.env.MONGODB_URL!, {
			useNewUrlParser: true,
			useUnifiedTopology: true
		});
	}

	public async connect() {
		return super.connect();
	}

	public async createIndex(db: Db) {
		return Promise.all([
			db.collection(COLLECTIONS.CLAN_STORES)
				.createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection(COLLECTIONS.CLAN_WAR_LOGS)
				.createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection(COLLECTIONS.DONATION_LOGS)
				.createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection(COLLECTIONS.LAST_ONLINE_LOGS)
				.createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection(COLLECTIONS.LAST_ONLINES)
				.createIndex({ tag: 1 }, { unique: true }),

			db.collection(COLLECTIONS.LAST_ONLINES).createIndex({ 'clan.tag': 1 }),

			db.collection(COLLECTIONS.LAST_ONLINES).createIndex({ 'entries.entry': 1 }),

			db.collection(COLLECTIONS.CLAN_GAMES_LOGS)
				.createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection(COLLECTIONS.CLAN_EMBED_LOGS)
				.createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection(COLLECTIONS.FLAGGED_USERS)
				.createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection(COLLECTIONS.LINKED_CLANS)
				.createIndex({ user: 1, tag: 1 }, { unique: true }),

			db.collection(COLLECTIONS.LINKED_USERS)
				.createIndex({ user: 1, tag: 1 }, { unique: true }),

			db.collection(COLLECTIONS.LINKED_CHANNELS)
				.createIndex({ channel: 1, tag: 1 }, { unique: true }),

			db.collection(COLLECTIONS.LINKED_CHANNELS).createIndex({ guild: 1 }),

			db.collection(COLLECTIONS.PLAYER_LOGS)
				.createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection(COLLECTIONS.SETTINGS)
				.createIndex({ id: 1 }, { unique: true }),

			db.collection(COLLECTIONS.CLAN_WAR_STORES)
				.createIndex({ 'clan.tag': 1, 'opponent.tag': 1, 'warID': -1 }, { unique: true }),

			db.collection(COLLECTIONS.CLAN_WAR_STORES).createIndex({ state: 1 }),

			db.collection(COLLECTIONS.CLAN_WAR_STORES).createIndex({ warTag: 1 }),

			db.collection(COLLECTIONS.CLAN_WAR_STORES).createIndex({ preparationStartTime: -1 }),

			db.collection(COLLECTIONS.CLAN_WAR_STORES).createIndex({ 'clan.members.tag': 1 }),

			db.collection(COLLECTIONS.CLAN_WAR_STORES).createIndex({ 'opponent.members.tag': 1 }),

			db.collection(COLLECTIONS.CLAN_WAR_STORES).createIndex({ groupWar: 1 }),

			db.collection(COLLECTIONS.CLAN_GAMES)
				.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 20 * 24 * 60 * 60 }),

			db.collection(COLLECTIONS.CLAN_GAMES)
				.createIndex({ tag: 1 }, { unique: true }),

			db.collection(COLLECTIONS.CWL_WAR_TAGS)
				.createIndex({ tag: 1 }, { unique: true }),

			db.collection(COLLECTIONS.CWL_WAR_TAGS)
				.createIndex({ createdAt: 1 }, { expireAfterSeconds: 45 * 24 * 60 * 60 }),

			db.collection(COLLECTIONS.CLAN_MEMBERS)
				.createIndex({ createdAt: -1 }, { expireAfterSeconds: 120 * 24 * 60 * 60 }),

			db.collection(COLLECTIONS.CLAN_MEMBERS)
				.createIndex({ tag: 1, season: -1, clanTag: 1 }, { unique: true }),

			db.collection(COLLECTIONS.CLAN_MEMBERS).createIndex({ clanGamesTotal: -1 }),

			db.collection(COLLECTIONS.CLAN_MEMBERS).createIndex({ clanTag: 1 }),

			db.collection(COLLECTIONS.CLAN_MEMBERS).createIndex({ season: -1 }),

			db.collection(COLLECTIONS.TIME_ZONES)
				.createIndex({ user: 1 }, { unique: true }),

			db.collection(COLLECTIONS.BOT_GROWTH)
				.createIndex({ ISTDate: 1 }, { unique: true }),

			db.collection(COLLECTIONS.BOT_GROWTH)
				.createIndex({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }),

			db.collection(COLLECTIONS.BOT_GUILDS)
				.createIndex({ guild: 1 }, { unique: true }),

			db.collection(COLLECTIONS.BOT_USERS)
				.createIndex({ user: 1 }, { unique: true }),

			db.collection(COLLECTIONS.BOT_USAGE)
				.createIndex({ ISTDate: 1 }, { unique: true }),

			db.collection(COLLECTIONS.BOT_USAGE)
				.createIndex({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }),

			db.collection(COLLECTIONS.BOT_INTERACTIONS).createIndex({ user: 1 }, { unique: true }),

			db.collection(COLLECTIONS.PATRONS)
				.createIndex({ id: 1 }, { unique: true })
		]);
	}
}

const Connection = new MongoDB();

export { Connection };
