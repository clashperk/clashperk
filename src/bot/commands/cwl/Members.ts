import { Command } from 'discord-akairo';
import { Util, Message } from 'discord.js';
import { EMOJIS } from '../../util/Emojis';
import { Clan, Player } from 'clashofclans.js';

export default class CWLMembersCommand extends Command {
	public constructor() {
		super('cwl-members', {
			aliases: ['cwl-members', 'cwl-mem'],
			category: 'cwl',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Shows the full list of participants.',
				usage: '<clanTag>',
				examples: ['#8QU8J9LP']
			},
			optionFlags: ['--tag']
		});
	}

	public *args(msg: Message): unknown {
		const data = yield {
			flag: '--tag',
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolveClan(msg, tag)
		};

		return { data };
	}

	public async exec(message: Message, { data }: { data: Clan }) {
		await message.util!.send(`**Fetching data... ${EMOJIS.LOADING}**`);

		const body = await this.client.http.clanWarLeague(data.tag);
		if (body.statusCode === 504) {
			return message.util!.send([
				'504 Request Timeout'
			]);
		}

		if (!body.ok) {
			const embed = this.client.util.embed()
				.setColor(3093046)
				.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium, `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${data.tag}`)
				.setThumbnail(data.badgeUrls.medium)
				.setDescription('Clan is not in CWL');
			return message.util!.send({ embed });
		}

		const clanMembers = body.clans.find(clan => clan.tag === data.tag)!.members;
		const fetched = await this.client.http.detailedClanMembers(clanMembers);
		const memberList = fetched.filter(m => typeof m.name === 'string')
			.map(m => {
				const member = {
					name: m.name,
					tag: m.tag,
					townHallLevel: m.townHallLevel,
					heroes: m.heroes.length ? m.heroes.filter(a => a.village === 'home') : []
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
			members += `\u200e${this.padStart(member.townHallLevel)} ${this.heroes(member.heroes).map(x => this.padStart(x.level)).join(' ')}  ${Util.escapeInlineCode(member.name)}`;
			members += '\n';
		}

		const header = `TH BK AQ GW RC  ${'PLAYER'}`;
		const result = this.split(members);
		if (Array.isArray(result)) {
			embed.setDescription([
				`\`\`\`\u200e${header}\n${result[0]}\`\`\``
			]);
		}

		return message.util!.send({ embed });
	}

	private heroes(items: Player['heroes']) {
		return Object.assign([
			{ level: '  ' },
			{ level: '  ' },
			{ level: '  ' },
			{ level: '  ' }
		], items);
	}

	private padStart(num: number | string) {
		return num.toString().padStart(2, ' ');
	}

	private split(content: string) {
		return Util.splitMessage(content, { maxLength: 2048 });
	}
}
