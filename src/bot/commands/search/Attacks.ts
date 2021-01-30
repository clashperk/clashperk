import { Clan, Player } from 'clashofclans.js';
import { EMOJIS } from '../../util/Emojis';
import { stripIndent } from 'common-tags';
import { Command } from 'discord-akairo';
import { Message } from 'discord.js';

interface Member {
	name: string;
	tag: string;
	townHallLevel: number;
	heroes: Player['heroes'];
	league: number;
	attackWins: number;
	defenseWins: number;
}

export default class ClanAttacksCommand extends Command {
	public constructor() {
		super('attacks', {
			aliases: ['attacks'],
			category: 'search',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'MANAGE_MESSAGES', 'ADD_REACTIONS', 'ATTACH_FILES'],
			description: {
				content: 'Shows attacks and defense of all members.',
				usage: '<clanTag>',
				examples: ['#8QU8J9LP']
			},
			flags: ['--sort'],
			optionFlags: ['--tag']
		});
	}

	public *args(msg: Message) {
		const data = yield {
			flag: '--tag',
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase',
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
		const members = fetched.filter(res => res.ok).map(m => {
			const member: Member = {
				name: m.name,
				tag: m.tag,
				townHallLevel: m.townHallLevel,
				heroes: m.heroes.length ? m.heroes.filter(a => a.village === 'home') : [],
				league: m.league ? m.league.id : 29000000,
				attackWins: m.attackWins,
				defenseWins: m.defenseWins
			};
			return member;
		});

		members.sort((a, b) => b.attackWins - a.attackWins);
		if (sort) members.sort((a, b) => b.defenseWins - a.defenseWins);

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium);

		const header = stripIndent(`**\`\u200e${'#'}   ${'ATK'}  ${'DEF'}  ${'NAME'.padEnd(15, ' ')}\`**`);
		const pages = [
			this.paginate(members, 0, 25)
				.items.map((member, i) => {
					const name = `${member.name.replace(/\`/g, '\\').padEnd(15, ' ')}`;
					const attackWins = `${member.attackWins.toString().padStart(3, ' ')}`;
					const defenseWins = `${member.defenseWins.toString().padStart(3, ' ')}`;
					return `\`\u200e${(i + 1).toString().padStart(2, '0')}  ${attackWins}  ${defenseWins}  ${name}\``;
				}),
			this.paginate(members, 25, 50)
				.items.map((member, i) => {
					const name = `${member.name.replace(/\`/g, '\\').padEnd(15, ' ')}`;
					const attackWins = `${member.attackWins.toString().padStart(3, ' ')}`;
					const defenseWins = `${member.defenseWins.toString().padStart(3, ' ')}`;
					return `\`\u200e${(i + 26).toString().padStart(2, '0')}  ${attackWins}  ${defenseWins}  ${name}\``;
				})
		];

		if (!pages[1].length) return message.util!.send({ embed: embed.setDescription([header, pages[0].join('\n')]) });

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

	private paginate(items: Member[], start: number, end: number) {
		return { items: items.slice(start, end) };
	}

	private async delay(ms: number) {
		return new Promise(res => setTimeout(res, ms));
	}
}
