const fetch = require('node-fetch');

class CWLTracker {
	constructor(client) {
		this.client = client;
		this.cached = new Map();
	}

	async init() { }

	async fetch(tag) {
		const res = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(tag)}/currentwar/leaguegroup`, {
			method: 'GET', timeout: 3000,
			headers: { accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` }
		}).catch(() => null);

		const body = await res.json();

		const rounds = body.rounds.filter(d => !d.warTags.includes('#0')).length === body.rounds.length
			? body.rounds.pop().warTags
			: body.rounds.filter(d => !d.warTags.includes('#0'))
				.slice(-2)
				.reverse()
				.pop()
				.warTags;

		for (const tag of rounds) {
			const res = await fetch(`https://api.clashofclans.com/v1/clanwarleagues/wars/${encodeURIComponent(tag)}`, {
				method: 'GET',
				headers: { accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` }
			});

			const data = await res.json();

			if ((data.clan && data.clan.tag === tag) || (data.opponent && data.opponent.tag === tag)) {
				const clan = data.clan.tag === tag ? data.clan : data.opponent;
				const opponent = data.clan.tag === tag ? data.opponent : data.clan;

				return { clan, opponent };
			}
		}
	}
}
