import { CommandInteraction, User } from 'discord.js';
import { BattleLogDto } from '../../api/generated.js';
import { getLegendBattleLog } from '../../helper/legends.helper.js';
import { Command } from '../../lib/handlers.js';
import { CreateGoogleSheet, createGoogleSheet } from '../../struct/google.js';
import { getExportComponents } from '../../util/helper.js';
import { Util } from '../../util/toolkit.js';

export default class LegendAttacksHistoryCommand extends Command {
  public constructor() {
    super('history-legend-attacks', {
      category: 'search',
      channel: 'guild',
      clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: { clans?: string; player?: string; user?: User }
  ) {
    if (args.user) {
      const playerTags = await this.client.resolver.getLinkedPlayerTags(args.user.id);
      const { result } = await this.getHistory(playerTags);
      if (!result.length) {
        return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));
      }
      return this.export(interaction, result);
    }

    if (args.player) {
      const player = await this.client.resolver.resolvePlayer(interaction, args.player);
      if (!player) return null;
      const { result } = await this.getHistory([player.tag]);
      if (!result.length) {
        return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));
      }
      return this.export(interaction, result);
    }

    const { clans } = await this.client.storage.handleSearch(interaction, { args: args.clans });
    if (!clans) return;

    const _clans = await this.client.redis.getClans(clans.map((clan) => clan.tag));
    const playerTags = _clans.flatMap((clan) => clan.memberList.map((m) => m.tag));
    const { result } = await this.getHistory(playerTags);

    if (!result.length) {
      return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));
    }

    return this.export(interaction, result);
  }

  private async getHistory(playerTags: string[]) {
    const battleLogResults = await Promise.all(
      playerTags.map((tag) => getLegendBattleLog(tag).catch(() => [] as BattleLogDto[]))
    );
    const logsByTag = new Map<string, BattleLogDto[]>(
      playerTags.map((tag, i) => [tag, battleLogResults[i]])
    );

    const days = Util.getLegendDays();
    const result: AggregatedResult[] = [];

    for (const [tag, allBattles] of logsByTag) {
      if (!allBattles.length) continue;

      const perDayLogs = days.map(({ startTime }, i) => {
        const battleDate = new Date(startTime).toISOString().slice(0, 10);
        const dayBattles = allBattles.filter((b) => b.battleDate === battleDate);

        const attacks = dayBattles.filter((b) => b.isAttack && b.trophyChange > 0);
        const defenses = dayBattles.filter((b) => !b.isAttack || b.trophyChange <= 0);

        const gain = attacks.reduce((acc, b) => acc + b.trophyChange, 0);
        const loss = defenses.reduce((acc, b) => acc + b.trophyChange, 0);

        const firstBattle = dayBattles.at(-1);
        const lastBattle = dayBattles.at(0);

        return {
          attackCount: attacks.length,
          defenseCount: defenses.length,
          gain,
          loss,
          final: lastBattle?.trophies ?? '-',
          initial: firstBattle ? firstBattle.trophies - firstBattle.trophyChange : '-',
          day: i + 1,
          netGain: gain + loss
        };
      });

      result.push({ name: allBattles[0]?.name ?? tag, tag, logs: perDayLogs });
    }

    return { embeds: [], result };
  }

  private async export(interaction: CommandInteraction<'cached'>, result: AggregatedResult[]) {
    const chunks = result
      .map((r) => {
        const records = r.logs.reduce<Record<string, PerDayLog>>((prev, acc) => {
          prev[acc.day] ??= acc;
          return prev;
        }, {});
        return { name: r.name, tag: r.tag, records };
      })
      .flat();

    const days = Util.getLegendDays();
    const sheets: CreateGoogleSheet[] = [
      {
        title: `Attacks`,
        columns: [
          { name: 'NAME', align: 'LEFT', width: 160 },
          { name: 'TAG', align: 'LEFT', width: 160 },
          ...days.map((_, n) => ({ name: `Day ${n + 1}`, align: 'RIGHT', width: 100 }))
        ],

        rows: chunks.map((r) => [
          r.name,
          r.tag,
          ...days.map((_, i) => r.records[i + 1]?.attackCount ?? 0)
        ])
      },
      {
        title: `Defense`,
        columns: [
          { name: 'NAME', align: 'LEFT', width: 160 },
          { name: 'TAG', align: 'LEFT', width: 160 },
          ...days.map((_, n) => ({ name: `Day ${n + 1}`, align: 'RIGHT', width: 100 }))
        ],

        rows: chunks.map((r) => [
          r.name,
          r.tag,
          ...days.map((_, i) => r.records[i + 1]?.defenseCount ?? 0)
        ])
      },
      {
        title: `Gain`,
        columns: [
          { name: 'NAME', align: 'LEFT', width: 160 },
          { name: 'TAG', align: 'LEFT', width: 160 },
          ...days.map((_, n) => ({ name: `Day ${n + 1}`, align: 'RIGHT', width: 100 }))
        ],

        rows: chunks.map((r) => [r.name, r.tag, ...days.map((_, i) => r.records[i + 1]?.gain ?? 0)])
      },
      {
        title: `Loss`,
        columns: [
          { name: 'NAME', align: 'LEFT', width: 160 },
          { name: 'TAG', align: 'LEFT', width: 160 },
          ...days.map((_, n) => ({ name: `Day ${n + 1}`, align: 'RIGHT', width: 100 }))
        ],

        rows: chunks.map((r) => [r.name, r.tag, ...days.map((_, i) => r.records[i + 1]?.loss ?? 0)])
      },
      {
        title: `Net Gain`,
        columns: [
          { name: 'NAME', align: 'LEFT', width: 160 },
          { name: 'TAG', align: 'LEFT', width: 160 },
          ...days.map((_, n) => ({ name: `Day ${n + 1}`, align: 'RIGHT', width: 100 }))
        ],

        rows: chunks.map((r) => [
          r.name,
          r.tag,
          ...days.map((_, i) => r.records[i + 1]?.netGain ?? 0)
        ])
      }
    ];

    const spreadsheet = await createGoogleSheet(
      `${interaction.guild.name} [Legend Attacks History]`,
      sheets
    );
    return interaction.editReply({
      content: '**Legend Attacks History**',
      components: getExportComponents(spreadsheet)
    });
  }
}

interface PerDayLog {
  attackCount: number;
  defenseCount: number;
  gain: number;
  loss: number;
  final: number | string;
  initial: number | string;
  day: number;
  netGain: number;
}

interface AggregatedResult {
  name: string;
  tag: string;
  logs: PerDayLog[];
}
