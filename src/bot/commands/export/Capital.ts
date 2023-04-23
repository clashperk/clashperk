import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';
import Excel from '../../struct/Excel.js';
import { ClanCapitalRaidAttackData } from '../../types/index.js';
import { Collections } from '../../util/Constants.js';
import { Util } from '../../util/index.js';

export default class ExportCapital extends Command {
	public constructor() {
		super('export-capital', {
			category: 'export',
			channel: 'guild',
			clientPermissions: ['AttachFiles', 'EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { limit?: number; clans?: string; season?: string }) {
		const tags = await this.client.resolver.resolveArgs(args.clans);
		const clans = tags.length
			? await this.client.storage.search(interaction.guildId, tags)
			: await this.client.storage.find(interaction.guildId);

		if (!clans.length && tags.length)
			return interaction.editReply(
				this.i18n('common.no_clans_found', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE })
			);
		if (!clans.length) {
			return interaction.editReply(
				this.i18n('common.no_clans_linked', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE })
			);
		}

		let num = Number(args.limit ?? 25);
		num = Math.min(100, num);
		const chunks = [];
		for (const { tag, name } of clans) {
			const weekends = await this.client.db
				.collection<ClanCapitalRaidAttackData>(Collections.CAPITAL_RAID_SEASONS)
				.find({ tag })
				.sort({ _id: -1 })
				.limit(10)
				.toArray();

			const _weekends = [];
			for (const clan of weekends) {
				const remark =
					clan.capitalLeague && clan._capitalLeague
						? clan._capitalLeague.id > clan.capitalLeague.id
							? 'Promoted'
							: clan._capitalLeague.id === clan.capitalLeague.id
							? 'Stayed'
							: 'Demoted'
						: 'Unknown';
				const trophyGained = (clan._clanCapitalPoints ?? 0) - (clan.clanCapitalPoints ?? 0);

				_weekends.push({
					name: clan.name,
					tag: clan.tag,
					status: remark,
					weekId: clan.weekId,
					leagueId: clan.capitalLeague?.id,
					leagueName: clan.capitalLeague?.name,
					capitalTotalLoot: clan.capitalTotalLoot,
					totalAttacks: clan.totalAttacks,
					raidsCompleted: clan.raidsCompleted,
					defensiveReward: clan.defensiveReward,
					offensiveReward: clan.offensiveReward,
					trophyGained: `${trophyGained >= 0 ? '+' : ''}${trophyGained}`,
					avgLoot: Number((clan.capitalTotalLoot / clan.totalAttacks).toFixed(2))
				});
			}

			chunks.push({
				name,
				tag,
				weekends: _weekends
			});
		}
		if (!chunks.length) return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));

		const workbook = new Excel();
		for (const { name, tag, weekends } of chunks) {
			const sheet = workbook.addWorksheet(Util.escapeSheetName(`${name} (${tag})`));
			sheet.columns = [
				{ header: 'Weekend', width: 20 },
				{ header: 'League', width: 20 },
				{ header: 'Total Loot', width: 10 },
				{ header: 'Avg. Loot', width: 10 },
				{ header: 'Total Attacks', width: 10 },
				{ header: 'Raids Completed', width: 10 },
				{ header: 'Offensive Reward', width: 10 },
				{ header: 'Defensive Reward', width: 10 },
				{ header: 'Trophy Gained', width: 10 },
				{ header: 'Remark', width: 10 }
			];

			sheet.getRow(1).font = { bold: true, size: 10 };
			sheet.getRow(1).height = 40;

			for (let i = 1; i <= sheet.columns.length; i++) {
				sheet.getColumn(i).alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
			}

			sheet.addRows(
				weekends.map((weekend) => [
					weekend.weekId,
					weekend.leagueName,
					weekend.capitalTotalLoot,
					weekend.avgLoot,
					weekend.totalAttacks,
					weekend.raidsCompleted,
					weekend.offensiveReward,
					weekend.defensiveReward,
					weekend.trophyGained,
					weekend.status
				])
			);
		}

		const buffer = await workbook.xlsx.writeBuffer();
		return interaction.editReply({
			content: `**War Export (Last ${num})**`,
			files: [
				{
					attachment: Buffer.from(buffer),
					name: 'clan_capital_stats.xlsx'
				}
			]
		});
	}
}
