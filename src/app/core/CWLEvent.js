const fetch = require('node-fetch');
const { mongodb } = require('../struct/Database');
const { ObjectId } = require('mongodb');
const { emoji, townHallEmoji } = require('../util/emojis');
const moment = require('moment');
require('moment-duration-format');
const { MessageEmbed } = require('discord.js');

class CWLEvent {
	constructor(client) {
		this.client = client;
		const cached = new Map();
	}

	exec(id, clan) {
		const cache = this.cached.get(id);
	}

	async init() {
		const collection = await mongodb.db('clashperk')
			.collection('cwllogs')
			.find()
			.toArray();

		collection.forEach(data => {
			if (this.client.guilds.cache.has(data.guild)) {
				this.cached.set(ObjectId(data.clan_id).toString(), {
					guild: data.guild,
					channel: data.channel,
					warTags: data.warTags
				});
			}
		});
	}

	preparation() { }

	inWar() { }

	warEnded() { }

	async fetchCWL(id, clan) {
		const res = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(clan.tag)}/currentwar/leaguegroup`, {
			method: 'GET', timeout: 3000,
			headers: { accept: 'application/json', authorization: `Bearer ${process.env.CWL_API_TOKEN}` }
		}).catch(() => null);
		if (!res) return;
		if (res.ok) return;
		const body = await res.json().catch(() => null);
		if (!body) return null;

		return this.rounds(id, body, clan);
	}

	async rounds(id, body, clan_data) {
		const [clanTag, clanName, clanBadge] = [clan_data.tag, clan_data.name, clan_data.badgeUrls.medium];
		const rounds = body.rounds.filter(r => !r.warTags.includes('#0'));

		const chunks = [];
		let index = 0;
		for (const { warTags } of rounds) {
			for (const warTag of warTags) {
				const res = await fetch(`https://api.clashofclans.com/v1/clanwarleagues/wars/${encodeURIComponent(warTag)}`, {
					method: 'GET', headers: { accept: 'application/json', authorization: `Bearer ${process.env.DEVELOPER_TOKEN}` }
				});
				const data = await res.json();

				if ((data.clan && data.clan.tag === clanTag) || (data.opponent && data.opponent.tag === clanTag)) {
					const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
					const opponent = data.clan.tag === clanTag ? data.opponent : data.clan;

					const embed = new MessageEmbed()
						.setColor(0x5970c1);
					embed.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.medium)
						.addField('War Against', `${opponent.name} (${opponent.tag})`)
						.addField('Team Size', `${data.teamSize}`);
					if (data.state === 'warEnded') {
						const end = new Date(moment(data.endTime).toDate()).getTime();
						embed.addField('State', 'War Ended')
							.addField('War Ended', `${moment.duration(Date.now() - end).format('D [days], H [hours] m [mins]', { trim: 'both mid' })} ago`)
							.addField('Stats', [
								`**${data.clan.name}**`,
								`${emoji.star} ${data.clan.stars} ${emoji.fire} ${clan.destructionPercentage.toFixed(2)}% ${emoji.attacksword} ${data.clan.attacks}`,
								'',
								`**${data.opponent.name}**`,
								`${emoji.star} ${data.opponent.stars} ${emoji.fire} ${opponent.destructionPercentage.toFixed(2)}% ${emoji.attacksword} ${data.opponent.attacks}`
							]);
					}
					if (data.state === 'inWar') {
						const started = new Date(moment(data.startTime).toDate()).getTime();
						embed.addField('State', 'In War')
							.addField('Started', `${moment.duration(Date.now() - started).format('D [days], H [hours] m [mins]', { trim: 'both mid' })} ago`)
							.addField('Stats', [
								`**${data.clan.name}**`,
								`${emoji.star} ${data.clan.stars} ${emoji.fire} ${data.clan.destructionPercentage.toFixed(2)}% ${emoji.attacksword} ${data.clan.attacks}`,
								'',
								`**${data.opponent.name}**`,
								`${emoji.star} ${data.opponent.stars} ${emoji.fire} ${data.opponent.destructionPercentage.toFixed(2)}% ${emoji.attacksword} ${data.opponent.attacks}`
							]);
					}
					if (data.state === 'preparation') {
						const start = new Date(moment(data.startTime).toDate()).getTime();
						embed.addField('State', 'Preparation')
							.addField('Starting In', `${moment.duration(start - Date.now()).format('D [days], H [hours] m [mins]', { trim: 'both mid' })}`);
					}
					embed.addField('Rosters', [
						`**${data.clan.name}**`,
						await this.count(data.clan.members),
						'',
						`**${data.opponent.name}**`,
						await this.count(data.opponent.members)
					]);
					embed.setFooter(`Round #${++index}`);

					chunks.push({ state: data.state, embed });
				}
			}
		}

		const item = chunks.length === 7
			? chunks.find(c => c.state === 'inWar') || chunks.slice(-1)[0]
			: chunks.slice(-2)[0];
		const pageIndex = chunks.indexOf(item);
	}

	async count(members) {
		let [TH13, TH12, TH11, TH10, TH09, TH08, TH07, TH06, TH05, TH04, TH03, TH02, TH01] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
		for (const member of members) {
			const TownHAll = member.townhallLevel;
			if (TownHAll === 13) TH13++;
			if (TownHAll === 12) TH12++;
			if (TownHAll === 11) TH11++;
			if (TownHAll === 10) TH10++;
			if (TownHAll === 9) TH09++;
			if (TownHAll === 8) TH08++;
			if (TownHAll === 7) TH07++;
			if (TownHAll === 6) TH06++;
			if (TownHAll === 5) TH05++;
			if (TownHAll === 4) TH04++;
			if (TownHAll === 3) TH03++;
			if (TownHAll === 2) TH02++;
			if (TownHAll === 1) TH01++;
		}

		const townHalls = [
			{ level: 1, total: TH01 },
			{ level: 2, total: TH02 },
			{ level: 3, total: TH03 },
			{ level: 4, total: TH04 },
			{ level: 5, total: TH05 },
			{ level: 6, total: TH06 },
			{ level: 7, total: TH07 },
			{ level: 8, total: TH08 },
			{ level: 9, total: TH09 },
			{ level: 10, total: TH10 },
			{ level: 11, total: TH11 },
			{ level: 12, total: TH12 },
			{ level: 13, total: TH13 }
		].filter(townHall => townHall.total !== 0).reverse();

		return this.chunk(townHalls)
			.map(chunks => chunks.map(th => `${townHallEmoji[th.level]} \`${th.total.toString().padStart(2, '0')}\``)
				.join(' '))
			.join('\n');
	}

	chunk(items = []) {
		const chunk = 5;
		const array = [];
		for (let i = 0; i < items.length; i += chunk) {
			array.push(items.slice(i, i + chunk));
		}
		return array;
	}

	async rounds_(message, body, { clanTag, clanName, clanBadge } = {}) {
		const collection = [];
		const rounds = body.rounds.filter(r => !r.warTags.includes('#0'));
		let [index, stars, destruction] = [0, 0, 0];
		const ranking = body.clans.map(clan => ({ tag: clan.tag, stars: 0 }));
		const members = body.clans.find(clan => clan.tag === clanTag)
			.members.map(member => ({ name: member.name, tag: member.tag, stars: 0, attacks: 0, of: 0 }));

		for (const { warTags } of rounds) {
			for (const warTag of warTags) {
				const res = await fetch(`https://api.clashofclans.com/v1/clanwarleagues/wars/${encodeURIComponent(warTag)}`, {
					method: 'GET', headers: { accept: 'application/json', authorization: `Bearer ${process.env.DEVELOPER_TOKEN}` }
				});
				const data = await res.json();
				this.ranking(data, ranking);

				if ((data.clan && data.clan.tag === clanTag) || (data.opponent && data.opponent.tag === clanTag)) {
					const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
					const opponent = data.clan.tag === clanTag ? data.opponent : data.clan;
					if (data.state === 'warEnded') {
						stars += this.winner(clan, opponent) ? clan.stars + 10 : clan.stars;
						destruction += clan.destructionPercentage * data.teamSize;
						const end = new Date(moment(data.endTime).toDate()).getTime();
						for (const member of clan.members) {
							members.find(m => m.tag === member.tag)
								.of += 1;
							if (member.attacks) {
								members.find(m => m.tag === member.tag)
									.attacks += 1;

								members.find(m => m.tag === member.tag)
									.stars += member.attacks[0].stars;
							}
						}

						collection.push([[
							`${this.winner(clan, opponent) ? emoji.ok : emoji.wrong} **${clan.name}** vs **${opponent.name}**`,
							`${emoji.clock_small} [Round ${++index}] Ended ${moment.duration(Date.now() - end).format('D[d], H[h] m[m]', { trim: 'both mid' })} ago`
						], [
							`\`${clan.stars.toString().padEnd(14, ' ')} Stars ${opponent.stars.toString().padStart(14, ' ')}\``,
							`\`${this.attacks(clan.attacks, data.teamSize).padEnd(13, ' ')} Attacks ${this.attacks(opponent.attacks, data.teamSize).padStart(13, ' ')}\``,
							`\`${this.destruction(clan.destructionPercentage).padEnd(11, ' ')} Destruction ${this.destruction(opponent.destructionPercentage).padStart(11, ' ')}\``
						]]);
					}
					if (data.state === 'inWar') {
						stars += clan.stars;
						destruction += clan.destructionPercentage * data.teamSize;
						const started = new Date(moment(data.startTime).toDate()).getTime();
						for (const member of clan.members) {
							members.find(m => m.tag === member.tag)
								.of += 1;
							if (member.attacks) {
								members.find(m => m.tag === member.tag)
									.attacks += 1;

								members.find(m => m.tag === member.tag)
									.stars += member.attacks[0].stars;
							}
						}

						collection.push([[
							`${emoji.loading} **${clan.name}** vs **${opponent.name}**`,
							`${emoji.clock_small} [Round ${++index}] Started ${moment.duration(Date.now() - started).format('D[d], H[h] m[m]', { trim: 'both mid' })} ago`
						], [
							`\`${clan.stars.toString().padEnd(14, ' ')} Stars ${opponent.stars.toString().padStart(14, ' ')}\``,
							`\`${this.attacks(clan.attacks, data.teamSize).padEnd(13, ' ')} Attacks ${this.attacks(opponent.attacks, data.teamSize).padStart(13, ' ')}\``,
							`\`${this.destruction(clan.destructionPercentage).padEnd(11, ' ')} Destruction ${this.destruction(opponent.destructionPercentage).padStart(11, ' ')}\``
						]]);
					}
				}
			}
		}

		const description = collection.map(arr => {
			const header = arr[0].join('\n');
			const description = arr[1].join('\n');
			return [header, description].join('\n');
		}).join('\n\n');
		const rank = ranking.sort((a, b) => b.stars - a.stars).findIndex(a => a.tag === clanTag);
		const leaderboard = members.sort((a, b) => b.stars - a.stars);
		const embed = new MessageEmbed()
			.setColor(0x5970c1)
			.setAuthor(`${clanName} CWL`, clanBadge)
			.setDescription(description)
			.setFooter(`Rank ${rank + 1}, ${stars} Stars, ${destruction.toFixed()}% Destruction`);
		const msg = await message.util.send({ embed });
		msg.react('ℹ');
		let react;
		try {
			react = await msg.awaitReactions(
				(reaction, user) => reaction.emoji.name === 'ℹ' && user.id === message.author.id,
				{ max: 1, time: 30000, errors: ['time'] }
			);
		} catch (error) {
			await msg.reactions.removeAll().catch(() => null);
			return message;
		}
		await msg.reactions.removeAll().catch(() => null);
		return message.channel.send({
			embed: {
				color: 0x5970c1,
				author: {
					name: `${clanName} CWL`,
					icon_url: clanBadge
				},
				description: [
					`\`\u200e # STAR  ⚔  ${'NAME'.padEnd(20, ' ')}\``,
					leaderboard.filter(m => m.attacks !== 0)
						.map((m, i) => `\`\u200e${(++i).toString().padStart(2, ' ')} ${m.stars.toString().padStart(3, ' ')}  ${this.attacks(m.attacks, m.of).padStart(6, ' ')}   ${m.name.padEnd(20, ' ')}\``).join('\n')
				].join('\n')
			}
		});
	}

	destruction(dest) {
		return dest.toFixed(2).toString().concat('%');
	}

	attacks(num, team) {
		return num.toString().concat(`/${team}`);
	}

	winner(clan, opponent) {
		if (clan.stars > opponent.stars) {
			return true;
		} else if (clan.stars < opponent.stars) {
			return false;
		}
		if (clan.destructionPercentage > opponent.destructionPercentage) {
			return true;
		} else if (clan.destructionPercentage < opponent.destructionPercentage) {
			return false;
		}
	}

	ranking(data, ranking) {
		if (data.state === 'warEnded') {
			ranking.find(({ tag }) => tag === data.clan.tag)
				.stars += this.winner(data.clan, data.opponent)
					? data.clan.stars + 10
					: data.clan.stars;

			ranking.find(({ tag }) => tag === data.opponent.tag)
				.stars += this.winner(data.opponent, data.clan)
					? data.opponent.stars + 10
					: data.opponent.stars;
		}

		if (data.state === 'inWar') {
			ranking.find(({ tag }) => tag === data.clan.tag)
				.stars += data.clan.stars;

			ranking.find(({ tag }) => tag === data.opponent.tag)
				.stars += data.opponent.stars;
		}

		return ranking;
	}
}

module.exports = CWLEvent;
