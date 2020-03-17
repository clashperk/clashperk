require('dotenv').config();
const { firestore } = require('./Database');
const firebase = require('firebase-admin');

async function start() {
	const batch = firestore.batch();
	await firestore.collection('tracking_clans')
		.get()
		.then(snapstot => {
			snapstot.forEach(async doc => {
				batch.update(doc.ref, {
					donationlogEnabled: true,
					donationlog: {
						channel: doc.data().channel,
						color: doc.data().color
					},
					channel: firebase.firestore.FieldValue.delete(),
					color: firebase.firestore.FieldValue.delete(),
					isPremium: false
				});
			});
		});

	return batch.commit();
}

start();
