import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';
import { CreateGoogleSheet, createGoogleSheet } from '../../struct/Google.js';
import { ClanCapitalRaidAttackData } from '../../types/index.js';
import { getExportComponents } from '../../util/__helper.js';
import { Collections, UNRANKED_CAPITAL_LEAGUE_ID } from '../../util/constants.js';

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
    const { clans } = await this.client.storage.handleSearch(interaction, { args: args.clans });
    if (!clans) return;

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
          leagueId: clan.capitalLeague?.id ?? UNRANKED_CAPITAL_LEAGUE_ID,
          leagueName: clan.state === 'ongoing' ? 'Ongoing' : (clan.capitalLeague?.name ?? 'Unknown').replace(/League/g, '').trim(),
          capitalTotalLoot: clan.capitalTotalLoot,
          totalAttacks: clan.totalAttacks,
          raidsCompleted: clan.raidsCompleted,
          defensiveReward: clan.defensiveReward,
          offensiveReward: clan.offensiveReward * 6,
          trophyGained: trophyGained,
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

    const sheets: CreateGoogleSheet[] = chunks.map((chunk) => ({
      columns: [
        { name: 'Weekend', width: 100, align: 'LEFT' },
        { name: 'League', width: 100, align: 'LEFT' },
        { name: 'Total Loot', width: 100, align: 'RIGHT' },
        { name: 'Avg. Loot', width: 100, align: 'RIGHT' },
        { name: 'Total Attacks', width: 100, align: 'RIGHT' },
        { name: 'Raids Completed', width: 100, align: 'RIGHT' },
        { name: 'Offensive Reward', width: 100, align: 'RIGHT' },
        { name: 'Defensive Reward', width: 100, align: 'RIGHT' },
        { name: 'Trophy Gained', width: 100, align: 'RIGHT' },
        { name: 'Remark', width: 100, align: 'LEFT' }
      ],
      rows: chunk.weekends.map((weekend) => [
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
      ]),
      title: `${chunk.name} (${chunk.tag})`
    }));

    const spreadsheet = await createGoogleSheet(`${interaction.guild.name} [Clan Capital Stats]`, sheets);
    return interaction.editReply({ content: `**Clan Capital Export**`, components: getExportComponents(spreadsheet) });
  }
}
