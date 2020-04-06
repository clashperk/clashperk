const { Command, Flag } = require('discord-akairo');
const Fetch = require('../../struct/Fetch');
const fetch = require('node-fetch');
const { firestore } = require('../../struct/Database');
const { geterror, fetcherror } = require('../../util/constants');
const { emoji, townHallEmoji } = require('../../util/emojis');
const { Util } = require('discord.js');

class CWLMvpCommand extends Command {
	constructor() {
		super('cwlmvp', {
			aliases: ['cwltop', 'cwlmvp'],
			category: 'cwl',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'MANAGE_MESSAGES'],
			description: {
				content: 'Most valuable clan members sorted by CWL stars.',
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
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 3000;
		return 15000;
	}

	async exec(message, { data }) {
		await message.util.send(`**Making list... ${emoji.loading}**`);
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium);

		const memberList = [];
		for (const tag of data.memberList.map(m => m.tag)) {
			const member = await fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`, {
				method: 'GET',
				headers: { accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` }
			}).then(res => res.json());
			const star = member.achievements.find(achievement => achievement.name === 'War League Legend');
			memberList.push({ townHallLevel: member.townHallLevel, name: member.name, cwlStar: star.value });
		}

		const items = this.sort(memberList);
		embed.setDescription([
			'List of most valuable players, sorted by total stars of CWL',
			'',
			`${emoji.townhall}\`» STAR  ${this.padEnd('NAME')}\``,
			items.slice(0, 30)
				.map(member => {
					const name = this.padEnd(member.name);
					const star = this.padStart(member.cwlStar.toString());
					return `${townHallEmoji[member.townHallLevel]}\`» ${star}  ${name}\``;
				})
				.join('\n')
		]);

		return message.util.send({ embed });
	}

	sort(items) {
		return items.sort((a, b) => b.cwlStar - a.cwlStar);
	}

	padStart(msg) {
		return msg.padStart(4, ' ');
	}

	padEnd(data) {
		return Util.escapeMarkdown(data).padEnd(20, ' ');
	}
}

module.exports = CWLMvpCommand;
