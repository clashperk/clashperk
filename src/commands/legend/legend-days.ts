import { ATTACK_COUNTS, Collections, LEGEND_LEAGUE_ID, UNRANKED_TIER_ID } from '@app/constants';
import { LegendAttacksEntity } from '@app/entities';
import { APIPlayer } from 'clashofclans.js';
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  User,
  escapeMarkdown,
  time
} from 'discord.js';
import moment from 'moment';
import pluralize from 'pluralize';
import { aggregateLegendAttacks, getLegendAttack, getLegendTimestampAgainstDay } from '../../helper/legends.helper.js';
import { Args, Command } from '../../lib/handlers.js';
import { createLegendGraph } from '../../struct/image-helper.js';
import { EMOJIS, HOME_TROOPS, TOWN_HALLS } from '../../util/emojis.js';
import { formatLeague, padStart, trimTag } from '../../util/helper.js';
import { Season, Util } from '../../util/toolkit.js';

export default class LegendDaysCommand extends Command {
  public constructor() {
    super('legend-days', {
      aliases: ['legends-search'],
      category: 'search',
      channel: 'dm',
      clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
      defer: true
    });
  }

  public args(): Args {
    return {
      player: {
        id: 'tag',
        match: 'STRING'
      }
    };
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: { tag?: string; user?: User; prev?: boolean; day?: number; graph?: boolean }
  ) {
    const data = await this.client.resolver.resolvePlayer(interaction, args.tag ?? args.user?.id);
    if (!data) return;

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setEmoji(EMOJIS.REFRESH)
          .setCustomId(JSON.stringify({ cmd: this.id, prev: args.prev, tag: data.tag }))
          .setStyle(ButtonStyle.Secondary)
      )
      .addComponents(
        new ButtonBuilder()
          .setLabel(args.prev ? 'Overview / Current Day' : 'Previous Days / Graph')
          .setCustomId(JSON.stringify({ cmd: this.id, prev: !args.prev, _: 1, tag: data.tag }))
          .setStyle(args.prev ? ButtonStyle.Success : ButtonStyle.Primary)
      );

    if (data.leagueTier?.id !== LEGEND_LEAGUE_ID) {
      if (await this.rankedBattles(interaction, data)) return;
      return interaction.followUp({
        content: `**${data.name} (${data.tag})** is not in the Legend League. \n**Ranked battle logs are coming soon!**`
      });
    }

    const legend = await getLegendAttack(data.tag);
    if (!legend) {
      return interaction.followUp({
        content: [`No data available for **${data.name} (${data.tag})**`, `Going forward, Legend statistics will be collected.`].join('\n')
      });
    }

    const embed = args.prev ? await this.logs(data) : await this.embed(interaction, data, legend, args.day);

    embed.setTimestamp().setColor(this.client.embed(interaction));
    await interaction.editReply({ embeds: [embed], components: [row], content: null, files: [] });

    const result = args.prev ? await this.graph(data) : null;
    if (result) {
      const rawFile = new AttachmentBuilder(result.file, { name: result.name });
      embed.setImage(result.attachmentKey);
      return interaction.editReply({ embeds: [embed], components: [row], files: [rawFile], content: null });
    }
  }

  private async getClan(clanTag: string) {
    const clan = await this.client.redis.getClan(clanTag);
    if (clan) return clan;

    const { body, res } = await this.client.coc.getClan(clanTag);
    if (res.ok && body) return body;

    return null;
  }

  private async embed(interaction: CommandInteraction, data: APIPlayer, legend: LegendAttacksEntity, _day?: number) {
    const clan = data.clan ? await this.getClan(data.clan.tag) : null;

    const { startTime, endTime, day } = getLegendTimestampAgainstDay(_day);
    const logs = (legend?.logs ?? []).filter((atk) => atk.timestamp >= startTime && atk.timestamp <= endTime);
    const attacks = logs.filter((en) => en.type === 'attack') ?? [];
    const defenses = logs.filter((en) => en.type === 'defense' || (en.type === 'attack' && en.inc === 0)) ?? [];

    const member = (clan?.memberList ?? []).find((en) => en.tag === data.tag);
    // const clanRank = member?.clanRank ?? 0;
    // const percentage = this.calc(clanRank);

    const [initial] = logs;
    const [current] = logs.slice(-1);

    const possibleAttackCount = legend.attackLogs?.[moment(endTime).format('YYYY-MM-DD')] ?? 0;
    const possibleDefenseCount = legend.defenseLogs?.[moment(endTime).format('YYYY-MM-DD')] ?? 0;

    const attackCount = Math.max(attacks.length, possibleAttackCount);
    const defenseCount = Math.max(defenses.length, possibleDefenseCount);

    const trophiesFromAttacks = attacks.reduce((acc, cur) => acc + cur.inc, 0);
    const trophiesFromDefenses = defenses.reduce((acc, cur) => acc + cur.inc, 0);

    const netTrophies = trophiesFromAttacks + trophiesFromDefenses;

    const { globalRank, countryRank } = await this.rankings(data.tag);

    const weaponLevel = data.townHallWeaponLevel ? ATTACK_COUNTS[data.townHallWeaponLevel] : '';
    const embed = new EmbedBuilder()
      .setColor(this.client.embed(interaction))
      .setTitle(`${escapeMarkdown(data.name)} (${data.tag})`)
      .setURL(`http://cprk.us/p/${trimTag(data.tag)}`);
    embed.setDescription(
      [
        `${TOWN_HALLS[data.townHallLevel]} **${data.townHallLevel}${weaponLevel}** ${
          data.leagueTier?.id === LEGEND_LEAGUE_ID ? EMOJIS.LEGEND_LEAGUE : EMOJIS.TROPHY
        } **${data.trophies}**`,
        ''
      ].join('\n')
    );

    embed.addFields([
      {
        name: '**Overview**',
        value: [
          `- Initial Trophies: ${initial?.start || data.trophies}`,
          `- Current Trophies: ${current?.end || data.trophies}`,
          `- ${attackCount} attack${attackCount === 1 ? '' : 's'} (+${trophiesFromAttacks} trophies)`,
          `- ${defenseCount} defense${defenseCount === 1 ? '' : 's'} (${trophiesFromDefenses} trophies)`,
          `- ${Math.abs(netTrophies)} trophies ${netTrophies >= 0 ? 'gained' : 'lost'}`,
          `- Streak: ${legend.streak ?? 0}`
        ].join('\n')
      }
    ]);

    if (globalRank || countryRank) {
      embed.addFields({
        name: '**Ranking**',
        value: [
          `- Global Rank: ${globalRank ?? 'N/A'}`,
          `- Local Rank: ${
            countryRank ? `${countryRank.players.rank} (${countryRank.country} :flag_${countryRank.countryCode.toLowerCase()}:)` : 'N/A'
          }`
        ].join('\n')
      });
    }

    if (clan && member) {
      embed.addFields([
        {
          name: '**Clan**',
          value: [
            `- ${clan ? `[${clan.name} (${clan.tag})](http://cprk.us/c/${trimTag(clan.tag)})` : 'N/A'}`,
            `- Rank in Clan: ${member.clanRank}`
            // `- Clan Points Contribution: ${Math.floor((member.trophies * percentage) / 100)} (${percentage}%)`
          ].join('\n')
        }
      ]);
    }

    const heroes = data.heroes.filter((hero) => {
      return hero.equipment?.length && hero.village === 'home';
    });
    const equipmentGroup = heroes
      .map((hero) => {
        const troops = [hero, ...hero.equipment!].filter((unit) => HOME_TROOPS[unit.name]);
        return troops.map((unit, idx) => {
          const unitIcon = HOME_TROOPS[unit.name];
          const level = padStart(unit.level, idx === 0 ? 3 : 2);
          return `${unitIcon} \`\u200e${level}\u200f\`${idx === 0 ? ' -' : ''}`;
        });
      })
      .filter((group) => group.length);

    if (equipmentGroup.length && attacks.length && Util.getLegendDay() === day) {
      embed.addFields({
        name: 'Equipment Used',
        value: equipmentGroup.map((group) => group.join(' ')).join('\n')
      });
    }

    embed.addFields([
      {
        name: '**Attacks**',
        value: attacks.length
          ? attacks.map((m) => `\` ${`+${m.inc}`.padStart(3, ' ')} \` ${time(new Date(m.timestamp), 'R')}`).join('\n')
          : '-',
        inline: true
      },
      {
        name: '**Defenses**',
        value: defenses.length
          ? defenses.map((m) => `\` ${`-${Math.abs(m.inc)}`.padStart(3, ' ')} \` ${time(new Date(m.timestamp), 'R')}`).join('\n')
          : '-',
        inline: true
      }
    ]);

    const season = Season.getSeason();
    embed.setFooter({ text: `Day ${day}/${moment(season.endTime).diff(season.startTime, 'days')} (${Season.ID})` });
    return embed;
  }

  private async graph(data: APIPlayer) {
    const { items: result, lastSeasonEnd, seasonEnd, seasonStart } = await aggregateLegendAttacks(data.tag);
    if (!result.length) return null;

    const season = result.at(0)!;
    const lastSeason = result.at(1);
    const prevFinalTrophies = lastSeason?.logs.at(-1)?.trophies ?? '';

    if (season._id !== Season.ID) return null;

    const labels = Array.from({ length: moment(seasonEnd).diff(seasonStart, 'days') + 1 }, (_, i) =>
      moment(seasonStart).add(i, 'days').toDate()
    );

    for (const label of labels) {
      const log = season.logs.find((log) => moment(log.timestamp).isSame(label, 'day'));
      if (!log) season.logs.push({ timestamp: label, trophies: null });
    }
    season.logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const lastSeasonLabels = Array.from({ length: labels.length }, (_, i) => moment(lastSeasonEnd).subtract(i, 'days').toDate()).reverse();

    if (lastSeason) {
      lastSeasonLabels.forEach((label) => {
        const log = lastSeason.logs.find((log) => moment(log.timestamp).isSame(label, 'day'));
        if (!log) lastSeason.logs.push({ timestamp: label, trophies: null });
      });
      lastSeason.logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      lastSeason.logs = lastSeason.logs.map((log, i) => {
        if (log.trophies === null) {
          return {
            ...log,
            trophies: lastSeason.logs[i - 1]?.trophies ?? null
          };
        }
        return log;
      });
      lastSeason.logs = lastSeason.logs.slice(-season.logs.length);
    }

    return createLegendGraph({
      datasets: result.slice(0, 2),
      data: {
        name: data.name,
        townHallLevel: data.townHallLevel,
        trophies: data.trophies,
        clan: data.clan
      },
      labels,
      prevFinalTrophies,
      season,
      seasonEnd,
      seasonStart,
      lastSeason
    });
  }

  private async logs(data: APIPlayer) {
    const legend = await getLegendAttack(data.tag);

    const logs = legend?.logs ?? [];
    const days = Util.getLegendDays();

    const perDayLogs = days.reduce<AggsEntry[]>((items, { startTime, endTime }) => {
      const mixedLogs = logs.filter((atk) => atk.timestamp >= startTime && atk.timestamp <= endTime);
      const attacks = mixedLogs.filter((en) => en.type === 'attack') ?? [];
      const defenses = mixedLogs.filter((en) => en.type === 'defense' || (en.type === 'attack' && en.inc === 0)) ?? [];

      const possibleAttackCount = legend?.attackLogs?.[moment(endTime).format('YYYY-MM-DD')] ?? 0;
      const possibleDefenseCount = legend?.defenseLogs?.[moment(endTime).format('YYYY-MM-DD')] ?? 0;

      const attackCount = Math.max(attacks.length, possibleAttackCount);
      const defenseCount = Math.max(defenses.length, possibleDefenseCount);

      const [final] = mixedLogs.slice(-1);
      const [initial] = mixedLogs;

      const gain = attacks.reduce((acc, cur) => acc + cur.inc, 0);
      const loss = defenses.reduce((acc, cur) => acc + cur.inc, 0);

      items.push({ attackCount, defenseCount, gain, loss, final: final?.end ?? '-', initial: initial?.start ?? '-' });
      return items;
    }, []);

    const totalAttacks = perDayLogs.reduce((acc, cur) => acc + cur.attackCount, 0);

    const weaponLevel = data.townHallWeaponLevel ? ATTACK_COUNTS[data.townHallWeaponLevel] : '';
    const logDescription =
      perDayLogs.length >= 32
        ? [
            '```',
            'DAY ATK   DEF  +/-  INIT FINAL',
            ...perDayLogs.map((day, i) => {
              const net = day.gain + day.loss;
              const def = padStart(`-${Math.abs(day.loss)}${ATTACK_COUNTS[Math.min(8, day.defenseCount)]}`, 5);
              const atk = padStart(`+${day.gain}${ATTACK_COUNTS[Math.min(8, day.attackCount)]}`, 5);
              const ng = padStart(`${net > 0 ? '+' : ''}${net}`, 4);
              const final = padStart(day.final, 4);
              const init = padStart(day.initial, 4);
              const n = (i + 1).toString().padStart(2, ' ');
              return `\u200e${n} ${atk} ${def} ${ng} ${init}  ${final}`;
            }),
            '```'
          ]
        : [
            '`DAY` `  ATK ` `  DEF ` ` +/- ` ` INIT ` `FINAL `',
            ...perDayLogs.map((day, i) => {
              const net = day.gain + day.loss;
              const def = padStart(`-${Math.abs(day.loss)}${ATTACK_COUNTS[Math.min(8, day.defenseCount)]}`, 5);
              const atk = padStart(`+${day.gain}${ATTACK_COUNTS[Math.min(8, day.attackCount)]}`, 5);
              const ng = padStart(`${net > 0 ? '+' : ''}${net}`, 4);
              const final = padStart(day.final, 4);
              const init = padStart(day.initial, 5);
              const n = (i + 1).toString().padStart(2, ' ');
              return `\`\u200e${n} \` \`${atk} \` \`${def} \` \`${ng} \` \`${init} \` \` ${final} \``;
            })
          ];

    const description = [
      ...[
        `${TOWN_HALLS[data.townHallLevel]} **${data.townHallLevel}${weaponLevel}** ${
          data.leagueTier?.id === LEGEND_LEAGUE_ID ? EMOJIS.LEGEND_LEAGUE : EMOJIS.TROPHY
        } **${data.trophies}**`,
        ''
      ],
      `**Legend Season Logs (${Season.ID})**`,
      `- ${data.attackWins || totalAttacks} ${pluralize('attack', data.attackWins)} and ${data.defenseWins} ${pluralize('defense', data.defenseWins)} won`,
      '',
      logDescription.join('\n')
    ].join('\n');

    const embed = new EmbedBuilder();
    embed.setTitle(`${escapeMarkdown(data.name)} (${data.tag})`);
    embed.setURL(`http://cprk.us/p/${trimTag(data.tag)}`);
    embed.setDescription(description);

    const season = Season.getSeason();
    embed.setFooter({
      text: `Day ${days.length}/${moment(season.endTime).diff(season.startTime, 'days')} (${Season.ID})`
    });

    return embed;
  }

  private async rankings(tag: string) {
    const ranks = await this.client.db
      .collection(Collections.PLAYER_RANKS)
      .aggregate<{ country: string; countryCode: string; players: { rank: number } }>([
        {
          $match: {
            season: Season.ID
          }
        },
        {
          $unwind: {
            path: '$players'
          }
        },
        {
          $match: {
            'players.tag': tag
          }
        }
      ])
      .toArray();

    return {
      globalRank: ranks.find(({ countryCode }) => countryCode === 'global')?.players.rank ?? null,
      countryRank: ranks.find(({ countryCode }) => countryCode !== 'global') ?? null
    };
  }

  private async rankedBattles(interaction: CommandInteraction<'cached'>, player: APIPlayer) {
    const [logs, lastTournament, { globalRank, countryRank }] = await Promise.all([
      this.getTournamentLogs(player.tag),
      this.getLastTournament(player.tag),
      this.rankings(player.tag)
    ]);

    const leagueId = player.leagueTier?.id ?? UNRANKED_TIER_ID;
    if ((!logs.length && !lastTournament.result) || leagueId === UNRANKED_TIER_ID || !player.leagueTier) return null;

    const embed = new EmbedBuilder()
      .setColor(this.client.embed(interaction))
      .setTitle(`${escapeMarkdown(player.name)} (${player.tag})`)
      .setURL(`http://cprk.us/p/${trimTag(player.tag)}`);

    embed.setDescription(
      [`${TOWN_HALLS[player.townHallLevel]} **${player.townHallLevel}** ${EMOJIS.TROPHY} **${player.trophies}**`].join('\n')
    );
    embed.setThumbnail(player.leagueTier.iconUrls.small);

    if (!Season.isTournamentReset) {
      const isBugged = player.attackWins === 0 && player.defenseWins === 0 && player.trophies > 40;
      const { startTime, endTime } = Util.getTournamentWindow();
      embed.addFields({
        name: `Overview (${moment(startTime).format('D MMM')} - ${moment(endTime).format('D MMM')})`,
        value: [
          `- ${player.trophies} trophies gained`,
          ...(isBugged ? [] : [`- ${player.attackWins} attacks won`, `- ${player.defenseWins} defenses won`])
        ].join('\n')
      });
    }

    if (lastTournament.result) {
      const isBugged = lastTournament.result.attacks === 0 && lastTournament.result.defenses === 0;
      embed.addFields({
        name: `Previous Week (${moment(lastTournament.startTime).format('D MMM')} - ${moment(lastTournament.endTime).format('D MMM')})`,
        value: [
          `- ${lastTournament.result.trophies} trophies gained`,
          ...(isBugged ? [] : [`- ${lastTournament.result.attacks} attacks won`, `- ${lastTournament.result.defenses} defenses won`]),
          leagueId > lastTournament.result.leagueId
            ? `- Promoted to **${formatLeague(player.leagueTier.name)} (${EMOJIS.UP_KEY} ${leagueId - lastTournament.result.leagueId})**`
            : leagueId < lastTournament.result.leagueId
              ? `- Demoted to **${formatLeague(player.leagueTier.name)} (${EMOJIS.DOWN_KEY} ${lastTournament.result.leagueId - leagueId})**`
              : `- Stayed in **${formatLeague(player.leagueTier.name)}**`
        ].join('\n')
      });
    }

    embed.addFields([
      {
        name: '**Ranking**',
        value: [
          `- Global Rank: ${globalRank ?? 'N/A'}`,
          `- Local Rank: ${
            countryRank ? `${countryRank.players.rank} (${countryRank.country} :flag_${countryRank.countryCode.toLowerCase()}:)` : 'N/A'
          }`
        ].join('\n')
      }
    ]);

    embed.addFields([
      {
        name: logs.length > 10 ? '**Logs (last 10)**' : '**Logs**',
        value: !logs.length
          ? '-'
          : logs
              .slice(0, 10)
              .reverse()
              .map((row) => {
                return `\`${padStart(`+${row.diff}`, 4)} \` ${time(moment(row.createdAt).toDate(), 'R')}`;
              })
              .join('\n')
      }
    ]);

    if (Season.isTournamentReset) {
      const { startTime, endTime } = Util.getTournamentWindow();
      embed.addFields([
        {
          name: 'Upcoming Tournament',
          value: `${time(startTime, 'D')} - ${time(endTime, 'D')}`
        }
      ]);
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setEmoji(EMOJIS.REFRESH)
        .setCustomId(JSON.stringify({ cmd: this.id, tag: player.tag }))
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.editReply({ embeds: [embed], components: [row], content: null });
  }

  private async getLastTournament(playerTag: string) {
    const lastWeek = moment(Util.getTournamentWindow().startTime).subtract(7, 'days').format('YYYY-MM-DD');
    const { id, startTime, endTime } = Util.getTournamentWindowById(lastWeek);

    const rows = await this.client.clickhouse
      .query({
        query: `
          SELECT
            anyLast(name) AS name,
            tag,
            sum(diff) AS diff,
            max(trophies) AS trophies,
            max(attacks) AS attacks,
            max(defenses) AS defenses,
            max(leagueId) AS leagueId,
            max(createdAt) AS createdAt
          FROM player_trophy_records
          WHERE tag = {tag: String} AND weekId = {weekId: String}
          GROUP BY tag;
      `,
        query_params: { tag: playerTag, weekId: id }
      })
      .then((res) =>
        res.json<{
          name: string;
          tag: string;
          trophies: number;
          leagueId: number;
          diff: number;
          attacks: number;
          defenses: number;
          createdAt: string;
        }>()
      );

    return {
      result: rows.data.at(0) ?? null,
      startTime,
      endTime,
      id
    };
  }

  private async getTournamentLogs(playerTag: string) {
    const rows = await this.client.clickhouse
      .query({
        query: `
          SELECT
            name,
            tag,
            diff,
            trophies,
            attacks,
            defenses,
            leagueId,
            createdAt
          FROM player_trophy_records
          WHERE tag = {tag: String} AND weekId = {weekId: String}
          ORDER BY createdAt DESC
        `,
        query_params: { tag: playerTag, weekId: Season.tournamentID }
      })
      .then((res) => res.json<RankedBattleLog>());

    return rows.data;
  }
}

interface RankedBattleLog {
  name: string;
  tag: string;
  trophies: number;
  leagueId: number;
  diff: number;
  attacks: number;
  defenses: number;
  createdAt: string;
}

interface AggsEntry {
  attackCount: number;
  defenseCount: number;
  gain: number;
  loss: number;
  final: number;
  initial: number;
}
