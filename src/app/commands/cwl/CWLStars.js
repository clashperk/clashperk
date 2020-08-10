const { Command, Flag } = require('discord-akairo');
const fetch = require('node-fetch');
const { status } = require('../../util/constants');
const Resolver = require('../../struct/Resolver');
const Excel = require('../../struct/ExcelHandler');
const { emoji } = require('../../util/emojis');
const CWL = require('../../core/CWLWarTags');

class CWLStarsComamnd extends Command {
	constructor() {
		super('cwl-stars', {
			aliases: ['cwl-stars'],
			category: 'cwl-hidden',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Shows total stars and attacks of clan members.',
				usage: '<clanTag>',
				examples: ['#8QU8J9LP']
			},
			flags: ['--download', '-dl', '--excel']
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
					await message.channel.send({ embed: resolved.embed });
					return Flag.cancel();
				}
				return resolved;
			}
		};

		const excel = yield {
			match: 'flag',
			flag: ['--download', '-dl', '--excel']
		};

		return { data, excel };
	}

	async exec(message, { data, excel }) {
		if (!excel) await message.util.send(`**Fetching data... ${emoji.loading}**`);
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
				return this.rounds(message, cw, data, excel);
			}
			const embed = this.client.util.embed()
				.setColor(this.client.embed(message))
				.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium)
				.setThumbnail(data.badgeUrls.medium)
				.setDescription('Clan is not in CWL');
			return message.util.send({ embed });
		}

		CWL.pushWarTags(data.tag, body.rounds);
		return this.rounds(message, body, data, excel);
	}

	async rounds(message, body, clan, excel) {
		const rounds = body.rounds.filter(r => !r.warTags.includes('#0'));
		const [members, clanTag] = [{}, clan.tag];

		for (const { warTags } of rounds) {
			for (const warTag of warTags) {
				const res = await fetch(`https://api.clashofclans.com/v1/clanwarleagues/wars/${encodeURIComponent(warTag)}`, {
					method: 'GET', headers: { accept: 'application/json', authorization: `Bearer ${process.env.DEVELOPER_TOKEN}` }
				});
				const data = await res.json();

				if ((data.clan && data.clan.tag === clanTag) || (data.opponent && data.opponent.tag === clanTag)) {
					const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
					if (['inWar', 'warEnded'].includes(data.state)) {
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
					}
					break;
				}
			}
		}

		const patron = this.client.patron.check(message.author, message.guild);
		const leaderboard = Object.values(members)
			.sort((a, b) => b.stars - a.stars)
			.sort((a, b) => b.dest - a.dest);

		const embed = this.client.util.embed()
			.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.small)
			.setTitle('CWL Stars')
			.setColor(this.client.embed(message))
			.setDescription([
				`**\`\u200e # STAR HIT  ${'NAME'.padEnd(15, ' ')}\`**`,
				leaderboard.filter(m => m.of > 0)
					.map((m, i) => `\`\u200e${(++i).toString().padStart(2, ' ')}  ${m.stars.toString().padEnd(2, ' ')}  ${this.attacks(m.attacks, m.of).padEnd(3, ' ')}  ${m.name.padEnd(15, ' ')}\``)
					.join('\n')
			]);

		const msg = await message.util.send({
			embed,
			files: patron && excel
				? [{
					attachment: Buffer.from(await Excel.starList(leaderboard.filter(m => m.of > 0))),
					name: `${clan.name.toLowerCase()}_cwl_stars.xlsx`
				}]
				: null
		});

		await msg.react('➕');
		const collector = msg.createReactionCollector(
			(reaction, user) => ['➕'].includes(reaction.emoji.name) && user.id === message.author.id,
			{ time: 45000, max: 1 }
		);

		collector.on('collect', async reaction => {
			if (reaction.emoji.name === '➕') {
				leaderboard.sort((a, b) => (b.stars - b.lost) - (a.stars - a.lost));
				embed.setDescription([
					`**\`\u200e # STAR GAIN ${'NAME'.padEnd(15, ' ')}\`**`,
					leaderboard.filter(m => m.of > 0)
						.map((m, i) => {
							const gained = m.stars - m.lost >= 0 ? `+${m.stars - m.lost}` : `${m.stars - m.lost}`;
							return `\`\u200e${(++i).toString().padStart(2, ' ')}  ${m.stars.toString().padEnd(2, ' ')}  ${gained.padStart(3, ' ')}  ${m.name.padEnd(15, ' ')}\``;
						})
						.join('\n')
				]);
				await message.util.send({ embed });
				return collector.stop();
			}
		});

		collector.on('end', () => msg.reactions.removeAll());
	}

	destruction(dest) {
		return dest.toFixed()
			.toString()
			.concat('%')
			.padEnd(4, ' ');
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
}

module.exports = CWLStarsComamnd;
