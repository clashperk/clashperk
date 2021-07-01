import { Collections } from '../util/Constants';
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
			db.collection(Collections.CLAN_STORES)
				.createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection(Collections.CLAN_STORES).createIndex({ channels: 1 }),

			db.collection(Collections.CLAN_STORES).createIndex({ alias: 'text' }),

			db.collection(Collections.CLAN_WAR_LOGS)
				.createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection(Collections.DONATION_LOGS)
				.createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection(Collections.LAST_SEEN_LOGS)
				.createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection(Collections.LAST_SEEN)
				.createIndex({ tag: 1 }, { unique: true }),

			db.collection(Collections.LAST_SEEN).createIndex({ 'clan.tag': 1 }),

			db.collection(Collections.LAST_SEEN).createIndex({ 'entries.entry': 1 }),

			db.collection(Collections.CLAN_GAMES_LOGS)
				.createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection(Collections.CLAN_EMBED_LOGS)
				.createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection(Collections.FLAGS)
				.createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection(Collections.LINKED_CLANS)
				.createIndex({ user: 1, tag: 1 }, { unique: true }),

			db.collection(Collections.LINKED_PLAYERS)
				.createIndex({ user: 1 }, { unique: true }),

			db.collection(Collections.LINKED_PLAYERS)
				.createIndex({ 'entries.tag': 1 }),

			db.collection(Collections.CLAN_FEED_LOGS)
				.createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection(Collections.SETTINGS)
				.createIndex({ id: 1 }, { unique: true }),

			db.collection(Collections.CLAN_WARS)
				.createIndex({ 'clan.tag': 1, 'opponent.tag': 1, 'warID': -1 }, { unique: true }),

			db.collection(Collections.CLAN_WARS).createIndex({ state: 1 }),

			db.collection(Collections.CLAN_WARS).createIndex({ warTag: 1 }),

			db.collection(Collections.CLAN_WARS).createIndex({ endTime: -1 }),

			db.collection(Collections.CLAN_WARS).createIndex({ preparationStartTime: -1 }),

			db.collection(Collections.CLAN_WARS).createIndex({ 'clan.members.tag': 1 }),

			db.collection(Collections.CLAN_WARS).createIndex({ 'opponent.members.tag': 1 }),

			db.collection(Collections.CLAN_WARS).createIndex({ groupWar: 1 }),

			db.collection(Collections.CLAN_WARS).createIndex({ season: 1 }),

			db.collection(Collections.CLAN_WARS).createIndex({ id: -1 }),

			db.collection(Collections.CLAN_WARS).createIndex({ leagueGroupID: -1 }),

			db.collection(Collections.CLAN_GAMES)
				.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 20 * 24 * 60 * 60 }),

			db.collection(Collections.CLAN_GAMES)
				.createIndex({ tag: 1, season: 1 }, { unique: true }),

			db.collection(Collections.CWL_GROUPS)
				.createIndex({ 'clans.tag': 1, 'season': 1 }, { unique: true }),

			db.collection(Collections.CWL_GROUPS).createIndex({ createdAt: 1 }),

			db.collection(Collections.CWL_GROUPS).createIndex({ id: -1 }),

			db.collection(Collections.CLAN_MEMBERS)
				.createIndex({ createdAt: -1 }, { expireAfterSeconds: 120 * 24 * 60 * 60 }),

			db.collection(Collections.CLAN_MEMBERS)
				.createIndex({ tag: 1, season: -1, clanTag: 1 }, { unique: true }),

			db.collection(Collections.CLAN_MEMBERS).createIndex({ clanGamesTotal: -1 }),

			db.collection(Collections.CLAN_MEMBERS).createIndex({ clanTag: 1 }),

			db.collection(Collections.CLAN_MEMBERS).createIndex({ season: -1 }),

			db.collection(Collections.TIME_ZONES)
				.createIndex({ user: 1 }, { unique: true }),

			db.collection(Collections.BOT_GROWTH)
				.createIndex({ ISTDate: 1 }, { unique: true }),

			db.collection(Collections.BOT_GROWTH)
				.createIndex({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }),

			db.collection(Collections.BOT_GUILDS)
				.createIndex({ guild: 1 }, { unique: true }),

			db.collection(Collections.BOT_USERS)
				.createIndex({ user: 1 }, { unique: true }),

			db.collection(Collections.BOT_USAGE)
				.createIndex({ ISTDate: 1 }, { unique: true }),

			db.collection(Collections.BOT_USAGE)
				.createIndex({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }),

			db.collection(Collections.BOT_INTERACTIONS).createIndex({ user: 1 }, { unique: true }),

			db.collection(Collections.PATRONS)
				.createIndex({ id: 1 }, { unique: true })
		]);
	}
}

export const Connection = new MongoDB();
