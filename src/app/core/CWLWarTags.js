const { mongodb } = require('../struct/Database');
const fetch = require('node-fetch');

class CWLWarTags {
	static async set(tag, warTags, rounds) {
		const season = [new Date().getMonth() + 1, new Date().getFullYear()].join('-');
		return mongodb.db('clashperk').collection('cwlwartags')
			.findOneAndUpdate({ tag }, {
				$set: {
					tag,
					season,
					warTags,
					[`attributes.${season}`]: rounds
				}
			}, { upsert: true, returnOriginal: false });
	}

	static async get(tag, rounds) {
		const season = [new Date().getMonth() + 1, new Date().getFullYear()].join('-');
		const data = await mongodb.db('clashperk').collection('cwlwartags')
			.findOne({ tag });
		if (!data) return this.pushWarTags(tag, rounds);
		if (data && (data.season !== season || data.warTags.length !== rounds.length)) return this.pushWarTags(tag, rounds);

		const chunk = [];
		for (const warTag of data.warTags) {
			const res = await fetch(`https://api.clashofclans.com/v1/clanwarleagues/wars/${encodeURIComponent(warTag)}`, {
				method: 'GET', headers: { accept: 'application/json', authorization: `Bearer ${process.env.$KEY}` }
			});
			const data = await res.json();
			chunk.push(data);
		}

		return chunk;
	}

	static async pushWarTags(tag, rounds) {
		const warTags = [];
		const chunk = [];
		for (const round of rounds) {
			for (const warTag of round.warTags) {
				const res = await fetch(`https://api.clashofclans.com/v1/clanwarleagues/wars/${encodeURIComponent(warTag)}`, {
					method: 'GET', headers: { accept: 'application/json', authorization: `Bearer ${process.env.$KEY}` }
				});
				const data = await res.json();
				if ((data.clan && data.clan.tag === tag) || (data.opponent && data.opponent.tag === tag)) {
					warTags.push(warTag);
					chunk.push(data);
					break;
				}
			}
		}

		this.set(tag, warTags, rounds);
		return chunk;
	}
}

module.exports = CWLWarTags;
