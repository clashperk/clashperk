const { Command, Flag } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');
const Resolver = require('../../struct/Resolver');
const fetch = require('node-fetch');
const TOKENS = process.env.CLASH_TOKENS.split(',');
const { emoji } = require('../../util/Emojis');
const { ObjectId } = require('mongodb');
const moment = require('moment');

class ClanGamesCommand extends Command {
	constructor() {
		super('clangames', {
			aliases: ['clangames', 'points', 'cg'],
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['ADD_REACTIONS', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Shows clan game points of your clan members.',
				usage: '<clanTag>',
				examples: ['#8QU8J9LP']
			},
			flags: ['--max', '--filter']
		});
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

		const force = yield {
			match: 'flag',
			flag: ['--max']
		};

		const filter = yield {
			match: 'flag',
			flag: ['--filter']
		};

		return { data, force, filter };
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { data, force, filter }) {
		const clan = await mongodb.db('clashperk').collection('clangames').findOne({ tag: data.tag });
		if (!clan) {
			return message.util.send({
				embed: {
					description: 'Not enough data available to show the board, make sure clan games board is enabled or try again after some hours.'
				}
			});
		}

		await message.util.send(`**Fetching data... ${emoji.loading}**`);
		const KEYS = TOKENS.map(token => ({ n: Math.random(), token })).sort((a, b) => a.n - b.n).map(a => a.token);
		const requests = data.memberList.map((m, i) => {
			const req = {
				url: `https://api.clashofclans.com/v1/players/${encodeURIComponent(m.tag)}`,
				option: {
					method: 'GET',
					headers: { accept: 'application/json', authorization: `Bearer ${KEYS[i % KEYS.length]}` }
				}
			};
			return req;
		});

		const responses = await Promise.all(requests.map(req => fetch(req.url, req.option)));
		const fetched = await Promise.all(responses.map(res => res.json()));
		const memberList = fetched.map(m => {
			const points = m.achievements
				? m.achievements.find(a => a.name === 'Games Champion')
				: { value: 0 };
			return { tag: m.tag, name: m.name, points: points.value };
		});

		const members = this.filter(memberList, clan, force);
		const total = members.reduce((a, b) => a + b.points || 0, 0);

		const now = new Date();
		const day = this.client.cacheHandler.clanGamesLog.gameDay;
		const iso = [now.getFullYear(), (now.getMonth() + 1).toString().padStart(2, '0'), `${day}T08:00:00Z`].join('-');
		const createdAt = new Date(ObjectId(clan._id).getTimestamp());

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium)
			.setDescription([
				`Clan Games Scoreboard [${data.members}/50]`,
				`\`\`\`\n\u200e\u2002# POINTS \u2002 ${'NAME'.padEnd(20, ' ')}`,
				members.slice(0, 55)
					.filter(d => filter ? d.points > 0 : d.points >= 0)
					.map((m, i) => {
						const points = this.padStart(m.points);
						return `\u200e${(++i).toString().padStart(2, '\u2002')} ${points} \u2002 ${m.name}`;
					})
					.join('\n'),
				'```'
			])
			.setFooter(`Points: ${total} [Avg: ${(total / data.members).toFixed(2)}]`, this.client.user.displayAvatarURL());

		const content = `${createdAt > new Date(iso) ? `\nBoard created on ${moment(createdAt).format('D MMMM YYYY, kk:mm')}` : ''}`;
		return message.util.send(content, { embed });
	}

	padStart(num) {
		return num.toString().padStart(6, ' ');
	}

	padEnd(data) {
		return data.padEnd(16, ' ');
	}

	filter(memberList, data, force) {
		const members = memberList.map(m => {
			const points = m.tag in data.members ? m.points - data.members[m.tag].points : 0;
			return { tag: m.tag, name: m.name, points, endedAt: data.members[m.tag]?.endedAt };
		});

		const maxPoint = this.client.cacheHandler.clanGamesLog.maxPoint;
		const tags = memberList.map(m => m.tag);
		const excess = Object.values(data.members)
			.filter(x => x.gain && x.gain > 0 && !tags.includes(x.tag))
			.map(x => ({ name: x.name, tag: x.tag, points: x.gain, endedAt: x?.endedAt }));

		return members.concat(excess)
			.sort((a, b) => b.points - a.points)
			.sort((a, b) => new Date(a.endedAt) - new Date(b.endedAt))
			.map(x => ({ name: x.name, tag: x.tag, points: x.points > maxPoint && !force ? maxPoint : x.points }));
	}
}

module.exports = ClanGamesCommand;
