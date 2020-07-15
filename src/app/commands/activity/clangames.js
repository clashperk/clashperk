const { Command, Flag } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');
const Resolver = require('../../struct/Resolver');
const fetch = require('node-fetch');
const TOKENS = process.env.$KEYS.split(',');
const { emoji } = require('../../util/emojis');
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
			}
		});
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

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { data }) {
		await message.util.send(`**Fetching data... ${emoji.loading}**`);
		const db = mongodb.db('clashperk').collection('clangames');
		const prefix = this.handler.prefix(message);
		const clan = await db.findOne({ tag: data.tag });
		if (!clan) {
			return message.util.send({
				embed: {
					description: [
						'Setup a clan games board to use this command.',
						`Type \`${prefix}help cgboard\` to know more.`
					].join(' ')
				}
			});
		}

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
				? m.achievements.find(achievement => achievement.name === 'Games Champion')
				: 0;
			const member = { tag: m.tag, name: m.name, points: points.value };
			return member;
		});

		const members = this.filter(memberList, clan);
		const total = members.reduce((a, b) => a + b.points || 0, 0);

		const DAY = this.client.settings.get('global', 'clangamesDay', 22);
		const START = [new Date().getFullYear(), (new Date().getMonth() + 1).toString().padStart(2, '0'), `${DAY}T08:00:00Z`].join('-');
		const createdAt = new Date(ObjectId(clan._id).getTimestamp());

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium)
			.setDescription([
				`Clan Games Scoreboard [${data.members}/50]`,
				`\`\`\`\u200e\u2002# POINTS \u2002 ${'NAME'.padEnd(20, ' ')}`,
				members.slice(0, 55)
					.map((m, i) => {
						const points = this.padStart(m.points || '0');
						return `\u200e${(++i).toString().padStart(2, '\u2002')} ${points} \u2002 ${m.name}`;
					}).join('\n'),
				'```'
			])
			.setFooter(`Points: ${total} [Avg: ${(total / data.members).toFixed(2)}]`);

		const content = `${createdAt > new Date(START) ? `\nBoard created on ${moment(createdAt).format('D MMMM YYYY, kk:mm')}` : ''}`;
		return message.util.send(content, { embed });
	}

	padStart(num) {
		return num.toString().padStart(6, ' ');
	}

	padEnd(data) {
		return data.padEnd(16, ' ');
	}

	filter(memberList, clan) {
		const members = memberList.map(member => {
			const points = member.tag in clan.members
				? (member.points - clan.members[member.tag].points) > 4000
					? 4000
					: member.points - clan.members[member.tag].points
				: null;
			return { tag: member.tag, name: member.name, points };
		});

		const tags = memberList.map(m => m.tag);
		const excess = Object.values(clan.members)
			.filter(x => x.gain && x.gain > 0 && !tags.includes(x.tag))
			.map(x => ({ name: x.name, tag: x.tag, points: x.gain > 4000 ? 4000 : x.gain }));
		const sorted = members.concat(excess).sort((a, b) => b.points - a.points);
		// const sorted = members.sort((a, b) => b.points - a.points);
		return sorted.filter(item => item.points).concat(sorted.filter(item => !item.points));
	}
}

module.exports = ClanGamesCommand;
