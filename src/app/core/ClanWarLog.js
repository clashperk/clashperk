const { townHallEmoji, emoji, RED_EMOJI, BLUE_EMOJI } = require('../util/emojis');
const { mongodb } = require('../struct/Database');
const { MessageEmbed, Util } = require('discord.js');
const { Client } = require('clashofclans.js');
const { ObjectId } = require('mongodb');
const WarHistory = require('./CWLWarTags');
const moment = require('moment');
const client = new Client({
	timeout: 10000,
	token: process.env.CLAN_WAR_TOKEN
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
			return this.setTimer(id);
		}
	}

	async handleMessage(id, channel) {
		const now = new Date();
		if (now.getDate() >= 1 && now.getDate() <= 10) return this.fetchCWL(id, channel);
		return this.fetchClanWar(id, channel);
	}

	async fetchCWL(id, channel) {
		const cache = this.cached.get(id);
		const data = await client.fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(cache.tag)}/currentwar/leaguegroup`, {
			token: process.env.CLAN_WAR_TOKEN,
			timeout: 3000
		}).catch(() => null);
		if (!data) return this.setTimer(id);
		if (!data.ok) return this.fetchClanWar(id, channel);
		return this.getWarTags(id, channel, data);
	}

	// For Normal Clan Wars [CLAN WAR]
	async fetchClanWar(id, channel) {
		const cache = this.cached.get(id);
		const data = await this.clanWar(cache.tag);
		if (!data) return this.setTimer(id);
		if (data.state === 'notInWar') return this.setTimer(id);

		const db = await mongodb.db('clashperk')
			.collection('clanwars')
			.findOne({ clan_id: ObjectId(id) });

		if (db && db.opponent !== data.opponent.tag && db.state !== data.state) {
			await mongodb.db('clashperk')
				.collection('clanwars')
				.findOneAndUpdate({ clan_id: ObjectId(id) }, {
					$set: {
						clan_id: ObjectId(id),
						ended: false,
						ending: false
					}
				}, { upsert: true });
		}

		if (db && db.opponent === data.opponent.tag && db.posted && db.state === data.state && data.state === 'preparation') {
			const startsIn = new Date(moment(data.startTime).toDate()).getTime() - Date.now();
			if (startsIn <= 36e5) return this.setTimer(id, data.maxAge * 1000, false);
			return this.setTimer(id, 36e5, false);
		}

		const embed = new MessageEmbed()
			.setTitle(`${data.clan.name} (${data.clan.tag})`)
			.setURL(this.clanURL(data.clan.tag))
			.setThumbnail(data.clan.badgeUrls.small);
		if (data.state === 'preparation') {
			embed.setColor(color.prep)
				.setDescription([
					'**War Against**',
					`**[${Util.escapeMarkdown(data.opponent.name)} (${data.opponent.tag})](${this.clanURL(data.opponent.tag)})**`,
					'',
					'**War State**',
					'Preparation Day',
					'',
					'**War Size**',
					`${data.teamSize} vs ${data.teamSize}`
				]);
			embed.setTimestamp(new Date(moment(data.startTime).toDate()))
				.setFooter('Starting');
		}

		if (data.state === 'inWar') {
			embed.setColor(color.war)
				.setDescription([
					'**War Against**',
					`**[${Util.escapeMarkdown(data.opponent.name)} (${data.opponent.tag})](${this.clanURL(data.opponent.tag)})**`,
					'',
					'**War State**',
					'Battle Day',
					`Ends in ${moment.duration(new Date(moment(data.endTime).toDate()).getTime() - Date.now()).format('D[d], H[h] m[m]', { trim: 'both mid' })}`,
					'',
					'**War Size**',
					`${data.teamSize} vs ${data.teamSize}`,
					'',
					'**War Stats**',
					`${emoji.star} ${data.clan.stars} / ${data.opponent.stars}`,
					`${emoji.fire} ${data.clan.destructionPercentage.toFixed(2)}% / ${data.opponent.destructionPercentage.toFixed(2)}%`,
					`${emoji.attacksword} ${data.clan.attacks} / ${data.opponent.attacks}`
				]);
			embed.setTimestamp().setFooter('Last Updated');
		}

		if (data.state === 'warEnded') {
			embed.setColor(this.result(data.clan, data.opponent))
				.setDescription([
					'**War Against**',
					`**[${Util.escapeMarkdown(data.opponent.name)} (${data.opponent.tag})](${this.clanURL(data.opponent.tag)})**`,
					'',
					'**War State**',
					'War Ended',
					'',
					'**War Size**',
					`${data.teamSize} vs ${data.teamSize}`,
					'',
					'**War Stats**',
					`${emoji.star} ${data.clan.stars} / ${data.opponent.stars}`,
					`${emoji.fire} ${data.clan.destructionPercentage.toFixed(2)}% / ${data.opponent.destructionPercentage.toFixed(2)}%`,
					`${emoji.attacksword} ${data.clan.attacks} / ${data.opponent.attacks}`
				]);
			embed.setFooter('Ended').setTimestamp(new Date(moment(data.endTime).toDate()));
		}

		embed.setDescription([
			embed.description,
			'',
			'**Rosters**',
			`${Util.escapeMarkdown(data.clan.name)}`,
			`${this.roster(data.clan.members)}`,
			'',
			`${Util.escapeMarkdown(data.opponent.name)}`,
			`${this.roster(data.opponent.members)}`
		]);

		if (data.state === 'preparation') {
			const message = await channel.send({ embed }).catch(() => null);
			if (message) {
				await mongodb.db('clashperk')
					.collection('clanwars')
					.findOneAndUpdate({ clan_id: ObjectId(id) }, {
						$set: {
							clan_id: ObjectId(id),
							opponent: data.opponent.tag,
							tag: data.clan.tag,
							posted: true,
							state: data.state,
							message: message.id,
							updatedAt: new Date()
						}
					}, { upsert: true });
			}
		}

		if (data.state === 'inWar') {
			let message = null;
			if (db && db.message) {
				message = await channel.messages.fetch(db.message, false).catch(() => null);
				if (message) {
					await message.edit({ embed });
				} else {
					message = await channel.send({ embed });
				}
			} else {
				message = await channel.send({ embed });
			}

			await mongodb.db('clashperk')
				.collection('clanwars')
				.findOneAndUpdate({ clan_id: ObjectId(id) }, {
					$set: {
						clan_id: ObjectId(id),
						tag: data.clan.tag,
						opponent: data.opponent.tag,
						state: data.state,
						message: message.id,
						updatedAt: new Date()
					}
				}, { upsert: true });
		}

		if (data.state === 'warEnded') {
			if (!db) return this.setTimer(id);
			if (db && db.ended && db.opponent === data.opponent.tag) return this.setTimer(id);
			let message = null;
			if (db && db.message) {
				message = await channel.messages.fetch(db.message, false).catch(() => null);
				if (message) {
					await message.edit({ embed });
				} else {
					message = await channel.send({ embed });
				}
			} else {
				message = await channel.send({ embed });
			}
			await mongodb.db('clashperk')
				.collection('clanwars')
				.findOneAndUpdate({ clan_id: ObjectId(id) }, {
					$set: {
						clan_id: ObjectId(id),
						tag: data.clan.tag,
						opponent: data.opponent.tag,
						ended: true,
						state: data.state,
						updatedAt: new Date()
					}
				});
			if (this.missing(data)) await channel.send({ embed: this.missing(data) });
			// await WarHistory.warUpdate(data.clan.tag, data).catch(() => null);
		}

		// overwrite the timer for last 1 hour
		if (data.state === 'inWar') {
			const endsIn = new Date(moment(data.endTime).toDate()).getTime() - Date.now();
			if (endsIn <= 36e5) this.setTimer(id, data.maxAge * 1000, false);
			else this.setTimer(id, data.maxAge * 1000, true);
		} else {
			this.setTimer(id, data.maxAge * 1000, true);
		}
	}

	// Fetch Clan-War-League-Rounds [CWL]
	async getWarTags(id, channel, body) {
		const cache = this.cached.get(id);
		const db = await mongodb.db('clashperk')
			.collection('clanwars')
			.findOne({ clan_id: ObjectId(id) });

		const rounds = body.rounds.filter(d => !d.warTags.includes('#0'));

		// Set Callback Timer
		this.setTimer(id);
		if (db && db.warTags && rounds.length === Object.keys(db.warTags).length) return this.roundCWL(id, channel, body, db);

		const set = {};
		let index = 0;
		for (const round of rounds) {
			index += 1;
			// if (db && db.rounds && db.rounds.length > index - 1) continue;
			for (const warTag of round.warTags) {
				const data = await client.fetch(`https://api.clashofclans.com/v1/clanwarleagues/wars/${encodeURIComponent(warTag)}`).catch(() => null);
				if (!data || (data && !data.ok)) continue;
				if ((data.clan && data.clan.tag === cache.tag) || (data.opponent && data.opponent.tag === cache.tag)) {
					if (data.state === 'warEnded') {
						const ended = db && db.warTags && db.warTags[warTag] && db.warTags[warTag].ended;
						set[`warTags.${warTag}.ended`] = ended ? true : false;
					}
					set[`warTags.${warTag}.warTag`] = warTag;
					set[`warTags.${warTag}.state`] = data.state;
					set[`warTags.${warTag}.round`] = index;

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

	// For Clan-War-League Embed [CWL]
	async roundCWL(id, channel, body, db) {
		const cache = this.cached.get(id);
		const warTags = Object.values(db.warTags)
			.filter(round => !round.ended)
			.sort((a, b) => a.round - b.round)
			.map(round => round.warTag);
		for (const warTag of warTags) {
			const round = body.rounds.findIndex(round => round.warTags.includes(warTag)) + 1;
			const data = await client.fetch(`https://api.clashofclans.com/v1/clanwarleagues/wars/${encodeURIComponent(warTag)}`).catch(() => null);
			if (!data?.ok) continue;
			const clan = data.clan.tag === cache.tag ? data.clan : data.opponent;
			const opponent = data.clan.tag === clan.tag ? data.opponent : data.clan;
			const embed = new MessageEmbed()
				.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.medium)
				.addField('War Against', `${opponent.name} (${opponent.tag})`)
				.addField('Team Size', `${data.teamSize}`);

			if (data.state === 'inWar') {
				const ends = new Date(moment(data.endTime).toDate()).getTime();
				embed.setColor(color.war);
				embed.addField('State', ['Battle Day', `Ends in ${moment.duration(ends - Date.now()).format('D [days], H [hours] m [mins]', { trim: 'both mid' })}`])
					.addField('Stats', [
						`\`\u200e${clan.stars.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${emoji.star} \u2002 \`\u200e ${opponent.stars.toString().padEnd(8, ' ')}\u200f\``,
						`\`\u200e${clan.attacks.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${emoji.attacksword} \u2002 \`\u200e ${opponent.attacks.toString().padEnd(8, ' ')}\u200f\``,
						`\`\u200e${`${clan.destructionPercentage.toFixed(2)}%`.padStart(8, ' ')} \u200f\`\u200e \u2002 ${emoji.fire} \u2002 \`\u200e ${`${opponent.destructionPercentage.toFixed(2)}%`.padEnd(8, ' ')}\u200f\``
					]);
			}

			if (data.state === 'preparation') {
				const start = new Date(moment(data.startTime).toDate()).getTime();
				embed.setColor(color.prep);
				embed.addField('State', ['Preparation', `Ends in ${moment.duration(start - Date.now()).format('D [days], H [hours] m [mins]', { trim: 'both mid' })}`]);
			}

			if (data.state === 'warEnded') {
				embed.setColor(this.result(clan, opponent));
				embed.addField('State', 'War Ended')
					.addField('Stats', [
						`\`\u200e${clan.stars.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${emoji.star} \u2002 \`\u200e ${opponent.stars.toString().padEnd(8, ' ')}\u200f\``,
						`\`\u200e${clan.attacks.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${emoji.attacksword} \u2002 \`\u200e ${opponent.attacks.toString().padEnd(8, ' ')}\u200f\``,
						`\`\u200e${`${clan.destructionPercentage.toFixed(2)}%`.padStart(8, ' ')} \u200f\`\u200e \u2002 ${emoji.fire} \u2002 \`\u200e ${`${opponent.destructionPercentage.toFixed(2)}%`.padEnd(8, ' ')}\u200f\``
					]);
			}

			const [clanRoster, opponentRoster] = [this.roster(clan.members), this.roster(opponent.members)];
			if (clanRoster.length + opponentRoster.length > 1000) {
				embed.addField('Rosters', [
					`${clan.name}`,
					`${this.roster(clan.members, true)}`,
					'',
					`${opponent.name}`,
					`${this.roster(opponent.members, true)}`
				]);
			} else {
				embed.addField('Rosters', [
					`${clan.name}`,
					`${clanRoster}`,
					'',
					`${opponent.name}`,
					`${opponentRoster}`
				]);
			}

			if (data.state === 'warEnded') {
				const remaining = this.attacks(clan);
				if (remaining) embed.addField('Remaining Attacks', remaining.substring(0, 1024));
			}
			embed.setFooter(`Round #${round}`).setTimestamp();

			await this.send(id, db, data, warTag, channel, embed);
			await this.delay(2000);
		}
	}

	// Send or Edit Messages [CWL]
	async send(id, db, data, warTag, channel, embed) {
		let message = null;
		if (db && db.warTags[warTag].message) {
			message = await channel.messages.fetch(db.warTags[warTag].message, false).catch(() => null);
			if (message) {
				await message.edit({ embed });
			} else {
				message = await channel.send({ embed });
			}
		} else {
			message = await channel.send({ embed });
		}

		const set = {};
		if (data.state === 'warEnded') set[`warTags.${warTag}.ended`] = true;
		set[`warTags.${warTag}.message`] = message.id;
		set[`warTags.${warTag}.state`] = data.state;

		return mongodb.db('clashperk')
			.collection('clanwars')
			.updateOne({ clan_id: ObjectId(id) }, { $set: set });
	}

	// Build Remaining/Missed Attack Embed [CWL]
	attacks(clan) {
		let index = 0;
		const OneRem = [];
		for (const member of clan.members.sort((a, b) => a.mapPosition - b.mapPosition)) {
			if (member.attacks && member.attacks.length === 1) {
				++index;
				continue;
			}
			OneRem.push({ mapPosition: ++index, name: member.name });
		}

		if (OneRem.length) {
			return [
				...OneRem.sort((a, b) => a.mapPosition - b.mapPosition)
					.map(m => `\u200e${BLUE_EMOJI[m.mapPosition]} ${m.name}`),
				''
			].join('\n');
		}
		return null;
	}

	// Build Remaining/Missed Attack Embed [CLAN WAR]
	missing(data) {
		const [OneRem, TwoRem] = [
			data.clan.members.filter(m => m.attacks && m.attacks.length === 1),
			data.clan.members.filter(m => !m.attacks)
		];

		const embed = new MessageEmbed()
			.setTitle(`${data.clan.name} (${data.clan.tag})`)
			.setThumbnail(data.clan.badgeUrls.small)
			.setURL(this.clanURL(data.clan.tag))
			.setDescription([
				'**War Against**',
				`**[${Util.escapeMarkdown(data.opponent.name)} (${data.opponent.tag})](${this.clanURL(data.opponent.tag)})**`
			]);

		if (TwoRem.length) {
			embed.setDescription([
				embed.description,
				'',
				`**2 ${data.state === 'inWar' ? 'Remaining' : 'Missed'} Attacks**`,
				...TwoRem.sort((a, b) => a.mapPosition - b.mapPosition).map(m => `\u200e${BLUE_EMOJI[m.mapPosition]} ${m.name}`),
				''
			]);
		}

		if (OneRem.length) {
			embed.setDescription([
				embed.description,
				`**1 ${data.state === 'inWar' ? 'Remaining' : 'Missed'} Attack**`,
				...OneRem.sort((a, b) => a.mapPosition - b.mapPosition).map(m => `\u200e${BLUE_EMOJI[m.mapPosition]} ${m.name}`)
			]);
		}

		if (OneRem.length || TwoRem.length) return embed;
		return null;
	}

	clanURL(tag) {
		return `https://link.clashofclans.com/?action=OpenClanProfile&tag=${encodeURIComponent(tag)}`;
	}

	// Decides War Result
	result(clan, opponent) {
		const tied = clan.stars === opponent.stars && clan.destructionPercentage === opponent.destructionPercentage;
		if (tied) return null;
		const stars = clan.stars !== opponent.stars && clan.stars > opponent.stars;
		const destr = clan.stars === opponent.stars && clan.destructionPercentage > opponent.destructionPercentage;
		if (stars || destr) return color.green;
		return color.red;
	}

	// Builds Clan Roster
	roster(members = [], codeblock = false) {
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
				const list = chunks.map(th => {
					const total = `\`\u200e${th.total.toString().padStart(2, ' ')}\``;
					return `${townHallEmoji[th.level]} ${codeblock ? total : RED_EMOJI[th.total]}`;
				});
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
		const data = await client.fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(tag)}/currentwar`, {
			token: process.env.CLAN_WAR_TOKEN
		}).catch(() => null);
		if (!data) return null;
		if (!data.ok) return null;
		return data;
	}

	// set timer according to cache-control header
	setTimer(id, ms = 9e5, filter = true) {
		const cache = this.cached.get(id);
		if (cache && cache.intervalId) clearInterval(cache.intervalId);

		if (filter && !this.client.patron.get(cache.guild, 'guild', false)) ms += 6e5;
		if (ms < 2000) ms += 6e5;
		else ms += 2000;

		cache.intervalId = setInterval(this.exec.bind(this), ms, id);
		return this.cached.set(id, cache);
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
					channel: data.channel,
					tag: data.tag
				});
			}
		});

		for (const id of this.cached.keys()) {
			await this.exec(id);
			await this.delay(250);
		}
	}

	async add(id) {
		const data = await mongodb.db('clashperk')
			.collection('clanwarlogs')
			.findOne({ clan_id: ObjectId(id) });

		if (!data) return null;
		this.cached.set(ObjectId(data.clan_id).toString(), {
			guild: data.guild,
			channel: data.channel,
			tag: data.tag
		});

		return this.exec(ObjectId(id).toString());
	}

	clear() {
		for (const key of this.cached.keys()) {
			const cache = this.cached.get(key);
			if (cache?.intervalId) clearInterval(cache.intervalId);
		}
		return this.cached.clear();
	}

	delete(id) {
		const cache = this.cached.get(id);
		if (cache?.intervalId) clearInterval(cache.intervalId);
		return this.cached.delete(id);
	}
}

module.exports = ClanWarEvent;
