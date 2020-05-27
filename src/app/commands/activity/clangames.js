const { Command, Flag } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');
const Resolver = require('../../struct/Resolver');
const fetch = require('node-fetch');
const API = process.env.API_TOKENS.split(',');
const { emoji } = require('../../util/emojis');

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
		if (this.client.patron.isPatron(message.author, message.guild) || this.client.voteHandler.isVoter(message.author.id)) return 1000;
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

		const list = data.memberList.map(m => m.tag);
		const funcs = new Array(Math.ceil(list.length / 5)).fill().map(() => list.splice(0, 5))
			.map((tags, index) => async (collection = []) => {
				for (const tag of tags) {
					const member = await fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`, {
						method: 'GET',
						headers: { accept: 'application/json', authorization: `Bearer ${API[index]}` }
					}).then(res => res.json());
					const points = member.achievements.find(achievement => achievement.name === 'Games Champion');
					collection.push({ name: member.name, tag: member.tag, points: points.value });
				}
				return collection;
			});

		const requests = await Promise.all(funcs.map(func => func()));

		const array = [];
		for (const arr of requests) {
			for (const member of arr) {
				array.push({ tag: member.tag, name: member.name, points: member.points });
			}
		}

		const members = this.filter(array, clan);

		const total = members.reduce((a, b) => a + b.points || 0, 0);

		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium)
			.setDescription([
				`Clan Games Scoreboard [${data.members}/50]`,
				`\`\`\`\u200e\u2002# POINTS \u2002 ${'NAME'.padEnd(20, ' ')}`,
				members.map((m, i) => `${(++i).toString().padStart(2, '\u2002')} ${this.padStart(m.points || '0')} \u2002 ${this.padEnd(m.name)}`).join('\n'),
				'```'
			])
			.setFooter(`Points: ${total} [Avg: ${(total / data.members).toFixed(2)}]`);

		return message.util.send({ embed });
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
		return sorted.filter(item => item.points).concat(sorted.filter(item => !item.points));
	}
}

module.exports = ClanGamesCommand;
