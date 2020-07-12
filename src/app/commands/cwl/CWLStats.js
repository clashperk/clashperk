const { Command, Argument, Flag } = require('discord-akairo');
const fetch = require('node-fetch');
const moment = require('moment');
const { MessageEmbed } = require('discord.js');
const { status } = require('../../util/constants');
const Resolver = require('../../struct/Resolver');
const { emoji } = require('../../util/emojis');
const CWL = require('../../core/CWLWarTags');

class CWLStatsComamnd extends Command {
	constructor() {
		super('cwl-stats', {
			aliases: ['cwl-stats'],
			category: 'cwl-hidden',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Shows some statistics for each round.',
				usage: '<clanTag>',
				examples: ['#8QU8J9LP']
			}
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	*args() {
		const data = yield {
			type: async (message, args) => {
				const resolved = await Resolver.resolve(message, args);
				if (resolved.status !== 200) {
					await message.util.send({ embed: resolved.embed });
					return Flag.cancel();
				}
				return resolved;
			}
		};

		return { data };
	}

	async exec(message, { data }) {
		await message.util.send(`**Fetching data... ${emoji.loading}**`);
		const res = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}/currentwar/leaguegroup`, {
			method: 'GET', timeout: 3000,
			headers: { accept: 'application/json', authorization: `Bearer ${process.env.DEVELOPER_TOKEN}` }
		}).catch(() => null);

		if (!res) {
			return message.util.send({
				embed: {
					color: 0xf30c11,
					author: { name: 'Error' },
					description: status(504)
				}
			});
		}

		const body = await res.json();

		if (!(body.state || res.ok)) {
			const cw = await CWL.get(data.tag);
			if (cw) {
				return this.rounds(message, cw, data);
			}
			const embed = this.client.util.embed()
				.setColor(this.client.embed(message))
				.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium, `https://link.clashofclans.com/?action=OpenClanProfile&tag=${data.tag}`)
				.setThumbnail(data.badgeUrls.medium)
				.setDescription('Clan is not in CWL');
			return message.util.send({ embed });
		}

		return this.rounds(message, body, data);
	}

	async rounds(message, body, clan) {
		const collection = [];
		const rounds = body.rounds.filter(r => !r.warTags.includes('#0'));
		let [index, stars, destruction] = [0, 0, 0];
		const [members, clanTag, ranking] = [{}, clan.tag, {}];

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
						for (const m of clan.members) {
							const member = members[m.tag]
								? members[m.tag]
								: members[m.tag] = {
									name: m.name,
									of: 0,
									attacks: 0,
									stars: 0,
									dest: 0,
									lost: 0
								};
							member.of += 1;

							if (m.attacks) {
								member.attacks += 1;
								member.stars += m.attacks[0].stars;
								member.dest += m.attacks[0].destructionPercentage;
							}

							if (m.bestOpponentAttack) {
								member.lost += m.bestOpponentAttack.stars;
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
						for (const m of clan.members) {
							const member = members[m.tag]
								? members[m.tag]
								: members[m.tag] = {
									name: m.name,
									of: 0,
									attacks: 0,
									stars: 0,
									dest: 0,
									lost: 0
								};
							member.of += 1;

							if (m.attacks) {
								member.attacks += 1;
								member.stars += m.attacks[0].stars;
								member.dest += m.attacks[0].destructionPercentage;
							}

							if (m.bestOpponentAttack) {
								member.lost += m.bestOpponentAttack.stars;
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

		const clans = [];
		for (const [key, value] of Object.entries(ranking)) clans.push({ [key]: value });
		const rank = clans.sort((a, b) => b.stars - a.stars).findIndex(a => a.tag === clanTag);
		const leaderboard = Object.values(members).sort((a, b) => b.stars - a.stars);

		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`${clan.name} CWL`, clan.badgeUrls.small)
			.setDescription(description)
			.setFooter(`Rank ${rank + 1}, ${stars} Stars, ${destruction.toFixed()}% Destruction`);

		const msg = await message.util.send({ embed });
		await msg.react('➕');

		const collector = await msg.awaitReactions(
			(reaction, user) => reaction.emoji.name === '➕' && user.id === message.author.id,
			{ max: 1, time: 30000, errors: ['time'] }
		).catch(() => null);

		if (!msg.deleted) await msg.reactions.removeAll().catch(() => null);
		if (!collector || !collector.size) return;

		return message.channel.send({
			embed: {
				color: this.client.embed(message),
				author: {
					name: `${clan.name} CWL`,
					icon_url: clan.badgeUrls.small
				},
				description: [
					`**\`\u200e # STAR HIT  ${'NAME'.padEnd(15, ' ')}\`**`,
					leaderboard.filter(m => m.of > 0)
						.map((m, i) => `\`\u200e${(++i).toString().padStart(2, ' ')}  ${m.stars.toString().padEnd(2, ' ')}  ${this.attacks(m.attacks, m.of).padEnd(3, ' ')}  ${m.name.padEnd(15, ' ')}\``)
						.join('\n')
				].join('\n')
			}
		});
	}

	dest(dest) {
		return dest.toFixed()
			.toString()
			.concat('%')
			.padEnd(4, ' ');
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
			ranking[data.clan.tag] += this.winner(data.clan, data.opponent)
				? data.clan.stars + 10
				: data.clan.stars;

			ranking[data.opponent.tag] += this.winner(data.opponent, data.clan)
				? data.opponent.stars + 10
				: data.opponent.stars;
		}

		if (data.state === 'inWar') {
			ranking[data.clan.tag] += data.clan.stars;

			ranking[data.opponent.tag] += data.opponent.stars;
		}

		return ranking;
	}
}

module.exports = CWLStatsComamnd;
