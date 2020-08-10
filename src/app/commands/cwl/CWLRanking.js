const { Command, Flag } = require('discord-akairo');
const fetch = require('node-fetch');
const { MessageEmbed } = require('discord.js');
const { status } = require('../../util/constants');
const Resolver = require('../../struct/Resolver');
const { emoji, redNum } = require('../../util/emojis');
const CWL = require('../../core/CWLWarTags');

class CWLRankingComamnd extends Command {
	constructor() {
		super('cwl-ranking', {
			aliases: ['cwl-ranking', 'cwl-rank'],
			category: 'cwl-hidden',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Shows clan ranking.',
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
					await message.channel.send({ embed: resolved.embed });
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

		CWL.pushWarTags(data.tag, body.rounds);
		return this.rounds(message, body, data);
	}

	async rounds(message, body, clan) {
		const clanTag = clan.tag;
		const rounds = body.rounds.filter(r => !r.warTags.includes('#0'));
		let [stars, destruction, padding] = [0, 0, 5];
		const ranking = body.clans.map(clan => ({ name: clan.name, tag: clan.tag, stars: 0, destruction: 0 }));

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
					}
					if (data.state === 'inWar') {
						stars += clan.stars;
						destruction += clan.destructionPercentage * data.teamSize;
					}

					if (destruction > 9999) padding = 6;
				}
			}
		}


		const rank = ranking.sort((a, b) => b.stars - a.stars).findIndex(a => a.tag === clanTag);
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`${clan.name} ${clan.tag}`, clan.badgeUrls.small)
			.setTitle('CWL Ranking')
			.setDescription([
				`${emoji.hash} **\`\u200eSTAR DEST${''.padEnd(padding - 2, ' ')}${'NAME'.padEnd(15, ' ')}\`**`,
				ranking.sort((a, b) => b.stars - a.stars)
					.map((clan, i) => `${redNum[++i]} \`\u200e${clan.stars.toString().padEnd(3, ' ')}  ${this.destruction(clan.destruction, padding)}  ${clan.name.padEnd(15, ' ')}\``)
					.join('\n')
			])
			.setFooter(`Rank ${rank + 1}, ${stars} Stars, ${destruction.toFixed()}% Destruction`);
		return message.util.send({ embed });
	}

	destruction(dest, padding) {
		return dest.toFixed()
			.toString()
			.concat('%')
			.padEnd(padding, ' ');
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

			ranking.find(({ tag }) => tag === data.clan.tag)
				.destruction += data.clan.destructionPercentage * data.teamSize;

			ranking.find(({ tag }) => tag === data.opponent.tag)
				.stars += this.winner(data.opponent, data.clan)
					? data.opponent.stars + 10
					: data.opponent.stars;

			ranking.find(({ tag }) => tag === data.opponent.tag)
				.destruction += data.opponent.destructionPercentage * data.teamSize;
		}

		if (data.state === 'inWar') {
			ranking.find(({ tag }) => tag === data.clan.tag)
				.stars += data.clan.stars;

			ranking.find(({ tag }) => tag === data.clan.tag)
				.destruction += data.clan.destructionPercentage * data.teamSize;

			ranking.find(({ tag }) => tag === data.opponent.tag)
				.stars += data.opponent.stars;

			ranking.find(({ tag }) => tag === data.opponent.tag)
				.destruction += data.opponent.destructionPercentage * data.teamSize;
		}

		return ranking;
	}
}

module.exports = CWLRankingComamnd;
