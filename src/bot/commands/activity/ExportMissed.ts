import { Command, Argument } from 'discord-akairo';
import { COLLECTIONS } from '../../util/Constants';
import Excel from '../../struct/Excel';
import { Message } from 'discord.js';

// TODO: Fix TS
export default class WarExport extends Command {
	public constructor() {
		super('export-missed-attacks', {
			category: 'activity',
			clientPermissions: ['ATTACH_FILES', 'EMBED_LINKS'],
			description: {
				content: 'Export missed attacks to excel for all clans.',
				examples: ['']
			},
			args: [
				{
					'id': 'days',
					'type': Argument.range('integer', 1, 30, true),
					'default': 30
				}
			]
		});
	}

	public async exec(message: Message, { days }: { days: number }) {
		const clans = await this.client.db.collection(COLLECTIONS.CLAN_STORES)
			.find({ guild: message.guild!.id })
			.toArray();

		const chunks = [];
		for (const { tag } of clans) {
			const wars = await this.client.db.collection(COLLECTIONS.CLAN_WAR_STORES)
				.find({
					// $not: { isFreindly: true },
					$or: [{ 'clan.tag': tag }, { 'opponent.tag': tag }],
					state: 'warEnded'
				})
				.sort({ preparationStartTime: -1 })
				.limit(this.client.patrons.get(message.guild!.id) ? 0 : days)
				.toArray();

			for (const war of wars) {
				const clan = war.clan.tag === tag ? war.clan : war.opponent;
				for (const m of clan.members) {
					if (war.groupWar && m.attacks?.length) continue;
					if (!war.groupWar && m.attacks?.length === 2) continue;

					const mem = {
						stars: [] as number[],
						missed: 0,
						name: m.name,
						tag: m.tag,
						clan: clan.name,
						teamSize: war.teamSize,
						warType: war.groupWar ? 'CWL' : 'Regular',
						timestamp: new Date(war.endTime)
					};

					if (!m.attacks) {
						mem.stars = [0, 0, 0, 0];
						mem.missed = war.groupWar ? 1 : 2;
					}

					if (m.attacks?.length === 1) {
						mem.stars = m.attacks.map((m: any) => [m.stars, m.destructionPercentage.toFixed(2)]).flat().concat(...[0, 0]);
						mem.missed = war.groupWar ? 0 : 1;
					}

					if (m.attacks?.length === 2) {
						mem.stars = m.attacks.map((m: any) => [m.stars, m.destructionPercentage.toFixed(2)]).flat();
					}

					chunks.push(mem);
				}
			}
		}

		if (!chunks.length) return message.util!.send('No data available at this moment!');

		const workbook = new Excel();
		const sheet = workbook.addWorksheet('Missed Attacks');
		sheet.columns = [
			{ header: 'Name', width: 16 },
			{ header: 'Tag', width: 16 },
			{ header: 'Clan', width: 16 },
			{ header: 'Ended', width: 14 },
			{ header: 'War Type', width: 10 },
			{ header: 'Team Size', width: 10 },
			{ header: 'Missed', width: 10 }
		] as any; // TODO: Fix Later

		sheet.getRow(1).font = { bold: true, size: 10 };
		sheet.getRow(1).height = 40;

		for (let i = 1; i <= sheet.columns.length; i++) {
			sheet.getColumn(i).alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
		}

		sheet.addRows(
			chunks.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
				.map(m => [m.name, m.tag, m.clan, m.timestamp, m.warType, m.teamSize, m.missed])
		);

		const buffer = await workbook.xlsx.writeBuffer();
		return message.util!.send('**Missed Attacks**', {
			files: [{
				attachment: Buffer.from(buffer),
				name: 'clan_war_missed.xlsx'
			}]
		});
	}
}
