const { mongodb } = require('../struct/Database');

class Patron {
	constructor(client) {
		this.client = client;
		this.store = new Map();
	}

	async init() {
		return this.refresh();
	}

	get(id, key, def) {
		if (this.store.has(id)) {
			const value = this.store.get(id)[key];
			return value == null ? def : value; // eslint-disable-line no-eq-null
		}
		return def;
	}

	check(user, guild) {
		return this.get(guild.id, 'guild', false) || this.get(user.id, 'user', false);
	}

	async refresh() {
		this.store.clear(); // Clear Cache

		await mongodb.db('clashperk')
			.collection('patrons')
			.find({ active: true })
			.forEach(data => {
				if (data.discord_id) {
					this.store.set(data.discord_id, { user: true });
				}

				if (data.shared) {
					for (const id of data.shared) {
						this.store.set(id, { user: true });
					}
				}

				if (data.active && data.guilds) {
					for (const guild of data.guilds) {
						this.store.set(guild.id, { guild: guild.ex ? false : true, limit: guild.limit });
					}
				}
			});

		return Promise.resolve(0);
	}
}

module.exports = Patron;
