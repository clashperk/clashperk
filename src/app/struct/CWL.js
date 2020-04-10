const fetch = require('node-fetch');
const { firestore } = require('./Database');

class CWLTracker {
	constructor(client) {
		this.client = client;
		this.cached = new Map();
		this.intervalId = null;
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	async init() {
		if (new Date().getDate() < 12 && new Date().getDate() > 8) {
			await this.load();
			await this.fetch(this.intervalId);
			this.intervalId = setInterval(this.fetch.bind(this), 10 * 60 * 1000, this.intervalId);
		}
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

	add(tag, data) {
		this.cached.add(tag, data);
	}

	async fetch(intervalId) {
		if (new Date().getDate() > 12 && new Date().getDate() < 8) clearInterval(intervalId);
		for (const tag of this.cached.keys()) {
			const res = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(tag)}/currentwar/leaguegroup`, {
				method: 'GET', timeout: 3000,
				headers: { accept: 'application/json', authorization: `Bearer ${process.env.TRACKER_API}` }
			}).catch(() => null);

			if (!res.ok) continue;

			const body = await res.json();

			const rounds = body.rounds.filter(d => !d.warTags.includes('#0')).length === body.rounds.length
				? body.rounds
				: null;

			if (rounds) {
				await firestore.collection('clan_metadata')
					.doc(tag)
					.update({
						tag,
						[`${new Date().getFullYear()}-${new Date().getMonth() + 1}`]: {
							rounds
						}
					}, { merge: true });
			}

			await this.delay(200);
		}
	}
}

module.exports = CWLTracker;
