const { Command, Flag } = require('discord-akairo');
const Fetch = require('../../struct/Fetch');
const fetch = require('node-fetch');
const { firestore } = require('../../struct/Database');
const { geterror, fetcherror, TownHallEmoji } = require('../../util/constants');


class MembersLeagueCommand extends Command {
	constructor() {
		super('members-league_', {
			aliases: ['mem'],
			category: 'owner',
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
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { data }) {
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag}) ~ ${data.members}/50`, data.badgeUrls.medium);

		const memberList = [];
		for (const tag of data.memberList.map(m => m.tag)) {
			const member = await fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`, {
				method: 'GET', headers: { Accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` }
			}).then(res => res.json());
			const star = member.achievements.filter(achievement => achievement.value);
			memberList.push({ townHallLevel: member.townHallLevel, name: member.name, cwlStar: star });
		}

		const items = this.sort(memberList);
		embed.setDescription([
			`<:townhall:631389478568591370> \`\u200b ${'CWL ⭐'.padStart(15, ' ')}\``,
			`${items.map(member => `${TownHallEmoji[member.townHallLevel]} \`${member.name} ${this.indent(member.name, member.cwlStar.toString())}\``).join('\n')}`
		]);

		return message.util.send({ embed });
	}

	sort(items) {
		return items.sort((a, b) => b.cwlStar - a.cwlStar);
	}

	paginate(items, start, end) {
		return { items: items.slice(start, end) };
	}

	indent(name, data) {
		return data.padStart(20 - name.length, ' ');
	}
}

module.exports = MembersLeagueCommand;
