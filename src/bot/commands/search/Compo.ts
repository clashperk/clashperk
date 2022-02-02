import { TOWN_HALLS, EMOJIS } from '../../util/Emojis';
import { ORANGE_NUMBERS } from '../../util/NumEmojis';
import { MessageEmbed, Message, Util } from 'discord.js';
import { Command } from 'discord-akairo';
import { Clan } from 'clashofclans.js';

export default class ThCompoCommand extends Command {
	public constructor() {
		super('townhall-compo', {
			aliases: ['compo', 'th-compo', 'th'],
			category: 'search',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Calculates TH compositions of a clan.',
				usage: '<#clanTag>',
				examples: ['#2Q98URCGY', '2Q98URCGY']
			},
			optionFlags: ['--tag']
		});
	}

	public *args(msg: Message): unknown {
		const data = yield {
			flag: '--tag',
			match: msg.interaction ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolveClan(msg, tag)
		};

		return { data };
	}

	public async exec(message: Message, { data }: { data: Clan }) {
		if (data.members < 1) return message.util!.send(`\u200e**${data.name}** does not have any clan members...`);

		await message.util!.send(`**Fetching data... ${EMOJIS.LOADING}**`);
		const hrStart = process.hrtime();

		const fetched = await this.client.http.detailedClanMembers(data.memberList);
		const reduced = fetched.filter(res => res.ok).reduce((count, member) => {
			const townHall = member.townHallLevel;
			count[townHall] = (count[townHall] || 0) + 1;
			return count;
		}, {} as { [key: string]: number });

		const townHalls = Object.entries(reduced)
			.map(arr => ({ level: Number(arr[0]), total: Number(arr[1]) }))
			.sort((a, b) => b.level - a.level);
		const avg = townHalls.reduce((p, c) => p + (c.total * c.level), 0) / townHalls.reduce((p, c) => p + c.total, 0) || 0;

		const { id } = Util.parseEmoji(EMOJIS.TOWNHALL)!;
		const embed = new MessageEmbed()
			.setAuthor({ name: `${data.name} (${data.tag})`, iconURL: data.badgeUrls.small })
			.setColor(this.client.embed(message))
			.setThumbnail(data.badgeUrls.small)
			.setDescription(townHalls.map(th => `${TOWN_HALLS[th.level]} ${ORANGE_NUMBERS[th.total]}\u200b`).join('\n'))
			.setFooter({ text: `Avg: ${avg.toFixed(2)} [${data.members}/50]`, iconURL: `https://cdn.discordapp.com/emojis/${id!}.png?v=1` });

		const diff = process.hrtime(hrStart);
		this.client.logger.debug(`Executed in ${((diff[0] * 1000) + (diff[1] / 1000000)).toFixed(2)}ms`, { label: 'COMPO' });
		return message.util!.send({ embeds: [embed] });
	}
}
