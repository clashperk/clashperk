import { Command } from '../../lib';
import { Collections, Messages } from '../../util/Constants';
import Excel from '../../struct/Excel';
import { CommandInteraction } from 'discord.js';

const warTypes: Record<string, string> = {
	1: 'Regular',
	2: 'Friendly',
	3: 'CWL'
};

// TODO: Fix TS
export default class ExportMissed extends Command {
	public constructor() {
		super('export-missed', {
			category: 'export',
			channel: 'guild',
			clientPermissions: ['ATTACH_FILES', 'EMBED_LINKS'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { wars?: number }) {
		let num = Number(args.wars ?? 25);
		const clans = await this.client.db.collection(Collections.CLAN_STORES).find({ guild: interaction.guild.id }).toArray();

		if (!clans.length) {
			return interaction.editReply(Messages.SERVER.NO_CLANS_LINKED);
		}

		num = this.client.patrons.get(interaction.guild.id) ? Math.min(num, 45) : Math.min(25, num);
		const chunks = [];
		const missed: { [key: string]: { name: string; tag: string; count: number; missed: Date[] } } = {};

		for (const { tag } of clans) {
			const wars = await this.client.db
				.collection(Collections.CLAN_WARS)
				.find({
					$or: [{ 'clan.tag': tag }, { 'opponent.tag': tag }],
					state: 'warEnded'
				})
				.sort({ _id: -1 })
				.limit(num)
				.toArray();

			for (const war of wars) {
				const clan = war.clan.tag === tag ? war.clan : war.opponent;
				const opponent = war.clan.tag === tag ? war.opponent : war.clan;
				for (const m of clan.members) {
					if (m.attacks?.length === war.attacksPerMember) continue;

					const _mem = missed[m.tag] // eslint-disable-line
						? missed[m.tag]
						: (missed[m.tag] = {
								name: m.name,
								tag: m.tag,
								missed: [] as Date[],
								count: war.attacksPerMember
						  });
					_mem.missed.push(war.endTime);

					const mem = {
						stars: [] as number[],
						name: m.name,
						warID: war.id,
						tag: m.tag,
						clan: clan.name,
						opponent: opponent.name,
						teamSize: war.teamSize,
						timestamp: new Date(war.endTime),
						missed: war.attacksPerMember - (m.attacks?.length ?? 0),
						warType: warTypes[war.warType]
					};

					if (!m.attacks) {
						mem.stars = [0, 0, 0, 0];
					}

					if (m.attacks?.length === 1) {
						mem.stars = m.attacks
							.map((m: any) => [m.stars, m.destructionPercentage.toFixed(2)])
							.flat()
							.concat(...[0, 0]);
					}

					if (m.attacks?.length === 2) {
						mem.stars = m.attacks.map((m: any) => [m.stars, m.destructionPercentage.toFixed(2)]).flat();
					}

					chunks.push(mem);
				}
			}
		}

		if (!chunks.length) return interaction.editReply(Messages.NO_DATA);

		const workbook = new Excel();
		const sheet = workbook.addWorksheet('Missed Attacks');
		sheet.columns = [
			{ header: 'Name', width: 16 },
			{ header: 'Tag', width: 16 },
			{ header: 'Clan', width: 16 },
			{ header: 'Enemy Clan', width: 16 },
			{ header: 'War ID', width: 16 },
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
			chunks
				.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
				.map((m) => [m.name, m.tag, m.clan, m.opponent, m.warID, m.timestamp, m.warType, m.teamSize, m.missed])
		);

		// extra pages
		const twoMissed = Object.values(missed).filter((m) => m.count === 2);
		if (twoMissed.length) {
			const sheet = workbook.addWorksheet('2 Missed Attacks');
			sheet.columns = [
				{ header: 'Name', width: 16 },
				{ header: 'Tag', width: 16 },
				{ header: 'Miss #1', width: 16 },
				{ header: 'Miss #2', width: 16 },
				{ header: 'Miss #3', width: 16 },
				{ header: 'Miss #4', width: 16 },
				{ header: 'Miss #5', width: 16 }
			] as any; // TODO: Fix Later

			sheet.getRow(1).font = { bold: true, size: 10 };
			sheet.getRow(1).height = 40;

			for (let i = 1; i <= sheet.columns.length; i++) {
				sheet.getColumn(i).alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
			}

			sheet.addRows(twoMissed.map((m) => [m.name, m.tag, ...m.missed.slice(0, 5)]));
		}

		const oneMissed = Object.values(missed).filter((m) => m.count === 1);
		if (oneMissed.length) {
			const sheet = workbook.addWorksheet('1 Missed Attacks');
			sheet.columns = [
				{ header: 'Name', width: 16 },
				{ header: 'Tag', width: 16 },
				{ header: 'Miss #1', width: 16 },
				{ header: 'Miss #2', width: 16 },
				{ header: 'Miss #3', width: 16 },
				{ header: 'Miss #4', width: 16 },
				{ header: 'Miss #5', width: 16 }
			] as any; // TODO: Fix Later

			sheet.getRow(1).font = { bold: true, size: 10 };
			sheet.getRow(1).height = 40;

			for (let i = 1; i <= sheet.columns.length; i++) {
				sheet.getColumn(i).alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
			}

			sheet.addRows(oneMissed.map((m) => [m.name, m.tag, ...m.missed.slice(0, 5)]));
		}

		const buffer = await workbook.xlsx.writeBuffer();
		return interaction.editReply({
			content: `**Missed Attacks (Last ${num})**`,
			files: [
				{
					attachment: Buffer.from(buffer),
					name: 'clan_war_missed.xlsx'
				}
			]
		});
	}
}
