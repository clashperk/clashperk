const { Provider } = require('discord-akairo');
const firebase = require('firebase-admin');
const { Guild } = require('discord.js');

class FirestoreProvider extends Provider {
	constructor(database, { } = {}) {
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


class Settings extends FirestoreProvider {
	constructor(database, { } = {}) {
		super(database);
	}

	get(guild, key, defaultValue) {
		const id = this.constructor.getGuildID(guild);
		return super.get(id, key, defaultValue);
	}

	set(guild, key, value) {
		const id = this.constructor.getGuildID(guild);
		return super.set(id, key, value);
	}

	delete(guild, key) {
		const id = this.constructor.getGuildID(guild);
		return super.delete(id, key);
	}

	clear(guild) {
		const id = this.constructor.getGuildID(guild);
		return super.clear(id);
	}

	static getGuildID(guild) {
		if (guild instanceof Guild) return guild.id;
		if (guild === 'global' || guild === null) return 'global';
		if (typeof guild === 'string' && /^\d+$/.test(guild)) return guild;
		throw new TypeError('Invalid guild specified. Must be a Guild instance, guild ID, "global", or null.');
	}
}

module.exports = Settings;
