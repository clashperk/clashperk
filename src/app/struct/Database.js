const firebase = require('firebase-admin');
const { MongoClient } = require('mongodb');

const firebaseApp = firebase.initializeApp({
	credential: firebase.credential.cert({
		projectId: process.env.PROJECT_ID,
		clientEmail: process.env.CLIENT_EMAIL,
		privateKey: process.env.PRIVATE_KEY.replace(/\\n/g, '\n')
	}),
	databaseURL: process.env.FIREBASE_DBURL
});

class MongoDB extends MongoClient {
	constructor() {
		super(process.env.MONGODB_URL, {
			useNewUrlParser: true,
			useUnifiedTopology: true
		});
	}

	async init() {
		return this.connect();
	}
}

const mongodb = new MongoDB();

class Database {
	static get firebase() {
		return firebaseApp.database();
	}

	static get firestore() {
		return firebaseApp.firestore();
	}

	static async connect(client) {
		return mongodb.init().then(() => {
			client.logger.info('MongoDB Connected', { label: 'MONGODB' });
			return mongodb;
		});
	}

	static get mongodb() {
		return mongodb;
	}

	static async createIndex() {
		const db = mongodb.db('clashperk');
		return Promise.all([
			db.collection('clanstores').createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection('donationlogs').createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection('lastonlinelogs').createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection('lastonlines').createIndex({ clan_id: 1 }, { unique: true }),

			db.collection('clangameslogs').createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection('clanembedlogs').createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection('flaggedusers').createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection('linkedclans').createIndex({ user: 1, tag: 1 }, { unique: true }),

			db.collection('linkedusers').createIndex({ user: 1, tag: 1 }, { unique: true }),

			db.collection('playerlogs').createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection('settings').createIndex({ id: 1 }, { unique: true }),

			db.collection('clanwars').createIndex({ clan_id: 1 }, { unique: true }),

			db.collection('clanstores').createIndex({ patron: 1 }),

			db.collection('clangames').createIndex({ createdAt: 1 }, { expireAfterSeconds: 2160000 }),

			db.collection('lastonlines').createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 })
		]);
	}
}

module.exports = Database;
