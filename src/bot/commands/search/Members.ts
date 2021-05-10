import { Clan, PlayerItem, Player } from 'clashofclans.js';
import { EMOJIS } from '../../util/Emojis';
import Workbook from '../../struct/Excel';
import { Command } from 'discord-akairo';
import { Message } from 'discord.js';

const achievements = [
	'Gold Grab',
	'Elixir Escapade',
	'Heroic Heist',
	'Games Champion',
	'War League Legend',
	'Unbreakable',
	'Conqueror',
	'Siege Sharer',
	'Sharing is caring',
	'Friend in Need'
];

export default class MembersCommand extends Command {
	public constructor() {
		super('members', {
			aliases: ['members', 'member', 'mem', 'warweight', 'ww'],
			category: 'search',
			clientPermissions: ['EMBED_LINKS', 'MANAGE_MESSAGES', 'ADD_REACTIONS', 'ATTACH_FILES', 'READ_MESSAGE_HISTORY'],
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
			heroes: m.heroes.length ? m.heroes.filter(a => a.village === 'home') : [],
			achievements: this.getAchievements(m)
		}));

		members.sort((a, b) => b.heroes.reduce((x, y) => x + y.level, 0) - a.heroes.reduce((x, y) => x + y.level, 0))
			.sort((a, b) => b.townHallLevel - a.townHallLevel);

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setFooter(`Total ${fetched.length === data.members ? data.members : `${fetched.length}/${data.members}`}/50`)
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium)
			.setDescription([
				'```',
				`TH BK AQ GW RC  ${'NAME'.padEnd(15, ' ')}`,
				members.map(
					mem => {
						const heroes = this.heroes(mem.heroes).map(hero => this.padStart(hero.level)).join(' ');
						return `${mem.townHallLevel.toString().padStart(2, ' ')} ${heroes}  \u200e${this.padEnd(mem.name)}`;
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

	private heroes(items: PlayerItem[]) {
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
			{ header: 'NAME', width: 16 },
			{ header: 'TAG', width: 16 },
			{ header: 'Town-Hall', width: 10 },
			{ header: 'BK', width: 10 },
			{ header: 'AQ', width: 10 },
			{ header: 'GW', width: 10 },
			{ header: 'RC', width: 10 },
			...achievements.map(header => ({ header, width: 16 }))
		] as any[];

		sheet.getRow(1).font = { bold: true, size: 10 };

		for (let i = 1; i <= sheet.columns.length; i++) {
			sheet.getColumn(i).alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
		}

		sheet.addRows([
			...members.map(m => [
				m.name, m.tag, m.townHallLevel,
				...m.heroes.map((h: any) => h.level).concat(Array(4 - m.heroes.length).fill('')),
				...m.achievements.map((v: any) => v.value)
			])
		]);

		return workbook.xlsx.writeBuffer();
	}

	private getAchievements(data: Player) {
		return achievements.map(name => ({ name, value: data.achievements.find(en => en.name === name)?.value ?? 0 }));
	}
}
