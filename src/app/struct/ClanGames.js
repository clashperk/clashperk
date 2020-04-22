const { firestore } = require('./Database');
const { mongodb } = require('./Database');
const fetch = require('node-fetch');

class ClanGames {
	constructor(client) {
		this.client = client;
		this.cached = new Map();
	}

	async init() {
		const intervalID = setInterval(async () => {
			if (new Date().getDate() > this.client.settings.get('global', 'clanGames', 21)) {
				await this.load();
				await this.start();
				return clearInterval(intervalID);
			}
		}, 1 * 60 * 1000);
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	async load() {
		const data = await firestore.collection('tracking_clans')
			.get()
			.then(snapshot => {
				snapshot.forEach(doc => {
					const data = doc.data();
					if (this.client.guilds.cache.has(data.guild)) {
						this.add(data.tag, data);
					}
				});
			});

		return data;
	}

	async handle(cache) {
		if (cache.enabled) {
			const clan = await this.clan(cache.tag);
			if (!clan) return;
			await this.isMember(clan);

			// Callback
			const intervalID = setInterval(this.handle.bind(this), 10 * 60 * 1000, cache);
			cache.intervalID = intervalID;
			return this.cached.set(cache.tag, cache);
		}
	}

	async isMember(clan) {
		const collection = mongodb.db('clashperk').collection('clangames');
		const data = await collection.findOne({ tag: clan.tag });
		if (data) {
			for (const tag of clan.memberList.map(m => m.tag)) {
				if (tag in data.memberList === false) {
					const member = await this.player(tag);
					if (member) {
						await collection.findOneAndUpdate({
							tag: clan.tag
						}, {
							$set: {
								tag: clan.tag,
								name: clan.name,
								[`memberList.${member.tag}`]: {
									tag: member.tag,
									points: member.achievements
										.find(achievement => achievement.name === 'Games Champion')
										.value
								}
							}
						}, { upsert: true }).catch(error => console.log(error));

						await this.delay(200);
					}
				}
			}
		} else if (!data) {
			for (const tag of clan.memberList.map(m => m.tag)) {
				const member = await this.player(tag);
				if (member) {
					await collection.findOneAndUpdate({
						tag: clan.tag
					}, {
						$set: {
							tag: clan.tag,
							name: clan.name,
							[`memberList.${member.tag}`]: {
								tag: member.tag,
								points: member.achievements
									.find(achievement => achievement.name === 'Games Champion')
									.value
							}
						}
					}, { upsert: true }).catch(error => console.log(error));

					await this.delay(200);
				}
			}
		}
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

	async player(tag) {
		const res = await fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`, {
			method: 'GET',
			headers: {
				accept: 'application/json',
				authorization: `Bearer ${process.env.TRACKER_API_P}`,
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

	add(tag, data) {
		return this.cached.set(tag, { tag: data.tag, guild: data.guild, enabled: true });
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

module.exports = ClanGames;
