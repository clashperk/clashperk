const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const { firestore, mongodb } = require('../../struct/Database');

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

		const channel = yield {
			type: 'textChannel',
			unordered: [1, 2],
			default: message => message.channel
		};

		const color = yield {
			type: 'color',
			unordered: [1, 2],
			default: 5861569
		};

		return { data, channel, color };
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

		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium)
			.setDescription([
				`\`\`\`\u200e${'Last On'.padStart(7, ' ')}   ${'Name'.padEnd(20, ' ')}\n${this.filter(data, clan)
					.map(m => `${m.lastOnline ? this.format(m.lastOnline + 1e3).padStart(7, ' ') : ''.padStart(7, ' ')}   ${this.padEnd(m.name)}`)
					.join('\n')}\`\`\``
			]);

		return message.util.send({ embed });
	}

	padEnd(data) {
		return data.padEnd(20, ' ');
	}

	filter(data, clan) {
		const members = data.memberList.map(member => {
			const lastOnline = member.tag in clan.memberList
				? new Date() - new Date(clan.memberList[member.tag].lastOnline)
				: null;
			return { tag: member.tag, name: member.name, lastOnline };
		});

		const sorted = members.sort((a, b) => a.lastOnline - b.lastOnline);

		return sorted.filter(item => item.lastOnline).concat(sorted.filter(item => !item.lastOnline));
	}
}

module.exports = ClanGamesCommand;
