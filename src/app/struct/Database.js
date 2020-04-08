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

	static async connect() {
		await mongodb.init();
	}

	static get mongodb() {
		return mongodb;
	}
}

module.exports = Database;
