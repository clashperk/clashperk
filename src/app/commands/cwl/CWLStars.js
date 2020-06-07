const { Command, Argument, Flag } = require('discord-akairo');
const fetch = require('node-fetch');
const moment = require('moment');
const { MessageEmbed } = require('discord.js');
const { status } = require('../../util/constants');
const Resolver = require('../../struct/Resolver');
const { emoji } = require('../../util/emojis');

class CWLStarsComamnd extends Command {
	constructor() {
		super('cwl-stars', {
			aliases: ['cwl-stars'],
			category: 'hidden',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Shows stars of current cwl.',
				usage: '<clanTag>',
				examples: ['#8QU8J9LP']
			}
		});
	}

	cooldown(message) {
		if (this.client.patron.isPatron(message.author, message.guild) || this.client.voteHandler.isVoter(message.author.id)) return 2000;
		return 10000;
	}

	*args() {
		const round = yield {
			match: 'option',
			flag: ['--round', '-r'],
			type: Argument.range('integer', 1, 7, true)
		};

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

		return { data, round };
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

		const embed = this.client.util.embed()
			.setColor(0x5970c1);

		if (!(body.state || res.ok)) {
			embed.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium, `https://link.clashofclans.com/?action=OpenClanProfile&tag=${data.tag}`)
				.setThumbnail(data.badgeUrls.medium)
				.setDescription('Clan is not in CWL');
			return message.util.send({ embed });
		}

		return this.rounds(message, body, { clanTag: data.tag, clanName: data.name, clanBadge: data.badgeUrls.medium });
	}

	async rounds(message, body, { clanTag, clanName, clanBadge } = {}) {
		const rounds = body.rounds.filter(r => !r.warTags.includes('#0'));
		let [padding] = [3];
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
					if (data.state === 'warEnded') {
						for (const member of clan.members) {
							members.find(m => m.tag === member.tag)
								.of += 1;
							if (members.find(m => m.tag === member.tag).of > 9) padding = 5;
							if (member.attacks) {
								members.find(m => m.tag === member.tag)
									.attacks += 1;

								members.find(m => m.tag === member.tag)
									.stars += member.attacks[0].stars;
							}
						}
					}
					if (data.state === 'inWar') {
						for (const member of clan.members) {
							members.find(m => m.tag === member.tag)
								.of += 1;
							if (members.find(m => m.tag === member.tag).of > 9) padding = 5;
							if (member.attacks) {
								members.find(m => m.tag === member.tag)
									.attacks += 1;

								members.find(m => m.tag === member.tag)
									.stars += member.attacks[0].stars;
							}
						}
					}
				}
			}
		}

		const leaderboard = members.sort((a, b) => b.stars - a.stars);
		return message.channel.send({
			embed: {
				color: 0x5970c1,
				author: {
					name: `${clanName} CWL`,
					icon_url: clanBadge
				},
				description: [
					`\`\u200e # STAR ${padding > 3 ? 'ATTCK' : 'ATT'}  ${'NAME'.padEnd(20, ' ')}\``,
					leaderboard.filter(m => m.attacks !== 0)
						.map((m, i) => `\`\u200e${(++i).toString().padStart(2, ' ')}  ${m.stars.toString().padEnd(2, ' ')}  ${this.attacks(m.attacks, m.of).padEnd(padding, ' ')}  ${m.name.padEnd(20, ' ')}\``).join('\n')
				].join('\n')
			}
		});
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

module.exports = CWLStarsComamnd;
