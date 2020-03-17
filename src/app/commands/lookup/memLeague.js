const { Command, Flag } = require('discord-akairo');
const fetch = require('../../struct/Fetch');
const { firestore } = require('../../struct/Database');
const { geterror, fetcherror, leagueStrings } = require('../../util/constants');

class MembersLeagueCommand extends Command {
	constructor() {
		super('members-league', {
			category: 'lookup',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Displays a list of clan members.',
				usage: '<tag>',
				examples: ['#2Q98URCGY', '2Q98URCGY']
			}
		});
	}

	*args() {
		const data = yield {
			type: async (msg, str) => {
				const resolver = this.handler.resolver.type('guildMember')(msg, str || msg.member.id);
				if (!resolver && !str) return null;
				if (!resolver && str) {
					return fetch.clan(str).then(data => {
						if (data.status !== 200) return msg.util.send({ embed: fetcherror(data.status) }) && Flag.cancel();
						return data;
					});
				}
				const data = await firestore.collection('linked_clans')
					.doc(resolver.id)
					.get()
					.then(snap => snap.data());
				if (!data) return msg.util.send({ embed: geterror(resolver, 'clan') }) && Flag.cancel();
				if (!data[msg.guild.id]) return msg.util.send({ embed: geterror(resolver, 'clan') }) && Flag.cancel();
				return fetch.clan(data[msg.guild.id].tag).then(data => {
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
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { data }) {
		const first = this.paginate(data.memberList, 0, 32);
		const second = this.paginate(data.memberList, 32, 35);
		const third = this.paginate(data.memberList, 35, 50);

		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag}) ~ ${data.members}/50`, data.badgeUrls.medium)
			.setDescription(first.items.map(member => `${leagueStrings[member.league.id]} **${member.name}** ${member.tag}`).join('\n'));
		if (data.members > 32) {
			embed.addField(second.items.map(member => `${leagueStrings[member.league.id]} **${member.name}** ${member.tag}`).join('\n'), [
				third.items.length ? third.items.map(member => `${leagueStrings[member.league.id]} **${member.name}** ${member.tag}`).join('\n') : '\u200b'
			]);
		}

		return message.util.send({ embed });
	}

	paginate(items, start, end) {
		return { items: items.slice(start, end) };
	}
}

module.exports = MembersLeagueCommand;
