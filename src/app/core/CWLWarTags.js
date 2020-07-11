const { mongodb } = require('../struct/Database');
const fetch = require('node-fetch');

class CWLWarTags {
	static async set(tag, warTags, rounds, clan) {
		const season = [new Date().getMonth() + 1, new Date().getFullYear()].join('-');
		return mongodb.db('clashperk').collection('cwlwartags')
			.findOneAndUpdate({ tag }, {
				$set: {
					tag,
					season,
					warTags,
					rounds,
					clans: [clan]
				}
			}, { upsert: true, returnOriginal: false });
	}

	static async get(tag) {
		const season = [new Date().getMonth() + 1, new Date().getFullYear()].join('-');
		const data = await mongodb.db('clashperk').collection('cwlwartags')
			.findOne({ tag });
		if (!data) return null;
		if (data && (data.season !== season || data.warTags.length !== 7)) return null;
		return data;
	}

	static async pushWarTags(tag, rounds, body) {
		const warTags = [];
		for (const round of rounds) {
			for (const warTag of round.warTags) {
				const res = await fetch(`https://api.clashofclans.com/v1/clanwarleagues/wars/${encodeURIComponent(warTag)}`, {
					method: 'GET', headers: { accept: 'application/json', authorization: `Bearer ${process.env.$KEY}` }
				});
				const data = await res.json();
				if ((data.clan && data.clan.tag === tag) || (data.opponent && data.opponent.tag === tag)) {
					warTags.push({ warTags: [warTag] });
					break;
				}
			}
		}

		return this.set(tag, warTags, rounds, body.clans.find(clan => clan.tag === tag));
	}
}

module.exports = CWLWarTags;
