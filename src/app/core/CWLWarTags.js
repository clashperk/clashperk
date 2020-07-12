const { mongodb } = require('../struct/Database');
const fetch = require('node-fetch');

class CWLWarTags {
	static async set(tag, warTags, rounds, clan) {
		const season = [new Date().getFullYear(), new Date().getMonth() + 1].join('-');
		return mongodb.db('clashperk').collection('cwlwartags')
			.findOneAndUpdate({ tag }, {
				$set: {
					tag,
					season,
					warTags,
					rounds,
					[`attributes.${season}`]: rounds
				}
			}, { upsert: true, returnOriginal: false });
	}

	static async get(tag) {
		const season = [new Date().getFullYear(), new Date().getMonth() + 1].join('-');
		const data = await mongodb.db('clashperk').collection('cwlwartags')
			.findOne({ tag });
		if (!data) return null;
		if (data && (data.season !== season || data.warTags.length !== 7)) return null;
		return data;
	}

	static async pushWarTags(tag, rounds) {
		if (rounds.length !== 7) return null;
		const season = [new Date().getFullYear(), new Date().getMonth() + 1].join('-');
		const exists = await mongodb.db('clashperk').collection('cwlwartags').findOne({ tag, season });
		if (exists) return null;
		const warTags = [];
		for (const round of rounds) {
			for (const warTag of round.warTags) {
				const res = await fetch(`https://api.clashofclans.com/v1/clanwarleagues/wars/${encodeURIComponent(warTag)}`, {
					method: 'GET', headers: { accept: 'application/json', authorization: `Bearer ${process.env.$KEY}` }
				});
				const data = await res.json();
				if ((data.clan && data.clan.tag === tag) || (data.opponent && data.opponent.tag === tag)) {
					warTags.push(warTag);
					break;
				}
			}
		}

		return this.set(tag, warTags, rounds);
	}
}

module.exports = CWLWarTags;
