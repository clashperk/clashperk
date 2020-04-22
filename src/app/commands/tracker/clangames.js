const { Command, Flag } = require('discord-akairo');
const Fetch = require('../../struct/Fetch');
const { firestore, mongodb } = require('../../struct/Database');
const { geterror, fetcherror } = require('../../util/constants');
const fetch = require('node-fetch');
const API = process.env.APIS.split(',');

class ClanGamesCommand extends Command {
	constructor() {
		super('clangames', {
			aliases: ['clangames', 'points', 'cg'],
			category: 'tracker',
			channel: 'guild',
			// userPermissions: ['MANAGE_GUILD'],
			clientPermissions: ['ADD_REACTIONS', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Shows clan game points of your clan members.',
				usage: '<clan tag>',
				examples: ['#8QU8J9LP']
			}
		});
	}

	*args() {
		const data = yield {
			type: async (msg, str) => {
				const resolver = this.handler.resolver.type('guildMember')(msg, str || msg.member.id);
				if (!resolver && !str) return null;
				if (!resolver && str) {
					return Fetch.clan(str).then(data => {
						if (data.status !== 200) return msg.util.send({ embed: fetcherror(data.status) }) && Flag.cancel();
						return data;
					});
				}
				const data = await firestore.collection('linked_accounts')
					.doc(resolver.id)
					.get()
					.then(snap => snap.data());
				if (!data) return msg.util.send({ embed: geterror(resolver, 'clan') }) && Flag.cancel();
				if (!data.clan) return msg.util.send({ embed: geterror(resolver, 'clan') }) && Flag.cancel();
				return Fetch.clan(data.clan).then(data => {
					if (data.status !== 200) return msg.util.send({ embed: fetcherror(data.status) }) && Flag.cancel();
					return data;
				});
			},
			prompt: {
				start: 'what would you like to search for?',
				retry: 'what would you like to search for?'
			}
		};

		return { data };
	}

	cooldown(message) {
		if (this.client.patron.get(message.guild.id, 'guild', false) || this.client.patron.get(message.author.id, 'user', false) || this.client.voter.isVoter(message.author.id)) return 3000;
		return 20000;
	}

	async exec(message, { data }) {
		const db = mongodb.db('clashperk').collection('clangames');
		const clan = await db.findOne({ tag: data.tag });
		if (!clan) {
			return message.util.send({
				embed: { description: 'No Data Found' }
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
				`\`\u200e\u2002# POINTS \u2002 ${'NAME'.padEnd(20, ' ')}\``,
				members.map((m, i) => `\`\u200e${(++i).toString().padStart(2, '\u2002')} ${this.padStart(m.points || '0')} \u2002 ${this.padEnd(m.name)}\``).join('\n')
			])
			.setFooter(`Points ${total} [Avg: ${(total / data.members).toFixed(2)}]`);

		return message.util.send({ embed });
	}

	padStart(num) {
		return num.toString().padStart(6, ' ');
	}

	padEnd(data) {
		return data.padEnd(20, ' ');
	}

	filter(memberList, clan) {
		const members = memberList.map(member => {
			const points = member.tag in clan.memberList
				? member.points - clan.memberList[member.tag].points
				: null;
			return { tag: member.tag, name: member.name, points };
		});

		const sorted = members.sort((a, b) => b.points - a.points);

		return sorted.filter(item => item.points).concat(sorted.filter(item => !item.points));
	}
}

module.exports = ClanGamesCommand;
