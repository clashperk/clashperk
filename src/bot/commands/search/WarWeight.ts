import { TOWN_HALLS, EMOJIS } from '../../util/Emojis';
import { Clan, Hero } from 'clashofclans.js';
import { Util, Message } from 'discord.js';
import { stripIndent } from 'common-tags';
import { Command } from 'discord-akairo';

export default class WarWeightCommand extends Command {
	public constructor() {
		super('warweight', {
			aliases: ['warweight', 'ww'],
			category: 'cwl',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'MANAGE_MESSAGES', 'ADD_REACTIONS', 'ATTACH_FILES'],
			description: {
				content: 'List of clan members with townhall & heroes.',
				usage: '<clanTag>',
				examples: ['#8QU8J9LP']
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
		const fetched = await this.client.http.detailedClanMembers(data.memberList);
		const members = fetched.map(m => {
			const member = {
				name: m.name,
				tag: m.tag,
				townHallLevel: m.townHallLevel,
				heroes: m.heroes.length ? m.heroes.filter(a => a.village === 'home') : []
			};
			return member;
		});

		members.sort((a, b) => b.heroes.reduce((x, y) => x + y.level, 0) - a.heroes.reduce((x, y) => x + y.level, 0))
			.sort((a, b) => b.townHallLevel - a.townHallLevel);

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium);
		const header = stripIndent(`**${EMOJIS.TOWNHALL}\`\u200e BK AQ GW RC  ${'NAME'.padEnd(15, ' ')}\`**`);
		const pages = [
			this.paginate(members, 0, 25)
				.items.map(member => {
					const heroes = this.heroes(member.heroes).map(hero => this.padStart(hero.level)).join(' ');
					return `${TOWN_HALLS[member.townHallLevel]}\`\u200e ${heroes}  ${this.padEnd(member.name.substring(0, 15).replace(/\`/g, '\\'))}\``;
				}),
			this.paginate(members, 25, 50)
				.items.map(member => {
					const heroes = this.heroes(member.heroes).map(hero => this.padStart(hero.level)).join(' ');
					return `${TOWN_HALLS[member.townHallLevel]}\`\u200e ${heroes}  ${this.padEnd(member.name.substring(0, 15).replace(/\`/g, '\\'))}\``;
				})
		];

		if (!pages[1].length) {
			return message.util!.send({
				embed: embed.setDescription([
					header,
					pages[0].join('\n')
				])
			});
		}

		let page = 0;
		const msg = await message.util!.send({
			embed: embed.setDescription([header, pages[page].join('\n')])
				.setFooter(`Page 1/2 (${data.members}/50)`)
		});

		for (const emoji of ['⬅️', '➡️', '➕']) {
			await msg.react(emoji);
			await this.delay(250);
		}

		const collector = msg.createReactionCollector(
			(reaction, user) => ['➕', '⬅️', '➡️'].includes(reaction.emoji.name) && user.id === message.author.id,
			{ time: 90000, max: 10 }
		);

		collector.on('collect', async reaction => {
			if (reaction.emoji.name === '➡️') {
				page += 1;
				if (page < 0) page = 1;
				if (page > 1) page = 0;

				await msg.edit({
					embed: embed.setDescription([header, pages[page].join('\n')])
						.setFooter(`Page ${page + 1}/2 (${data.members}/50)`)
				});
				await this.delay(250);
				return reaction.users.remove(message.author.id);
			}

			if (reaction.emoji.name === '⬅️') {
				page -= 1;
				if (page < 0) page = 1;
				if (page > 1) page = 0;

				await msg.edit({
					embed: embed.setDescription([header, pages[page].join('\n')])
						.setFooter(`Page ${page + 1}/2 (${data.members}/50)`)
				});
				await this.delay(250);
				return reaction.users.remove(message.author.id);
			}

			if (reaction.emoji.name === '➕') {
				if (page === 0) page = 1;
				else if (page === 1) page = 0;

				collector.stop();
				return message.channel.send({
					embed: embed.setDescription([header, pages[page].join('\n')])
						.setFooter(`Page ${page + 1}/2 (${data.members}/50)`)
				});
			}
		});

		collector.on('end', () => msg.reactions.removeAll().catch(() => null));
	}

	private heroes(items: Hero[]) {
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

	private padEnd(name: string) {
		return Util.escapeInlineCode(name).padEnd(15, ' ');
	}

	private paginate<T>(items: Array<T>, start: number, end: number) {
		return { items: items.slice(start, end) };
	}

	private async delay(ms: number) {
		return new Promise(res => setTimeout(res, ms));
	}
}
