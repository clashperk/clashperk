import { TOWN_HALLS, BLUE_EMOJI, RED_EMOJI, EMOJIS } from '../../util/Emojis';
import { MessageEmbed, Message } from 'discord.js';
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
				usage: '<clanTag>',
				examples: ['#2Q98URCGY', '2Q98URCGY']
			},
			args: [
				{
					id: 'data',
					type: (msg, tag) => this.client.resolver.resolveClan(msg, tag)
				}
			]
		});
	}

	public async exec(message: Message, { data }: { data: Clan }) {
		if (data.members < 1) return message.util!.send(`\u200e**${data.name}** does not have any clan members...`);

		await message.util!.send(`**Fetching data... ${EMOJIS.LOADING}**`);
		const hrStart = process.hrtime();

		const fetched = await this.client.http.detailedClanMembers(data.memberList);
		const reduced = fetched.reduce((count, member) => {
			const townHall = member.townHallLevel;
			count[townHall] = (count[townHall] || 0) + 1;
			return count;
		}, {} as { [key: string]: number });

		const townHalls = Object.entries(reduced)
			.map(arr => ({ level: Number(arr[0]), total: Number(arr[1]) }))
			.sort((a, b) => b.level - a.level);
		const avg = townHalls.reduce((p, c) => p + (c.total * c.level), 0) / townHalls.reduce((p, c) => p + c.total, 0) || 0;

		const embed = new MessageEmbed()
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.small)
			.setColor(this.client.embed(message))
			.setThumbnail(data.badgeUrls.small)
			.setDescription(townHalls.map(th => `${TOWN_HALLS[th.level]} ${th.level < 9 ? RED_EMOJI[th.total] : BLUE_EMOJI[th.total]}\u200b`))
			.setFooter(`Avg: ${avg.toFixed(2)} [${data.members}/50]`, 'https://cdn.discordapp.com/emojis/696655174025871461.png');

		const diff = process.hrtime(hrStart);

		return message.util!.send(`*\u200b**Executed in ${((diff[0] * 1000) + (diff[1] / 1000000)).toFixed(2)} ms\u200b*`, { embed });
	}
}
