const { Command, Argument, Flag } = require('discord-akairo');
const fetch = require('node-fetch');
const { MessageEmbed } = require('discord.js');
const { status } = require('../../util/constants');
const Resolver = require('../../struct/Resolver');
const { emoji, townHallEmoji } = require('../../util/emojis');
const { hitrate } = require('../../core/WarHitarte');
const CWL = require('../../core/CWLWarTags');

class CWLHitrateComamnd extends Command {
	constructor() {
		super('cwl-hitrate', {
			aliases: ['cwl-hitrate'],
			category: 'cwl-hidden_',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'MANAGE_MESSAGES', 'ADD_REACTIONS'],
			description: {
				content: [
					'Shows attacks of the current round.',
					'',
					'**Flags**',
					'`--round <num>` or `-r <num>` to see specific round.'
				],
				usage: '<clanTag>',
				examples: ['#8QU8J9LP']
			},
			optionFlags: ['--round', '-r', '-s']
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	*args() {
		const round = yield {
			match: 'option',
			flag: ['--round', '-r'],
			type: Argument.range('integer', 1, Infinity, true)
		};

		const star = yield {
			match: 'option',
			flag: ['-s'],
			type: Argument.range('integer', 1, 3, true)
		};

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

		return { data, round, star };
	}

	async exec(message, { data, round, star }) {
		await message.util.send(`**Fetching data... ${emoji.loading}**`);
		const uri = `https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}/currentwar/leaguegroup`;
		const res = await fetch(uri, {
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
				return this.rounds(message, cw, data, round, star);
			}
			const embed = this.client.util.embed()
				.setColor(this.client.embed(message))
				.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium, `https://link.clashofclans.com/?action=OpenClanProfile&tag=${data.tag}`)
				.setThumbnail(data.badgeUrls.medium)
				.setDescription('Clan is not in CWL');
			return message.util.send({ embed });
		}

		CWL.pushWarTags(data.tag, body.rounds);
		return this.rounds(message, body, data, round, star);
	}

	async rounds(message, body, clan, round, star = 3) {
		const clanTag = clan.tag;
		const rounds = body.rounds.filter(r => !r.warTags.includes('#0'));
		if (round && round > rounds.length) {
			const embed = new MessageEmbed()
				.setColor(this.client.embed(message))
				.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.medium)
				.setDescription([
					'This round is not available yet!',
					'',
					'**Available Rounds**',
					Array(rounds.length)
						.fill(0)
						.map((x, i) => `**\`${i + 1}\`** ${emoji.ok}`)
						.join('\n'),
					Array(body.rounds.length - rounds.length)
						.fill(0)
						.map((x, i) => `**\`${i + rounds.length + 1}\`** ${emoji.wrong}`)
						.join('\n')
				]);
			return message.util.send({ embed });
		}

		for (const { warTags } of rounds) {
			for (const warTag of warTags) {
				const res = await fetch(`https://api.clashofclans.com/v1/clanwarleagues/wars/${encodeURIComponent(warTag)}`, {
					method: 'GET', headers: { accept: 'application/json', authorization: `Bearer ${process.env.DEVELOPER_TOKEN}` }
				});
				const data = await res.json();
				if ((data.clan && data.clan.tag === clanTag) || (data.opponent && data.opponent.tag === clanTag)) {
					const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
					const opponent = data.clan.tag === clanTag ? data.opponent : data.clan;

					const hit = hitrate(clan, opponent, star);
					const combinations = [...hit.clan.hitrate, ...hit.opponent.hitrate]
						.map(({ th, vs }) => ({ th, vs }))
						.reduce((a, b) => {
							if (a.findIndex(x => x.th === b.th && x.vs === b.vs) < 0) a.push(b);
							return a;
						}, []);

					const arrrr = [];
					for (const { th, vs } of combinations) {
						const clan = hit.clan.hitrate.find(o => o.th === th && o.vs === vs);
						const opponent = hit.opponent.hitrate.find(o => o.th === th && o.vs === vs);

						const d = {};
						if (clan) d.clan = clan;
						else d.clan = { th, vs, attacks: 0, star: 0, hitrate: '0' };

						if (opponent) d.opponent = opponent;
						else d.opponent = { th, vs, attacks: 0, star: 0, hitrate: '0' };

						arrrr.push(d);
					}
					return message.util.send([
						`**${body.clan.name} vs ${body.opponent.name} (Hitrates - ${star} Star)**`,
						`${arrrr.map(d => `\`\u200e${d.clan.hitrate.padStart(3, ' ')}% ${`${d.clan.star}/${d.clan.attacks}`.padStart(5, ' ')} \u200f\`\u200e ${townHallEmoji[d.clan.th]} vs ${townHallEmoji[d.clan.vs]} \`\u200e ${`${d.opponent.star}/${d.opponent.attacks}`.padStart(5, ' ')} ${d.opponent.hitrate.padStart(3, ' ')}% \u200f\``).join('\n')}`
					]);
				}
			}
		}
	}
}

module.exports = CWLHitrateComamnd;
