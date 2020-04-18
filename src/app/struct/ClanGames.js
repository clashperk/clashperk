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

	async handle(cache) {
		if (cache.enabled) {
			const clan = await this.clan(cache.tag);
			if (!clan) return;
			await this.isMember(clan);

			// Callback
			const intervalID = setInterval(this.handle.bind(this), 30 * 60 * 1000, cache);
			cache.intervalID = intervalID;
			const key = [cache.guild, cache.tag].join('');
			return this.cached.set(key, cache);
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
				authorization: `Bearer ${process.env.TRACKER_API}`,
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
			await this.delay(300);
		}
	}

	add(tag, guild, data) {
		const key = [guild, tag].join('');
		return this.cached.set(key, data);
	}

	push(data) {
		const cache = this.cached.get(`${data.guild}${data.tag}`);
		if (cache && cache.intervalID) clearInterval(cache.intervalID);

		return this.handle(data);
	}

	delete(guild, tag) {
		const key = [guild, tag].join('');
		const clan = this.cached.get(key);
		if (clan && clan.intervalID) clearInterval(clan.intervalID);
		return this.cached.delete(key);
	}
}

module.exports = ClanGames;
