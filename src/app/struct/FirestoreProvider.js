const { Provider } = require('discord-akairo');
const firebase = require('firebase-admin');

class FirestoreProvider extends Provider {
	constructor(database, {} = {}) {
		super();
		this.database = database;
	}

	async init() {
		await this.database.get().then(snapshot => {
			snapshot.forEach(doc => {
				this.items.set(doc.id, doc.data());
			});
		});
	}

	get(id, key, defaultValue) {
		if (this.items.has(id)) {
			const value = this.items.get(id)[key];
			return value == null ? defaultValue : value;
		}

		return defaultValue;
	}

	set(id, key, value) {
		const data = this.items.get(id) || {};
		data[key] = value;
		this.items.set(id, data);

		return this.database.doc(id).update({ [key]: value }, { merge: true });
	}

	delete(id, key) {
		const data = this.items.get(id) || {};
		delete data[key];

		return this.database.doc(id).update({ [key]: firebase.firestore.FieldValue.delete() }, { merge: true });
	}

	clear(id) {
		this.items.delete(id);

		return this.database.doc(id).delete();
	}
}

module.exports = FirestoreProvider;
