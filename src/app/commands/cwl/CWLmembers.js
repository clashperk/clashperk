const { Command, Flag } = require('discord-akairo');
const fetch = require('node-fetch');
const { Util } = require('discord.js');
const Resolver = require('../../struct/Resolver');
const { status } = require('../../util/constants');
const { emoji } = require('../../util/emojis');
const API = process.env.API_TOKENS.split(',');

class CWLMembersComamnd extends Command {
	constructor() {
		super('cwl-members', {
			aliases: ['cwl-members', 'cwl-mem'],
			category: 'hidden',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'CWL members command.',
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
		if (this.client.patron.isPatron(message.author, message.guild) || this.client.voteHandler.isVoter(message.author.id)) return 3000;
		return 10000;
	}

	async exec(message, { data }) {
		await message.util.send(`**Fetching data... ${emoji.loading}**`);
		const uri = `https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}/currentwar/leaguegroup`;
		const res = await fetch(uri, {
			method: 'GET', timeout: 3000,
			headers: { accept: 'application/json', authorization: `Bearer ${process.env.CLASH_OF_CLANS_API}` }
		}).catch(() => null);

		if (!res) {
			return message.util.send({
				embed: {
					color: 0xf30c11,
					author: { name: 'Error' },
					description: status[504]
				}
			});
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

module.exports = CWLMembersComamnd;
