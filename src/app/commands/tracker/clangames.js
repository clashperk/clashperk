const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const { firestore, mongodb } = require('../../struct/Database');
const fetch = require('node-fetch');
const API = process.env.APIS.split(',');

class ClanGamesCommand extends Command {
	constructor() {
		super('clangames', {
			aliases: ['clangames', 'points', 'cg'],
			category: 'owner',
			ownerOnly: true,
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			clientPermissions: ['ADD_REACTIONS', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Shows clan game points of your clan members.',
				usage: '<clan tag> [channel/hexColor] [hexColor/channel]',
				examples: ['#8QU8J9LP', '#8QU8J9LP #clan-games #5970C1', '#8QU8J9LP #5970C1 #clan-games']
			}
		});
	}

	*args() {
		const data = yield {
			type: 'clan',
			unordered: false,
			prompt: {
				start: 'What clan do you want to track clan games?',
				retry: (msg, { failure }) => failure.value
			}
		};

		return { data };
	}

	cooldown(message) {
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 3000;
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

		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium)
			.setDescription([
				`\`POINTS \u2002 ${'NAME'.padEnd(20, ' ')}\``,
				members.map(m => `\`\u200e${this.padStart(m.points || '')} \u2002 ${this.padEnd(m.name)}\``).join('\n')
			]);

		return message.util.send({ embed });
	}

	sort(items) {
		return items.sort((a, b) => b.points - a.points);
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

		const sorted = members.sort((a, b) => a.points - b.points);

		return sorted.filter(item => item.points).concat(sorted.filter(item => !item.points));
	}
}

module.exports = ClanGamesCommand;
