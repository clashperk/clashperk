const { firestore } = require('./Database');

class ClanTracker {
	constructor(client) {
		this.client = client;
		this.cached = new Map();
	}

	async init() {
		return this.load();
	}

	async load() {
		const data = await firestore.collection('clan_games_store')
			.get()
			.then(snapshot => {
				snapshot.forEach(doc => {
					const data = doc.data();
					if (this.client.guilds.cache.has(data.guild)) {
						this.add(data.tag, data.guild, data);
					}
				});
			});

		return data;
	}

	add(tag, guild, data) {
		return this.cached.set(`${guild}${tag}`, data);
	}

	delete(guild, tag) {
		const clan = this.cached.get(`${guild}${tag}`);
		if (clan && clan.intervalID) clearInterval(clan.intervalID);
		return this.cached.delete(`${guild}${tag}`);
	}
}

module.exports = ClanTracker;
