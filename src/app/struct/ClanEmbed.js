const { firestore } = require('./Database');
const { mongodb } = require('./Database');
const fetch = require('node-fetch');

class ClanEmbed {
	constructor(client) {
		this.client = client;
		this.cached = new Map();
	}

	async init() {
		await this.load();
		return this.start();
	}

	async add_(data) {
		const db = await mongodb.db('clashperk')
			.collection('clanembeds')
			.findOneAndUpdate({
				guild: data.guild,
				tag: data.tag
			}, {
				guild: data.guild,
				tag: data.tag,
				name: data.name,
				channel: data.channel,
				message: data.message,
				createdAt: new Date(),
				embed: data.embed
			}, { upsert: true, returnOriginal: false });

		return this.cached.set(db.value._id, db.value);
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	async load() {
		const clans = await mongodb.db('clashperk')
			.collection('clanembeds')
			.find()
			.toArray();
		clans.forEach(clan => {
			this.cached.set(clan._id, clan);
		});
	}

	async handle(cache) {
		if (cache.enabled) {
			const clan = await this.clan(cache.tag);
			if (!clan) return;
			if (cache && cache.intervalID) clearInterval(cache.intervalID);
			await this.update(cache, clan);

			// Callback
			const intervalID = setInterval(this.handle.bind(this), 10 * 60 * 1000, cache);
			cache.intervalID = intervalID;
			return this.cached.set(cache._id, cache);
		}
	}

	async update(cache, clan) {
		// find channel
		// check permission
		// fetch msg
		// update
	}

	async clan(tag) {
		const res = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(tag)}`, {
			method: 'GET',
			headers: {
				accept: 'application/json',
				authorization: `Bearer ${process.env.CLAN_GAMES_API}`,
				'cache-control': 'no-cache'
			},
			timeout: 3000
		}).catch(() => null);

		if (!res) return null;
		if (!res.ok) return null;

		return res.json().catch(() => null);
	}

	async start() {
		for (const cache of Array.from(this.cached.values())) {
			await this.handle(cache);
			await this.delay(200);
		}
	}

	push(data) {
		const cache = this.cached.get(data.tag);
		if (cache && cache.intervalID) clearInterval(cache.intervalID);

		return this.handle({ tag: data.tag, guild: data.guild, enabled: true });
	}

	delete(tag) {
		const clan = this.cached.get(tag);
		if (clan && clan.intervalID) clearInterval(clan.intervalID);
		return this.cached.delete(tag);
	}
}

module.exports = ClanEmbed;
