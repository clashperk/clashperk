const { mongodb } = require('../struct/Database');
const fetch = require('node-fetch');

class CWLWarTags {
	static async set(tag, warTags, rounds) {
		const season = new Date().toISOString().substring(0, 7);
		return mongodb.db('clashperk').collection('cwlwartags')
			.findOneAndUpdate({ tag }, {
				$set: { tag, season, warTags, rounds },
				$min: { createdAt: new Date() }
			}, { upsert: true, returnOriginal: false });
	}

	static async get(tag) {
		const data = await mongodb.db('clashperk').collection('cwlwartags')
			.findOne({ tag });
		if (data?.warTags?.length !== 7) return null;
		if (
			(new Date().getMonth() === new Date(data?.season).getMonth()) ||
			(new Date(data?.season).getMonth() === (new Date().getMonth() - 1) && new Date().getDate() <= 8)
		) return data;
		return Promise.resolve(null);
	}

	static async pushWarTags(tag, rounds) {
		rounds = rounds.filter(r => !r.warTags.includes('#0'));
		if (rounds.length !== 7) return null;
		const data = await mongodb.db('clashperk').collection('cwlwartags').findOne({ tag });
		if (data && new Date().getMonth() <= new Date(data.season).getMonth()) return null;
		const warTags = [];
		for (const round of rounds) {
			for (const warTag of round.warTags) {
				const res = await fetch(`https://api.clashofclans.com/v1/clanwarleagues/wars/${encodeURIComponent(warTag)}`, {
					method: 'GET', headers: { accept: 'application/json', authorization: `Bearer ${process.env.DEVELOPER_TOKEN}` }
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
