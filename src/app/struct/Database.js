const firebase = require('firebase-admin');
const Logger = require('../util/logger');
const path = require('path');
const readdir = require('util').promisify(require('fs').readdir);
const Sequelize = require('sequelize');

const db = new Sequelize(process.env.POSTGRES, { logging: false });

const firebaseApp = firebase.initializeApp({
	credential: firebase.credential.cert({
		projectId: process.env.PROJECT_ID,
		clientEmail: process.env.CLIENT_EMAIL,
		privateKey: process.env.PRIVATE_KEY.replace(/\\n/g, '\n')
	}),
	databaseURL: process.env.FIREBASE_DBURL
});

class Database {
	static get db() {
		return db;
	}

	static get firebase() {
		return firebaseApp.database();
	}

	static async authenticate() {
		try {
			await db.authenticate();
			Logger.info('DATABASE INSTANCE CONNECTED', { level: 'POSTGRES' });
			await this.loadModels(path.join(__dirname, '..', 'models'));
		} catch (err) {
			Logger.error('UNABLE TO CONNECT TO THE DATABASE INSTANCE', { level: 'POSTGRES' });
			Logger.info('RECONNECTING AGAIN IN 5 SECONDS', { level: 'POSTGRES' });
			setTimeout(this.authenticate.bind(this), 5000);
		}
	}

	static async loadModels(modelsPath) {
		const files = await readdir(modelsPath);
		for (const file of files) {
			const filePath = path.join(modelsPath, file);
			if (!filePath.endsWith('.js')) continue;
			await require(filePath).sync({ alter: true });
		}
	}
}

module.exports = Database;
