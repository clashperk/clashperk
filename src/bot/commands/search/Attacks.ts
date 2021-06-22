import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';
import { Clan } from 'clashofclans.js';
import { Message } from 'discord.js';

export default class ClanAttacksCommand extends Command {
	public constructor() {
		super('attacks', {
			aliases: ['attacks'],
			category: 'search',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Shows attacks and defense of all members.',
				usage: '<#clanTag> [--sort]',
				examples: ['#8QU8J9LP', '#8QU8J9LP --sort']
			},
			flags: ['--sort'],
			optionFlags: ['--tag']
		});
	}

	public *args(msg: Message): unknown {
		const data = yield {
			flag: '--tag',
			match: msg.interaction ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolveClan(msg, tag)
		};

		const sort = yield {
			match: 'flag',
			flag: '--sort'
		};

		return { data, sort };
	}

	public async exec(message: Message, { data, sort }: { data: Clan; sort: boolean }) {
		if (data.members < 1) return message.util!.send(`\u200e**${data.name}** does not have any clan members...`);
		await message.util!.send(`**Fetching data... ${EMOJIS.LOADING}**`);

		const fetched = await this.client.http.detailedClanMembers(data.memberList);
		const members = fetched.filter(res => res.ok).map(m => ({
			name: m.name,
			tag: m.tag,
			attackWins: m.attackWins,
			defenseWins: m.defenseWins
		}));

		members.sort((a, b) => b.attackWins - a.attackWins);
		if (sort) members.sort((a, b) => b.defenseWins - a.defenseWins);

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium)
			.setDescription([
				'```',
				`\u200e ${'#'}  ${'ATK'}  ${'DEF'}  ${'NAME'.padEnd(15, ' ')}`,
				members.map((member, i) => {
					const name = `${member.name.replace(/\`/g, '\\').padEnd(15, ' ')}`;
					const attackWins = `${member.attackWins.toString().padStart(3, ' ')}`;
					const defenseWins = `${member.defenseWins.toString().padStart(3, ' ')}`;
					return `${(i + 1).toString().padStart(2, ' ')}  ${attackWins}  ${defenseWins}  \u200e${name}`;
				}).join('\n'),
				'```'
			].join('\n'));

		return message.util!.send({ embeds: [embed] });
	}
}
