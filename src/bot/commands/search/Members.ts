import { Util, Message } from 'discord.js';
import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';
import { Clan } from 'clashofclans.js';
import { table } from 'table';

export default class MembersCommand extends Command {
	public constructor() {
		super('members', {
			aliases: ['members', 'mem'],
			category: 'search',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'MANAGE_MESSAGES', 'ADD_REACTIONS', 'ATTACH_FILES'],
			description: {
				content: 'List of clan members with some basic details.',
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

		const detailedMembers = await this.client.http.detailedClanMembers(data.memberList);
		const members = detailedMembers.map(m => {
			const member = {
				name: m.name,
				tag: m.tag,
				townHallLevel: m.townHallLevel,
				heroes: m.heroes.length ? m.heroes.filter(a => a.village === 'home') : [],
				league: m.league ? m.league.id : 29000000
			};
			return member;
		});

		members.sort((a, b) => b.townHallLevel - a.townHallLevel);

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium);

		const header = ['TH', 'TAG', 'NAME'];
		const arr = members.map(member => [`${member.townHallLevel}`, `${member.tag}`, `${member.name.replace(/\`/g, '\\')}`]);
		const desc = table([header, ...arr], {
			border: {
				bodyLeft: '`\u200e',
				bodyRight: '\u200f`',
				bodyJoin: '\u200f`\u200e\u2002`\u200e'
			},
			columnDefault: {
				paddingLeft: 1,
				paddingRight: 1
			},
			columns: {
				0: {
					paddingRight: 0
				},
				1: {
					paddingRight: 0,
					alignment: 'right'
				},
				2: {
					alignment: 'right',
					paddingLeft: 0
				}
			},
			drawHorizontalLine: () => false
		});

		const len = desc.length > 2048 ? desc.length / 2 : desc.length;
		const pages = Util.splitMessage(desc, { maxLength: Math.floor(len) + 35, prepend: `${desc.split('\n')[0]}\n` });

		if (!pages[1]?.length) return message.util!.send({ embed: embed.setDescription(pages[0]) });

		let page = 0;
		const msg = await message.util!.send({
			embed: embed.setDescription(pages[page])
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
					embed: embed.setDescription(pages[page])
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
					embed: embed.setDescription(pages[page])
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
					embed: embed.setDescription(pages[page])
						.setFooter(`Page ${page + 1}/2 (${data.members}/50)`)
				});
			}
		});

		collector.on('end', () => msg.reactions.removeAll().catch(() => null));
	}

	private async delay(ms: number) {
		return new Promise(res => setTimeout(res, ms));
	}
}
