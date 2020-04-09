const { Command, Flag } = require('discord-akairo');
const Fetch = require('../../struct/Fetch');
const { firestore, mongodb } = require('../../struct/Database');
const { geterror, fetcherror } = require('../../util/constants');

class LastOnlineCommand extends Command {
	constructor() {
		super('lastonline', {
			aliases: ['lastonline'],
			category: 'owner',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			clientPermissions: ['ADD_REACTIONS', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Shows last online',
				usage: '<clan tag> [channel/hexColor] [hexColor/channel]',
				examples: ['#8QU8J9LP', '#8QU8J9LP #player-log #5970C1', '#8QU8J9LP #5970C1 #player-log']
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
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 3000;
		return 5000;
	}

	async exec(message, { data }) {
		const db = mongodb.db('clashperk').collection('lastonlines');

		const clan = await db.findOne({ tag: data.tag });
		if (!clan) {
			return message.util.send({
				description: 'No Data Found'
			});
		}

		const embed = this.client.util.embed()
			.setAuthor(data.name, data.badgeUrls.medium)
			.setDescription([
				`\`\`\`\u200e${'Last On'.padStart(7, ' ')}   ${'Name'.padEnd(20, ' ')}\n${this.filter(data, clan)
					.map(m => `${m.lastOnline ? require('ms')(m.lastOnline).padStart(7, ' ') : '55555'.padStart(7, ' ')}   ${this.padEnd(m.name)}`)
					.join('\n')}\`\`\``.length
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

module.exports = LastOnlineCommand;
