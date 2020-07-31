/* eslint-disable */
const { townHallEmoji, emoji, whiteNum, blueNum } = require('../util/emojis');
const { mongodb } = require('../struct/Database');
const { MessageEmbed } = require('discord.js');
const { Client } = require('clashofclans.js');
const { ObjectId } = require('mongodb');
const fetch = require('node-fetch');
const moment = require('moment');
const client = new Client({
	timeout: 3000,
	token: process.env.$KEY
});

const color = {
	red: 15158332,
	green: 3066993,
	war: 16345172,
	prep: 16745216
};


class ClanWarEvent {
	constructor(client) {
		this.client = client;
		this.cached = new Map();
	}

	exec(id) {
		const cache = this.cached.get(id);
		if (cache) {
			return this.permissionsFor(id, cache);
		}
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	permissionsFor(id, cache) {
		const permissions = [
			'SEND_MESSAGES',
			'EMBED_LINKS',
			'USE_EXTERNAL_EMOJIS',
			'ADD_REACTIONS',
			'VIEW_CHANNEL'
		];

		if (this.client.channels.cache.has(cache.channel)) {
			const channel = this.client.channels.cache.get(cache.channel);
			if (channel.permissionsFor(channel.guild.me).has(permissions, false)) {
				return this.handleMessage(id, channel);
			}
		}
	}

	async handleMessage(id, channel) { }

	// Fetch Clan-War-League-Group
	async fetchCWL(id, channel, clan) {
		const data = await client.fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(clan.tag)}/currentwar/leaguegroup`, {
			token: process.env.$KEY
		}).catch(() => null);
		if (!data) return null;
		if (!data.ok) return null;
		return this.getWarTags(id, channel, data);
	}

	async getWarTags(id, channel, body) {
		const cache = this.cached.get(id);
		const db = await mongodb.db('clashperk')
			.collection('clanwars')
			.findOne({ clan_id: ObjectId(id) });

		const rounds = body.rounds.filter(d => !d.warTags.includes('#0'));
		if (db && db.warTags && rounds.length === Object.keys(db.warTags).length) return this.roundCWL(id, channel, body, db);

		const set = {};
		// let index = 0;
		for (const round of rounds) {
			// index += 1;
			// if (db && db.rounds && db.rounds.length > index - 1) continue;
			for (const warTag of Object.keys(round.warTags)) {
				const res = await fetch(`https://api.clashofclans.com/v1/clanwarleagues/wars/${encodeURIComponent(warTag)}`, {
					method: 'GET', headers: { accept: 'application/json', authorization: `Bearer ${process.env.$KEY}` }
				});
				const data = await res.json();
				if ((data.clan && data.clan.tag === cache.tag) || (data.opponent && data.opponent.tag === cache.tag)) {
					if (data.state === 'warEnded') {
						const ended = db.warTags[warTag] && db.warTags[warTag].ended;
						set[`warTags.${warTag}.warTag`] = warTag;
						set[`warTags.${warTag}.state`] = data.state;
						set[`warTags.${warTag}.ended`] = ended;
					} else {
						set[`warTags.${warTag}.warTag`] = warTag;
						set[`warTags.${warTag}.state`] = data.state;
					}

					break;
				}
			}
		}

		const { value } = await mongodb.db('clashperk')
			.collection('clanwars')
			.findOneAndUpdate({ clan_id: ObjectId(id) }, {
				$set: Object.assign({
					clan_id: ObjectId(id),
					tag: cache.tag
				}, set)
			}, { upsert: true, returnOriginal: false });

		return this.roundCWL(id, channel, body, value);
	}

	// Fetch Clan-War-League-Rounds
	async getWarTags_(id, clanTag, body) {
		const data = await mongodb.db('clashperk')
			.collection('clanwars')
			.findOne({ clan_id: ObjectId(id) });
		const rounds = body.rounds.filter(d => !d.warTags.includes('#0'));
		if (data && data.rounds && data.rounds.length === rounds.length) {
			if (data.rounds.length === 1) return data.rounds[0];
			if (data.rounds.length > 1) {
				const rounds = data.rounds.filter(round => round.state !== 'warEnded');

				const inWars = rounds.filter(r => r.state === 'inWar');
				if (inWars.length > 1) {
					this.cacheUpdate(id);
					return inWars[0];
				}

				const preparation = rounds.find(r => r.state === 'preparation' && !r.posted);
				if (preparation) {
					this.cacheUpdate(id);
					return preparation;
				}

				const inWar = rounds.find(r => r.state === 'inWar' && !r.posted);
				if (inWar) {
					this.cacheUpdate(id);
					return inWar;
				}

				const preparations = rounds.filter(r => r.state === 'preparation');
				if (preparations.length > 1) {
					await mongodb.db('clashperk')
						.collection('clanwars')
						.updateOne({ clan_id: ObjectId(id), 'rounds.tag': preparations[0].tag }, {
							$set: {
								'rounds.$.state': 'inWar',
								'rounds.$.posted': false
							}
						}, { upsert: true });
					return this.getWarTags(id, clanTag, body);
				}

				return null;
			}
		}

		let index = 0;
		for (const { warTags } of rounds) {
			index += 1;
			if (data && data.rounds && data.rounds.length > index - 1) continue;
			for (const warTag of warTags) {
				const res = await fetch(`https://api.clashofclans.com/v1/clanwarleagues/wars/${encodeURIComponent(warTag)}`, {
					method: 'GET', headers: { accept: 'application/json', authorization: `Bearer ${process.env.$KEY}` }
				});
				const data = await res.json();
				if ((data.clan && data.clan.tag === clanTag) || (data.opponent && data.opponent.tag === clanTag)) {
					await mongodb.db('clashperk')
						.collection('clanwars')
						.findOneAndUpdate({ clan_id: ObjectId(id) }, {
							$set: {
								clan_id: ObjectId(id),
								tag: clanTag
							},
							$push: { rounds: { tag: warTag, state: data.state } }
						}, { upsert: true });

					break;
				}
			}
		}

		return this.getWarTags(id, clanTag, body);
	}

	// For Clan-War-League Embed
	async roundCWL(id, channel, body, db) {
		const cache = this.cached.get(id);
		const warTags = Object.values(db.warTags).filter(round => !round.ended).map(round => round.warTag);
		for (const warTag of warTags) {
			const round = body.rounds.findIndex(round => round.warTags.includes(warTag.tag)) + 1;
			const res = await fetch(`https://api.clashofclans.com/v1/clanwarleagues/wars/${encodeURIComponent(warTag.tag)}`, {
				method: 'GET', headers: { accept: 'application/json', authorization: `Bearer ${process.env.$KEY}` }
			});
			const data = await res.json();
			const clan = data.clan.tag === cache.tag ? data.clan : data.opponent;
			const opponent = data.clan.tag === clan.tag ? data.opponent : data.clan;
			const embed = new MessageEmbed()
				.setColor(/*  COLOR   */);
			embed.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.medium)
				.addField('War Against', `${opponent.name} (${opponent.tag})`)
				.addField('Team Size', `${data.teamSize}`);

			if (data.state === 'inWar') {
				const started = new Date(moment(data.startTime).toDate()).getTime();
				embed.addField('State', 'Battle Day')
					.addField('Time', `Started ${moment.duration(Date.now() - started).format('D [days], H [hours] m [mins]', { trim: 'both mid' })} ago`)
					.addField('Stats', [
						`\`\u200e${data.clan.stars.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${emoji.star} \u2002 \`\u200e ${data.opponent.stars.toString().padEnd(8, ' ')}\u200f\``,
						`\`\u200e${data.clan.attacks.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${emoji.attacksword} \u2002 \`\u200e ${data.opponent.attacks.toString().padEnd(8, ' ')}\u200f\``,
						`\`\u200e${`${data.clan.destructionPercentage.toFixed(2)}%`.padStart(8, ' ')} \u200f\`\u200e \u2002 ${emoji.fire} \u2002 \`\u200e ${`${data.opponent.destructionPercentage.toFixed(2)}%`.padEnd(8, ' ')}\u200f\``
					]);
			}

			if (data.state === 'preparation') {
				const start = new Date(moment(data.startTime).toDate()).getTime();
				embed.addField('State', 'Preparation')
					.addField('Time', `Starting in ${moment.duration(start - Date.now()).format('D [days], H [hours] m [mins]', { trim: 'both mid' })}`);
			}

			if (data.state === 'warEnded') {
				const end = new Date(moment(data.endTime).toDate()).getTime();
				embed.addField('State', 'War Ended')
					.addField('Time', `Ended ${moment.duration(Date.now() - end).format('D [days], H [hours] m [mins]', { trim: 'both mid' })} ago`)
					.addField('Stats', [
						`\`\u200e${data.clan.stars.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${emoji.star} \u2002 \`\u200e ${data.opponent.stars.toString().padEnd(8, ' ')}\u200f\``,
						`\`\u200e${data.clan.attacks.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${emoji.attacksword} \u2002 \`\u200e ${data.opponent.attacks.toString().padEnd(8, ' ')}\u200f\``,
						`\`\u200e${`${data.clan.destructionPercentage.toFixed(2)}%`.padStart(8, ' ')} \u200f\`\u200e \u2002 ${emoji.fire} \u2002 \`\u200e ${`${data.opponent.destructionPercentage.toFixed(2)}%`.padEnd(8, ' ')}\u200f\``
					]);
			}

			embed.addField('Rosters', [
				`**${data.clan.name}**`,
				`${this.roster(data.clan.members)}`,
				'',
				`**${data.opponent.name}**`,
				`${this.roster(data.opponent.members)}`
			]);
			embed.setFooter(`Round #${round}`);

			if (data.state === 'warEnded') {
				// TODO: Final update
			}

			if (data.state === 'preparation') {}

			if (data.state === 'inWar') {}
		}
	}

	// Build Remaining/Missed Attack Embed
	attacks(data, clan) {
		const embed = new MessageEmbed()
			.setTitle(`${clan.name} (${clan.tag})`)
			.setThumbnail(clan.badgeUrls.small)
			.setURL(this.clanURL(clan.tag));

		let index = 0;
		const OneRem = [];
		for (const member of clan.members.sort((a, b) => a.mapPosition - b.mapPosition)) {
			if (member.attacks && member.attacks.length === 1) {
				++index;
				continue;
			}
			OneRem.push({ mapPosition: ++index, name: member.name });
		}
		embed.setDescription([
			`**${data.state === 'inWar' ? 'Remaining' : 'Missed'} Attacks**`,
			...OneRem.sort((a, b) => a.mapPosition - b.mapPosition)
				.map(m => `\u200e${blueNum[m.mapPosition]} ${m.name}`) || 'All Members Attacked',
			''
		]);

		return embed;
	}

	clanURL(tag) {
		return `https://link.clashofclans.com/?action=OpenClanProfile&tag=${encodeURIComponent(tag)}`;
	}

	// Decides War Result
	result(clan, opponent) {
		const stars = clan.stars !== opponent.stars && clan.stars > opponent.stars;
		const destr = clan.stars === opponent.stars && clan.destructionPercentage > opponent.destructionPercentage;
		if (stars || destr) return true;
		return false;
	}

	// Builds Clan Roster
	roster(members = []) {
		const reduced = members.reduce((count, member) => {
			const townHall = member.townhallLevel;
			count[townHall] = (count[townHall] || 0) + 1;
			return count;
		}, {});

		const townHalls = Object.entries(reduced)
			.map(entry => ({ level: entry[0], total: entry[1] }))
			.sort((a, b) => b.level - a.level);

		return this.chunk(townHalls)
			.map(chunks => {
				const list = chunks.map(th => `${townHallEmoji[th.level]} ${whiteNum[th.total]}`);
				return list.join(' ');
			}).join('\n');
	}

	chunk(items = []) {
		const chunk = 5;
		const array = [];
		for (let i = 0; i < items.length; i += chunk) {
			array.push(items.slice(i, i + chunk));
		}
		return array;
	}

	async clanWar(tag) {
		const res = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(tag)}/currentwar`, {
			method: 'GET',
			headers: { accept: 'application/json', authorization: `Bearer ${process.env.$KEY}` }
		}).catch(() => null);
		if (!res) return null;
		if (!res.ok) return null;
		return res.json().catch(() => null);
	}

	get isCWL() {
		return new Date().getDate() >= 1 && new Date().getDate() <= 11;
	}

	async init() {
		const collection = await mongodb.db('clashperk')
			.collection('clanwarlogs')
			.find()
			.toArray();

		collection.forEach(data => {
			if (this.client.guilds.cache.has(data.guild)) {
				this.cached.set(ObjectId(data.clan_id).toString(), {
					guild: data.guild,
					channel: data.channel
				});
			}
		});
	}

	async add(id) {
		const data = await mongodb.db('clashperk')
			.collection('clanwarlogs')
			.findOne({ clan_id: ObjectId(id) });

		if (!data) return null;
		return this.cached.set(ObjectId(data.clan_id).toString(), {
			guild: data.guild,
			channel: data.channel
		});
	}

	delete(id) {
		return this.cached.delete(id);
	}
}

module.exports = ClanWarEvent;
