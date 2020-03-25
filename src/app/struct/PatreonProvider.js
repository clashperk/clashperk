const { Guild, User } = require('discord.js');
const FirestoreProvider = require('./FirestoreProvider');

class Guilds extends FirestoreProvider {
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

	static getGuildID(guild) {
		if (guild instanceof Guild) return guild.id;
		if (typeof guild === 'string' && /^\d+$/.test(guild)) return guild;
		throw new TypeError('Invalid guild specified. Must be a Guild instance or guild ID.');
	}
}

class Users extends FirestoreProvider {
	constructor(database, { } = {}) {
		super(database);
	}

	get(user, key, defaultValue) {
		const id = this.constructor.getUserID(user);
		return super.get(id, key, defaultValue);
	}

	set(user, key, value) {
		const id = this.constructor.getUserID(user);
		return super.set(id, key, value);
	}

	delete(user, key) {
		const id = this.constructor.getUserID(user);
		return super.delete(id, key);
	}

	static getUserID(user) {
		if (user instanceof User) return user.id;
		if (typeof user === 'string' && /^\d+$/.test(user)) return user;
		throw new TypeError('Invalid user specified. Must be a User instance or user ID.');
	}
}

module.exports = { Users, Guilds };
