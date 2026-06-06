import {
  ATTACK_COUNTS,
  BattlesPerWeek,
  Collections,
  LEGEND_LEAGUE_ID,
  PLAYER_LEAGUE_MAP,
  UNRANKED_TIER_ID
} from '@app/constants';
import { APIPlayer } from 'clashofclans.js';
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  StringSelectMenuBuilder,
  User,
  escapeMarkdown,
  time
} from 'discord.js';
import moment from 'moment';
import ms from 'ms';
import pluralize from 'pluralize';
import { api, encode } from '../../api/axios.js';
import { BattleLogDto } from '../../api/generated.js';
import {
  aggregateLegendBattleLog,
  getLegendBattleLog,
  getLegendBattleLogAggregate,
  getLegendTimestampAgainstDay,
  getRankedBattleLog,
  getTournament
} from '../../helper/legends.helper.js';
import { Args, Command } from '../../lib/handlers.js';
import { createLegendGraph } from '../../struct/image-helper.js';
import {
  EMOJIS,
  HOME_BASE_LEAGUES,
  HOME_TROOPS,
  PLAYER_LEAGUE_TIERS,
  TOWN_HALLS
} from '../../util/emojis.js';
import { formatLeague, getMenuFromMessage, padStart, trimTag } from '../../util/helper.js';
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
    interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>,
    args: { tag?: string; user?: User; prev?: boolean; day?: number; graph?: boolean }
  ) {
    const data = await this.client.resolver.resolvePlayer(interaction, args.tag ?? args.user?.id);
    if (!data) return;

    const customIds = {
      refresh: this.createId({ cmd: this.id, prev: args.prev, tag: data.tag }),
      accounts: this.createId({ cmd: this.id, prev: args.prev, tag: data.tag, string_key: 'tag' }),
      overview: this.createId({ cmd: this.id, prev: !args.prev, _: 1, tag: data.tag })
    };

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setEmoji(EMOJIS.REFRESH)
          .setCustomId(customIds.refresh)
          .setStyle(ButtonStyle.Secondary)
      )
      .addComponents(
        new ButtonBuilder()
          .setLabel(args.prev ? 'Overview / Current Day' : 'Previous Days / Graph')
          .setCustomId(customIds.overview)
          .setStyle(args.prev ? ButtonStyle.Success : ButtonStyle.Primary)
      );

    if (!data.leagueTier || data.leagueTier.id !== LEGEND_LEAGUE_ID) {
      if (await this.rankedBattles(interaction, data)) return;
      return interaction.followUp({
        content: `**${data.name} (${data.tag})** is not in the Legend League. \n**Ranked battle logs are coming soon!**`
      });
    }

    const battles = await getLegendBattleLog(data.tag);
    if (!battles.length) {
      return interaction.followUp({
        content: [
          `No data available for **${data.name} (${data.tag})**`,
          `Going forward, Legend statistics will be collected.`
        ].join('\n')
      });
    }

    const embed = args.prev
      ? await this.logs(data, battles)
      : await this.embed(interaction, data, battles, args.day);

    embed.setTimestamp().setColor(this.client.embed(interaction));
    await interaction.editReply({
      embeds: [embed],
      components: [
        row,
        ...(interaction.isMessageComponent()
          ? getMenuFromMessage(interaction, data.tag, customIds.accounts)
          : [])
      ],
      content: null,
      files: []
    });

    const result = args.prev ? await this.graph(data) : null;
    if (result) {
      const rawFile = new AttachmentBuilder(result.file, { name: result.name });
      embed.setImage(result.attachmentKey);
      return interaction.editReply({
        embeds: [embed],
        components: [
          row,
          ...(interaction.isMessageComponent()
            ? getMenuFromMessage(interaction, data.tag, customIds.accounts)
            : [])
        ],
        files: [rawFile],
        content: null
      });
    }

    if (!data.user) return;

    const players = await this.client.resolver.getPlayers(data.user.id);
    const options = players
      .filter(
        (op) =>
          op.leagueTier?.id === LEGEND_LEAGUE_ID ||
          (op.currentLeagueGroupTag && op.currentLeagueGroupTag !== '#0')
      )
      .map((op) => ({
        label: `${op.name} (${op.tag})`,
        description: `${EMOJIS.TROPHY_UNICODE} ${op.trophies}`,
        value: op.tag,
        default: op.tag === data.tag,
        emoji: PLAYER_LEAGUE_TIERS[PLAYER_LEAGUE_MAP[op.leagueTier?.id ?? UNRANKED_TIER_ID]]
      }));

    if (!(options.length > 1)) return;

    const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(customIds.accounts)
        .setPlaceholder('Select an account!')
        .addOptions(options)
    );

    return interaction.editReply({ components: [row, menuRow] });
  }

  private async getClan(clanTag: string) {
    const clan = await this.client.redis.getClan(clanTag);
    if (clan) return clan;

    const { body, res } = await this.client.coc.getClan(clanTag);
    if (res.ok && body) return body;

    return null;
  }

  private async addClanAndEquipmentFields({
    embed,
    player,
    showEquipment
  }: {
    embed: EmbedBuilder;
    player: APIPlayer;
    showEquipment: boolean;
  }) {
    const clan = player.clan ? await this.getClan(player.clan.tag) : null;
    const member = (clan?.memberList ?? []).find((en) => en.tag === player.tag);

    if (clan && member) {
      embed.addFields({
        name: '**Clan**',
        value: [
          `- [${clan.name} (${clan.tag})](http://cprk.us/c/${trimTag(clan.tag)})`,
          `- Rank in Clan: ${member.clanRank}`
        ].join('\n')
      });
    }

    if (showEquipment) {
      const heroes = player.heroes.filter(
        (hero) => hero.equipment?.length && hero.village === 'home'
      );
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

      if (equipmentGroup.length) {
        embed.addFields({
          name: 'Equipment Used',
          value: equipmentGroup.map((group) => group.join(' ')).join('\n')
        });
      }
    }
  }

  private async embed(
    interaction: CommandInteraction | ButtonInteraction,
    data: APIPlayer,
    battleLogs: BattleLogDto[],
    _day?: number
  ) {
    const { startTime, day } = getLegendTimestampAgainstDay(_day);
    const battleDate = new Date(startTime).toISOString().slice(0, 10);
    const dayBattles = battleLogs.filter((b) => {
      return b.battleDate === battleDate;
    });

    const attacks = dayBattles.filter((b) => b.isAttack);
    const defenses = dayBattles.filter((b) => !b.isAttack);

    const trophiesFromAttacks = attacks.reduce((acc, b) => acc + b.trophyChange, 0);
    const trophiesFromDefenses = defenses.reduce((acc, b) => acc + b.trophyChange, 0);
    const netTrophies = trophiesFromAttacks + trophiesFromDefenses;

    let streak = 0;
    for (const b of attacks) {
      if (b.stars === 3) streak++;
      else break;
    }

    const firstBattle = dayBattles.at(-1);
    const lastBattle = dayBattles.at(0);
    const initialTrophies = firstBattle
      ? firstBattle.trophies - firstBattle.trophyChange
      : data.trophies;
    const currentTrophies = lastBattle ? lastBattle.trophies : data.trophies;

    const { globalRank, countryRank } = await this.rankings(data.tag);

    const weaponLevel = data.townHallWeaponLevel ? ATTACK_COUNTS[data.townHallWeaponLevel] : '';
    const embed = new EmbedBuilder()
      .setColor(this.client.embed(interaction))
      .setTitle(`${escapeMarkdown(data.name)} (${data.tag})`)
      .setURL(`http://cprk.us/p/${trimTag(data.tag)}`);
    embed.setDescription(
      [
        `${TOWN_HALLS[data.townHallLevel]} **${data.townHallLevel}${weaponLevel}** ${
          data.leagueTier && data.leagueTier.id === LEGEND_LEAGUE_ID
            ? EMOJIS.LEGEND_LEAGUE
            : EMOJIS.TROPHY
        } **${data.trophies} ${HOME_BASE_LEAGUES[data.leagueTier?.id ?? UNRANKED_TIER_ID]} ${'Legend I'}**`
      ].join('\n')
    );

    embed.addFields([
      {
        name: '**Overview**',
        value: [
          `- Initial Trophies: ${initialTrophies}`,
          `- Current Trophies: ${currentTrophies}`,
          `- ${attacks.length} attack${attacks.length === 1 ? '' : 's'} (+${trophiesFromAttacks} trophies)`,
          `- ${defenses.length} defense${defenses.length === 1 ? '' : 's'} (${trophiesFromDefenses} trophies)`,
          `- ${Math.abs(netTrophies)} trophies ${netTrophies >= 0 ? 'gained' : 'lost'}`,
          `- Streak: ${streak}`
        ].join('\n')
      }
    ]);

    if (globalRank || countryRank) {
      embed.addFields({
        name: '**Ranking**',
        value: [
          `- Global Rank: ${globalRank ?? 'N/A'}`,
          `- Local Rank: ${
            countryRank
              ? `${countryRank.players.rank} (${countryRank.country} :flag_${countryRank.countryCode.toLowerCase()}:)`
              : 'N/A'
          }`
        ].join('\n')
      });
    }

    await this.addClanAndEquipmentFields({
      embed,
      player: data,
      showEquipment: attacks.length > 0 && Util.getLegendDay() === day
    });

    embed.addFields([
      {
        name: '**Attacks**',
        value: attacks.length
          ? attacks
              .reverse()
              .map(
                (b) =>
                  `\` ${padStart(`+${b.trophyChange}`, 3)}\` \u200b \`${'★'.repeat(b.stars)}${'☆'.repeat(3 - b.stars)}\` \u200b \`${padStart(b.destruction, 3)}%\` \u200b ${time(new Date(b.ingestedAt), 'R')}`
              )
              .join('\n')
          : '-',
        inline: true
      },
      {
        name: '**Defenses**',
        value: defenses.length
          ? defenses
              .reverse()
              .map(
                (b) =>
                  `\` ${padStart(`${b.trophyChange === 0 ? '+' : ''}${b.trophyChange}`, 3)}\` \u200b \`${'★'.repeat(b.stars)}${'☆'.repeat(3 - b.stars)}\` \u200b \`${padStart(b.destruction, 3)}%\` \u200b ${time(new Date(b.ingestedAt), 'R')}`
              )
              .join('\n')
          : '-',
        inline: true
      }
    ]);

    const season = Season.getSeason();
    embed.setFooter({
      text: `Day ${day}/${moment(season.endTime).diff(season.startTime, 'days')} (${Season.ID})`
    });
    return embed;
  }

  private async graph(data: APIPlayer) {
    const dailyItems = await getLegendBattleLogAggregate(data.tag);
    if (!dailyItems.length) return null;

    const {
      items: result,
      seasonStart,
      seasonEnd,
      lastSeasonEnd
    } = aggregateLegendBattleLog(dailyItems);
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

    const lastSeasonLabels = Array.from({ length: labels.length }, (_, i) =>
      moment(lastSeasonEnd).subtract(i, 'days').toDate()
    ).reverse();

    if (lastSeason) {
      lastSeasonLabels.forEach((label) => {
        const log = lastSeason.logs.find((log) => moment(log.timestamp).isSame(label, 'day'));
        if (!log) lastSeason.logs.push({ timestamp: label, trophies: null });
      });
      lastSeason.logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      lastSeason.logs = lastSeason.logs.map((log, i) => {
        if (log.trophies === null) {
          return { ...log, trophies: lastSeason.logs[i - 1]?.trophies ?? null };
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

  private async logs(data: APIPlayer, battleLogs: BattleLogDto[]) {
    const days = Util.getLegendDays();

    const perDayLogs = days.map(({ startTime }) => {
      const battleDate = new Date(startTime).toISOString().slice(0, 10);
      const dayBattles = battleLogs.filter((b) => b.battleDate === battleDate);

      const attacks = dayBattles.filter((b) => b.isAttack);
      const defenses = dayBattles.filter((b) => !b.isAttack);

      const gain = attacks.reduce((acc, b) => acc + b.trophyChange, 0);
      const loss = defenses.reduce((acc, b) => acc + b.trophyChange, 0);

      const firstBattle = dayBattles.at(-1);
      const lastBattle = dayBattles.at(0);
      const initial = firstBattle?.startTrophies;
      const final = lastBattle?.endTrophies;

      return {
        attackCount: attacks.length,
        defenseCount: defenses.length,
        gain,
        loss,
        net: initial && final ? final - initial : gain + loss,
        final: final || '-',
        initial: initial || '-'
      };
    });

    const totalAttacks = perDayLogs.reduce((acc, cur) => acc + cur.attackCount, 0);
    const weaponLevel = data.townHallWeaponLevel ? ATTACK_COUNTS[data.townHallWeaponLevel] : '';

    const description = [
      ...[
        `${TOWN_HALLS[data.townHallLevel]} **${data.townHallLevel}${weaponLevel}** ${
          data.leagueTier && data.leagueTier.id === LEGEND_LEAGUE_ID
            ? EMOJIS.LEGEND_LEAGUE
            : EMOJIS.TROPHY
        } **${data.trophies}**`,
        ''
      ],
      `**Legend Season Logs (${Season.ID})**`,
      `- ${data.attackWins || totalAttacks} ${pluralize('attack', data.attackWins)} and ${data.defenseWins} ${pluralize('defense', data.defenseWins)} won`,
      '',
      [
        '`DAY` `  ATK ` `  DEF ` ` +/- ` ` INIT ` `FINAL `',
        ...perDayLogs.map((day, i) => {
          const def = padStart(
            `-${Math.abs(day.loss)}${ATTACK_COUNTS[Math.min(8, day.defenseCount)]}`,
            5
          );
          const atk = padStart(`+${day.gain}${ATTACK_COUNTS[Math.min(8, day.attackCount)]}`, 5);
          const ng = padStart(`${day.net > 0 ? '+' : ''}${day.net}`, 4);
          const final = padStart(day.final, 4);
          const init = padStart(day.initial, 5);
          const n = (i + 1).toString().padStart(2, ' ');
          return `\`\u200e${n} \` \`${atk} \` \`${def} \` \`${ng} \` \`${init} \` \` ${final} \``;
        })
      ].join('\n')
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
        { $match: { season: Season.ID } },
        { $unwind: { path: '$players' } },
        { $match: { 'players.tag': tag } }
      ])
      .toArray();

    let globalRank =
      ranks.find(({ countryCode }) => countryCode === 'global')?.players.rank ?? null;

    if (!globalRank) {
      try {
        const estimate = await api.legends.estimateRank({ playerTag: encode(tag) });
        globalRank = estimate.data.rank;
      } catch {
        // Silently ignore estimate errors
      }
    }

    return {
      globalRank,
      countryRank: ranks.find(({ countryCode }) => countryCode !== 'global') ?? null
    };
  }

  private async rankedBattles(
    interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>,
    player: APIPlayer
  ) {
    const tournament = await getTournament(player);
    if (!tournament) return null;
    const { battles } = tournament;

    const leagueId = player.leagueTier?.id ?? UNRANKED_TIER_ID;
    if (!battles.length || leagueId === UNRANKED_TIER_ID || !player.leagueTier) return null;

    const attacks = battles.filter((b) => b.isAttack);
    const defenses = battles.filter((b) => !b.isAttack);

    const avgStat = (arr: typeof battles, key: 'stars' | 'destruction') =>
      arr.length ? (arr.reduce((s, b) => s + b[key], 0) / arr.length).toFixed(1) : '0';
    const avgOffenseStars = avgStat(attacks, 'stars');
    const avgOffenseDestruction = avgStat(attacks, 'destruction');
    const avgDefenseStars = avgStat(defenses, 'stars');
    const avgDefenseDestruction = avgStat(defenses, 'destruction');

    const embed = new EmbedBuilder()
      .setColor(this.client.embed(interaction))
      .setTitle(`${escapeMarkdown(player.name)} (${player.tag})`)
      .setURL(`http://cprk.us/p/${trimTag(player.tag)}`);

    const leagueLabel = formatLeague(PLAYER_LEAGUE_MAP[leagueId]);
    embed.setDescription(
      [
        `${TOWN_HALLS[player.townHallLevel]} **${player.townHallLevel}** ${EMOJIS.TROPHY} **${player.trophies} ${HOME_BASE_LEAGUES[leagueId]} ${leagueLabel}**`
      ].join('\n')
    );

    if (!Season.isTournamentReset) {
      const { startTime, endTime } = Util.getTournamentWindow();

      const zoneLine = tournament.isInPromotionZone
        ? `- **Promotion Zone** (top ${tournament.promotionZone} players) ${EMOJIS.UP_KEY}`
        : tournament.isInDemotionZone
          ? `- **Demotion Zone** (last ${tournament.demotionZone} players) ${EMOJIS.DOWN_KEY}`
          : `- **Safe Zone** (rank ${tournament.promotionZone + 1}-${tournament.total - tournament.demotionZone})`;

      embed.addFields({
        name: `Overview (${moment(startTime).format('D MMM')} - ${moment(endTime).format('D MMM')})`,
        value: [
          `- ${player.trophies} trophies gained`,
          `- ${attacks.length}/${BattlesPerWeek[leagueId]} attacks`,
          `- ${defenses.length}/${BattlesPerWeek[leagueId]} defenses`,
          `- Rank **#${tournament.rank}** / ${tournament.total} (Top **${tournament.topPercentage}%**)`,
          zoneLine
        ]
          .filter(Boolean)
          .join('\n')
      });
    }

    // if (lastTournament.result) {
    //   embed.addFields({
    //     name: `Previous Week (${moment(lastTournament.startTime).format('D MMM')} - ${moment(lastTournament.endTime).format('D MMM')})`,
    //     value: [
    //       `- ${lastTournament.result.trophies} trophies gained`,
    //       `- ${lastTournament.result.attacks}/${BattlesPerWeek[lastTournament.result.leagueId]} attacks`,
    //       `- ${lastTournament.result.defenses}/${BattlesPerWeek[leagueId]} defenses`,
    //       leagueId > lastTournament.result.leagueId
    //         ? `- Promoted to **${formatLeague(player.leagueTier.name)} (${EMOJIS.UP_KEY} ${leagueId - lastTournament.result.leagueId})**`
    //         : leagueId < lastTournament.result.leagueId
    //           ? `- Demoted to **${formatLeague(player.leagueTier.name)} (${EMOJIS.DOWN_KEY} ${lastTournament.result.leagueId - leagueId})**`
    //           : `- Stayed in **${formatLeague(player.leagueTier.name)}**`
    //     ].join('\n')
    //   });
    // }

    await this.addClanAndEquipmentFields({ embed, player, showEquipment: attacks.length > 0 });

    embed.addFields([
      {
        name: `**Attacks** (Avg: ${avgOffenseStars}★ ${avgOffenseDestruction}%)`,
        value: attacks.length
          ? attacks
              .reverse()
              .map((b, idx) => {
                const timeLabel =
                  idx >= 5
                    ? `${ms(Date.now() - new Date(b.ingestedAt).getTime())}`
                    : `${time(new Date(b.ingestedAt), 'R')}`;
                return `\` ${padStart(`+${b.trophyChange}`, 3)}\` \u200b \`${'★'.repeat(b.stars)}${'☆'.repeat(3 - b.stars)}\` \u200b \`${padStart(b.destruction, 3)}%\` \u200b ${timeLabel}`;
              })
              .join('\n')
          : '-',
        inline: true
      },
      {
        name: `**Defenses** (Avg: ${avgDefenseStars}★ ${avgDefenseDestruction}%)`,
        value: defenses.length
          ? defenses
              .reverse()
              .map((b, idx) => {
                const timeLabel =
                  idx >= 5
                    ? `${ms(Date.now() - new Date(b.ingestedAt).getTime())}`
                    : `${time(new Date(b.ingestedAt), 'R')}`;
                return `\` ${padStart(`+${b.trophyChange}`, 3)}\` \u200b \`${'★'.repeat(b.stars)}${'☆'.repeat(3 - b.stars)}\` \u200b \`${padStart(b.destruction, 3)}%\` \u200b ${timeLabel}`;
              })
              .join('\n')
          : '-',
        inline: true
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
    const lastWeek = moment(Util.getTournamentWindow().startTime)
      .subtract(7, 'days')
      .format('YYYY-MM-DD');
    const { id, startTime, endTime } = Util.getTournamentWindowById(lastWeek);

    const battles = await getRankedBattleLog(playerTag, id);
    if (!battles.length) return { result: null, startTime, endTime, id };

    const attacks = battles.filter((b) => b.isAttack).length;
    const defenses = battles.filter((b) => !b.isAttack).length;
    const lastBattle = battles.at(0)!;

    return {
      result: { trophies: lastBattle.trophies, attacks, defenses, leagueId: lastBattle.leagueId },
      startTime,
      endTime,
      id
    };
  }
}
