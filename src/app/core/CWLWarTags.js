const { mongodb } = require('../struct/Database');
const fetch = require('node-fetch');

class CWLWarTags {
	static async set(tag, warTags, rounds) {
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

	static async warUpdate(tag, data) {
		const db = mongodb.db('clashperk').collection('clanwarhistory');
		const [set, inc] = [{}, {}];
		set.name = data.clan.name;
		set.tag = data.clan.tag;
		for (const mem of data.clan.members) {
			const { stars, destructions } = this.reduce(mem.attacks);
			set[`members.${mem.tag}.tag`] = mem.tag;
			set[`members.${mem.tag}.name`] = mem.name;
			set[`mmebers.${mem.tag}.updatedAt`] = new Date();
			inc[`members.${mem.tag}.stars`] = stars;
			inc[`members.${mem.tag}.destructions`] = destructions;
			inc[`members.${mem.tag}.wars`] = 1;
		}

		return db.updateOne({ tag }, { $set: set, $inc: inc }, { upsert: true });
	}

	static reduce(attacks = []) {
		let [stars, destructions] = [0, 0];
		for (const attack of attacks) {
			stars += attack.stars;
			destructions += attack.destructions;
		}
		return { stars, destructions };
	}
}

module.exports = CWLWarTags;
