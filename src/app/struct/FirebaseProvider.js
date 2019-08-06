const { Provider } = require('discord-akairo');

class FirebaseProvider extends Provider {
	constructor(database, {} = {}) {
		super();
		this.database = database;
	}

	async init() {
		const object = await this.database.once('value').then(snap => snap.val());
		for (const [key, value] of this.entries(object)) {
			this.items.set(key, value);
		}
	}

	entries(object) {
		if (!object) return Object.entries({});
		return Object.entries(object);
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

		return this.database.child(id).update({ [key]: value });
	}

	delete(id, key) {
		const data = this.items.get(id) || {};
		delete data[key];

		return this.database.child(id).update({ [key]: null });
	}

	clear(id) {
		this.items.delete(id);

		return this.database.child(id).remove();
	}
}

module.exports = FirebaseProvider;
