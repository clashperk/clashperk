const { Command, Flag } = require('discord-akairo');
const fetch = require('node-fetch');
const { Util } = require('discord.js');
const Resolver = require('../../struct/Resolver');
const { status } = require('../../util/constants');
const { emoji } = require('../../util/emojis');
const TOKENS = process.env.$KEYS.split(',');

class CWLMembersComamnd extends Command {
	constructor() {
		super('cwl-members', {
			aliases: ['cwl-members', 'cwl-mem'],
			category: 'cwl-hidden',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Shows the full list of participants.',
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
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { data }) {
		await message.util.send(`**Fetching data... ${emoji.loading}**`);
		const uri = `https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}/currentwar/leaguegroup`;
		const res = await fetch(uri, {
			method: 'GET', timeout: 3000,
			headers: { accept: 'application/json', authorization: `Bearer ${process.env.DEVELOPER_TOKEN}` }
		}).catch(() => null);

		if (!res) {
			return message.util.send({
				embed: {
					color: 0xf30c11,
					author: { name: 'Error' },
					description: status(504)
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
		const KEYS = TOKENS.map(token => ({ n: Math.random(), token })).sort((a, b) => a.n - b.n).map(a => a.token);
		const requests = clanMembers.map((m, i) => {
			const req = {
				url: `https://api.clashofclans.com/v1/players/${encodeURIComponent(m.tag)}`,
				option: {
					method: 'GET',
					headers: { accept: 'application/json', authorization: `Bearer ${KEYS[i % KEYS.length]}` }
				}
			};
			return req;
		});

		const responses = await Promise.all(requests.map(req => fetch(req.url, req.option)));
		const fetched = await Promise.all(responses.map(res => res.json()));
		const memberList = fetched.map(m => {
			const member = {
				name: m.name,
				tag: m.tag,
				townHallLevel: m.townHallLevel,
				heroes: m.heroes ? m.heroes.filter(a => a.village === 'home') : []
			};
			return member;
		});

		/* [[1, 4], [2], [3]].reduce((a, b) => {
			a.push(...b);
			return a;
		}, []);*/

		let members = '';
		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag}) ~ ${memberList.length}`, data.badgeUrls.medium);

		for (const member of memberList.sort((a, b) => b.townHallLevel - a.townHallLevel)) {
			members += `${this.padStart(member.townHallLevel)} ${this.heroes(member.heroes).map(x => this.padStart(x.level)).join(' ')}  ${Util.escapeInlineCode(member.name)}`;
			members += '\n';
		}

		const header = `TH BK AQ GW RC  ${'PLAYER'}`;
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
