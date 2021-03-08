import { Clan, Hero } from 'clashofclans.js';
import { EMOJIS } from '../../util/Emojis';
import Workbook from '../../struct/Excel';
import { Command } from 'discord-akairo';
import { Message } from 'discord.js';

export default class MembersCommand extends Command {
	public constructor() {
		super('members', {
			aliases: ['members', 'member', 'mem', 'warweight', 'ww'],
			category: 'search',
			clientPermissions: ['EMBED_LINKS', 'MANAGE_MESSAGES', 'ADD_REACTIONS', 'ATTACH_FILES'],
			description: {
				content: 'Clan members with Town Halls and Heroes.',
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
		if (data.members < 1) return message.util!.send(`\u200e**${data.name}** does not have any clan members...`);

		await message.util!.send(`**Fetching data... ${EMOJIS.LOADING}**`);
		const fetched = await this.client.http.detailedClanMembers(data.memberList);
		const members = fetched.filter(res => res.ok).map(m => ({
			name: m.name,
			tag: m.tag,
			townHallLevel: m.townHallLevel,
			heroes: m.heroes.length ? m.heroes.filter(a => a.village === 'home') : []
		}));

		members.sort((a, b) => b.heroes.reduce((x, y) => x + y.level, 0) - a.heroes.reduce((x, y) => x + y.level, 0))
			.sort((a, b) => b.townHallLevel - a.townHallLevel);

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium)
			.setDescription([
				'```',
				`\u200eTH BK AQ GW RC  ${'NAME'.padEnd(15, ' ')}`,
				members.map(
					mem => {
						const heroes = this.heroes(mem.heroes).map(hero => this.padStart(hero.level)).join(' ');
						return `${mem.townHallLevel.toString().padStart(2, ' ')} ${heroes}  ${this.padEnd(mem.name)}`;
					}
				).join('\n'),
				'```'
			]);

		const msg = await message.util!.send({ embed });
		await msg.react('📥');

		const collector = msg.createReactionCollector(
			(reaction, user) => ['📥'].includes(reaction.emoji.name) && user.id === message.author.id,
			{ time: 60000, max: 1 }
		);

		collector.on('collect', async reaction => {
			if (reaction.emoji.name === '📥') {
				if (this.client.patrons.get(message)) {
					const buffer = await this.excel(members);
					return message.util!.send(`**${data.name} (${data.tag})**`, {
						files: [{
							attachment: Buffer.from(buffer), name: 'clan_members.xlsx'
						}]
					});
				}
				return message.channel.send({
					embed: {
						description: '[Become a Patron](https://www.patreon.com/clashperk) to export clan members to Excel.'
					}
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
		return name.substring(0, 15).replace(/\`/g, '\\').padEnd(15, ' ');
	}

	private excel(members: any[]) {
		const workbook = new Workbook();
		const sheet = workbook.addWorksheet('Member List');

		sheet.columns = [
			{ header: 'NAME', key: 'name', width: 16 },
			{ header: 'TAG', key: 'tag', width: 16 },
			{ header: 'Town-Hall', key: 'townHallLevel', width: 10 },
			{ header: 'BK', key: 'Barbarian King', width: 10 },
			{ header: 'AQ', key: 'Archer Queen', width: 10 },
			{ header: 'GW', key: 'Grand Warden', width: 10 },
			{ header: 'RC', key: 'Royal Champion', width: 10 }
		] as any[];

		sheet.getRow(1).font = { bold: true, size: 10 };
		sheet.getColumn(1).alignment = { horizontal: 'left' };
		sheet.getColumn(2).alignment = { horizontal: 'left' };
		sheet.getColumn(3).alignment = { horizontal: 'right' };
		sheet.getColumn(4).alignment = { horizontal: 'right' };
		sheet.getColumn(5).alignment = { horizontal: 'right' };
		sheet.getColumn(6).alignment = { horizontal: 'right' };
		sheet.getColumn(7).alignment = { horizontal: 'right' };
		sheet.addRows([
			...members.map(m => [m.name, m.tag, m.townHallLevel, ...m.heroes.map((h: any) => h.level)])
		]);

		return workbook.xlsx.writeBuffer();
	}
}
