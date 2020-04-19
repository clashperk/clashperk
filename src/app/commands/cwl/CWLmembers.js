const { Command, Flag } = require('discord-akairo');
const fetch = require('node-fetch');
const { Util } = require('discord.js');
const Fetch = require('../../struct/Fetch');
const { firestore } = require('../../struct/Database');
const { geterror, fetcherror } = require('../../util/constants');
const { emoji } = require('../../util/emojis');
const API = process.env.APIS.split(',');

class CwlMembersComamnd extends Command {
	constructor() {
		super('cwl-members', {
			aliases: ['cwl-members', 'cwl-mem', 'cwl-lineup'],
			category: 'cwl',
			description: {
				content: 'CWL members command.',
				usage: '<tag>',
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
				start: 'What would you like to search for?',
				retry: 'What would you like to search for?'
			}
		};
		return { data };
	}


	cooldown(message) {
		if (this.client.patron.get(message.guild.id, 'guild', false) || this.client.patron.get(message.author.id, 'user', false) || this.client.voter.isVoter(message.author.id)) return 3000;
		return 20000;
	}

	async exec(message, { data }) {
		await message.util.send(`**Fetching data... ${emoji.loading}**`);
		const uri = `https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}/currentwar/leaguegroup`;
		const res = await fetch(uri, {
			method: 'GET', timeout: 3000,
			headers: { accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` }
		}).catch(() => null);

		if (!res) {
			return message.util.send({ embed: fetcherror(504) });
		}

		if (!res.ok) {
			const embed = this.client.util.embed()
				.setColor(3093046)
				.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium, `https://link.clashofclans.com/?action=OpenClanProfile&tag=${data.tag}`)
				.setThumbnail(data.badgeUrls.medium)
				.setDescription('Clan is not in CWL');
			return message.util.send({ embed });
		}

		const clan = await res.json();

		const clanMembers = clan.clans.find(clan => clan.tag === data.tag).members;
		const list = clanMembers.map(m => m.tag);
		const funcs = new Array(Math.ceil(list.length / 5)).fill().map(() => list.splice(0, 5))
			.map((tags, index) => async (collection = []) => {
				for (const tag of tags) {
					const member = await fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`, {
						method: 'GET',
						headers: { accept: 'application/json', authorization: `Bearer ${API[index]}` }
					}).then(res => res.json());
					collection.push({ name: member.name, tag: member.tag, townHallLevel: member.townHallLevel, heroes: member.heroes });
				}
				return collection;
			});

		const requests = await Promise.all(funcs.map(func => func()));

		const memberList = [];
		/* [[1, 4], [2], [3]].reduce((a, b) => {
			a.push(...b);
			return a;
		}, []);*/
		for (const array of requests) {
			for (const member of array) {
				memberList.push({
					tag: member.tag,
					name: member.name,
					townHallLevel: member.townHallLevel,
					heroes: member.heroes.filter(a => a.village === 'home')
				});
			}
		}

		let members = '';
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag}) ~ ${memberList.length}`, data.badgeUrls.medium);

		for (const member of memberList.sort((a, b) => b.townHallLevel - a.townHallLevel)) {
			members += `${this.padStart(member.townHallLevel)}  ${this.heroes(member.heroes).map(x => this.padStart(x.level)).join('  ')}  ${Util.escapeInlineCode(member.name)}`;
			members += '\n';
		}

		const header = `TH  BK  AQ  GW  RC  ${'PLAYER'}`;
		const result = this.split(members);
		if (Array.isArray(result)) {
			embed.setDescription([
				`\`\`\`\u200e${header}\n${result[0]}\`\`\``
			]);
		}

		return message.util.send({ embed });
	}

	chunk(items = []) {
		const chunk = 5;
		const array = [];
		for (let i = 0; i < items.length; i += chunk) {
			array.push(items.slice(i, i + chunk));
		}
		return array;
	}

	heroes(items) {
		return Object.assign([
			{ level: '  ' },
			{ level: '  ' },
			{ level: '  ' },
			{ level: '  ' }
		], items);
	}

	padStart(number) {
		return number.toString().padStart(2, ' ');
	}

	split(content) {
		return Util.splitMessage(content, { maxLength: 2048 });
	}
}

module.exports = CwlMembersComamnd;
