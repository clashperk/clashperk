const { User } = require('discord.js');
const { SequelizeProvider } = require('discord-akairo');

class SettingsProvider extends SequelizeProvider {
	constructor(table) {
		super(table, {
			idColumn: 'user',
			dataColumn: 'settings'
		});
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

module.exports = SettingsProvider;
