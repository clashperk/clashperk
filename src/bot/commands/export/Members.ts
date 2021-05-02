import { Player } from 'clashofclans.js';
import { EMOJIS } from '../../util/Emojis';
import Workbook from '../../struct/Excel';
import { Command } from 'discord-akairo';
import { Message } from 'discord.js';
import { Collections } from '@clashperk/node';

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

export default class ExportClanMembersCommand extends Command {
	public constructor() {
		super('export-members', {
			category: 'search',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {}
		});
	}

	public async exec(message: Message) {
		if (!this.client.patrons.get(message)) {
			return message.util!.send({
				embed: {
					description: '[Become a Patron](https://www.patreon.com/clashperk) to export clan members to Excel.'
				}
			});
		}

		const msg = await message.util!.send(`**Fetching data... ${EMOJIS.LOADING}**`);
		const clans: { name: string; tag: string }[] = await this.client.db.collection(Collections.CLAN_STORES)
			.find({ guild: message.guild!.id })
			.toArray();

		if (!clans.length) {
			return message.util!.send(`**No clans are linked to ${message.guild!.name}**`);
		}

		const _clans = await Promise.all(clans.map(clan => this.client.http.clan(clan.tag)));
		const members = [];
		for (const clan of _clans.filter(res => res.ok)) {
			const fetched = await this.client.http.detailedClanMembers(clan.memberList);
			const mems = fetched.filter(res => res.ok).map(m => ({
				name: m.name,
				tag: m.tag,
				clan: clan.name,
				townHallLevel: m.townHallLevel,
				heroes: m.heroes.length ? m.heroes.filter(a => a.village === 'home') : [],
				achievements: this.getAchievements(m)
			}));

			members.push(...mems);
		}

		members.sort((a, b) => b.heroes.reduce((x, y) => x + y.level, 0) - a.heroes.reduce((x, y) => x + y.level, 0))
			.sort((a, b) => b.townHallLevel - a.townHallLevel);

		const buffer = await this.excel(members);
		if (msg.deletable && !message.hasOwnProperty('token')) await msg.delete();
		return message.util!.send(`**${message.guild!.name} Members**`, {
			files: [{
				attachment: Buffer.from(buffer), name: 'clan_members.xlsx'
			}]
		});
	}

	private excel(members: any[]) {
		const workbook = new Workbook();
		const sheet = workbook.addWorksheet('Member List');

		sheet.columns = [
			{ header: 'NAME', width: 16 },
			{ header: 'TAG', width: 16 },
			{ header: 'CLAN', width: 16 },
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

		sheet.addRows(
			members.map(m => [
				m.name, m.tag, m.clan, m.townHallLevel,
				...m.heroes.map((h: any) => h.level).concat(Array(4 - m.heroes.length).fill('')),
				...m.achievements.map((v: any) => v.value)
			])
		);

		return workbook.xlsx.writeBuffer();
	}

	private getAchievements(data: Player) {
		return achievements.map(name => ({ name, value: data.achievements.find(en => en.name === name)?.value ?? 0 }));
	}
}
