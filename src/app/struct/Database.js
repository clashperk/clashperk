const firebase = require('firebase-admin');

const firebaseApp = firebase.initializeApp({
	credential: firebase.credential.cert({
		projectId: process.env.PROJECT_ID,
		clientEmail: process.env.CLIENT_EMAIL,
		privateKey: process.env.PRIVATE_KEY.replace(/\\n/g, '\n')
	}),
	databaseURL: process.env.FIREBASE_DBURL
});

class Database {
	static get firebase() {
		return firebaseApp.database();
	}
}

module.exports = Database;
