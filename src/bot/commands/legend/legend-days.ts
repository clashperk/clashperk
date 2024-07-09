import { APIPlayer, UnrankedLeagueData } from 'clashofclans.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, User, escapeMarkdown, time } from 'discord.js';
import moment from 'moment';
import fetch from 'node-fetch';
import { PlayersEntity } from '../../entities/players.entity.js';
import { Args, Command } from '../../lib/index.js';
import { LegendAttacks } from '../../types/index.js';
import { ATTACK_COUNTS, Collections, LEGEND_LEAGUE_ID } from '../../util/Constants.js';
import { EMOJIS, TOWN_HALLS } from '../../util/Emojis.js';
import { Season, Util } from '../../util/index.js';

export default class LegendDaysCommand extends Command {
  public constructor() {
    super('legend-days', {
      category: 'search',
      channel: 'guild',
      clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
      defer: true
    });
  }

  public args(): Args {
    return {
      player_tag: {
        id: 'tag',
        match: 'STRING'
      }
    };
  }

  private getDay(day?: number) {
    if (!day) return { ...Util.getCurrentLegendTimestamp(), day: Util.getLegendDay() };
    const days = Util.getLegendDays();
    const num = Math.min(days.length, Math.max(day, 1));
    return { ...days[num - 1], day };
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
          .setLabel(args.prev ? 'Current Day' : 'Previous Days')
          .setCustomId(JSON.stringify({ cmd: this.id, prev: !args.prev, _: 1, tag: data.tag }))
          .setStyle(args.prev ? ButtonStyle.Success : ButtonStyle.Primary)
      )
      .addComponents(
        new ButtonBuilder()
          .setLabel(args.graph ? 'Overview' : 'View Graph')
          .setCustomId(JSON.stringify({ cmd: this.id, graph: !args.graph, tag: data.tag }))
          .setStyle(ButtonStyle.Secondary)
      );

    if (!(data.trophies >= 4900)) {
      return interaction.editReply(`**${data.name} (${data.tag})** is not in the Legend League.`);
    }

    const seasonId = Season.ID;
    const legend = await this.client.db.collection<LegendAttacks>(Collections.LEGEND_ATTACKS).findOne({ tag: data.tag, seasonId });

    // Updating the players DB
    await this.client.db.collection<PlayersEntity>(Collections.PLAYERS).updateOne(
      { tag: data.tag },
      {
        $setOnInsert: {
          lastSeen: moment().subtract(1, 'day').toDate()
        },
        $set: {
          name: data.name,
          townHallLevel: data.townHallLevel,
          leagueId: data.league?.id ?? UnrankedLeagueData.id,
          clan: data.clan ? { name: data.clan.name, tag: data.clan.tag } : {}
        }
      },
      {
        upsert: true
      }
    );

    if (!legend) {
      return interaction.editReply(
        [`No data available for **${data.name} (${data.tag})**`, `Going forward, Legend statistics will be collected.`].join('\n')
      );
    }

    if (args.graph) {
      const url = await this.graph(data);
      if (!url) {
        return interaction.followUp({ content: this.i18n('common.no_data', { lng: interaction.locale }), ephemeral: true });
      }
      return interaction.editReply({ content: url, embeds: [], components: [row] });
    }

    const embed = args.prev
      ? (await this.logs(data)).setColor(this.client.embed(interaction))
      : (await this.embed(interaction, data, legend, args.day)).setColor(this.client.embed(interaction));

    return interaction.editReply({ embeds: [embed], components: [row], content: null });
  }

  private calc(clanRank: number) {
    if (clanRank >= 41) return 3;
    else if (clanRank >= 31) return 10;
    else if (clanRank >= 21) return 12;
    else if (clanRank >= 11) return 25;
    return 50;
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

  private async embed(interaction: CommandInteraction<'cached'>, data: APIPlayer, legend: LegendAttacks, _day?: number) {
    const clan = data.clan ? await this.client.redis.getClan(data.clan.tag) : null;

    const { startTime, endTime, day } = this.getDay(_day);
    const logs = (legend?.logs ?? []).filter((atk) => atk.timestamp >= startTime && atk.timestamp <= endTime);
    const attacks = logs.filter((en) => en.inc > 0) ?? [];
    const defenses = logs.filter((en) => en.inc <= 0) ?? [];

    const member = (clan?.memberList ?? []).find((en) => en.tag === data.tag);
    const clanRank = member?.clanRank ?? 0;
    const percentage = this.calc(clanRank);

    const [initial] = logs;
    const [current] = logs.slice(-1);

    const attackCount = attacks.length;
    const defenseCount = defenses.length;

    const trophiesFromAttacks = attacks.reduce((acc, cur) => acc + cur.inc, 0);
    const trophiesFromDefenses = defenses.reduce((acc, cur) => acc + cur.inc, 0);

    const netTrophies = trophiesFromAttacks + trophiesFromDefenses;

    const { globalRank, countryRank } = await this.rankings(data.tag);

    const weaponLevel = data.townHallWeaponLevel ? ATTACK_COUNTS[data.townHallWeaponLevel] : '';
    const embed = new EmbedBuilder()
      .setColor(this.client.embed(interaction))
      .setTitle(`${escapeMarkdown(data.name)} (${data.tag})`)
      .setURL(`https://link.clashofclans.com/en?action=OpenPlayerProfile&tag=${encodeURIComponent(data.tag)}`);
    embed.setDescription(
      [
        `${TOWN_HALLS[data.townHallLevel]} **${data.townHallLevel}${weaponLevel}** ${
          data.league?.id === LEGEND_LEAGUE_ID ? EMOJIS.LEGEND_LEAGUE : EMOJIS.TROPHY
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
          `- ${Math.abs(netTrophies)} trophies ${netTrophies >= 0 ? 'earned' : 'lost'}`,
          `- Streak: ${legend.streak ?? 0}`
        ].join('\n')
      },
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

    if (clan && member) {
      embed.addFields([
        {
          name: '**Clan**',
          value: [
            `- ${clan ? `[${clan.name} (${clan.tag})](http://cprk.eu/c/${clan.tag.replace('#', '')})` : 'N/A'}`,
            `- Rank in Clan: ${member.clanRank}`,
            `- Clan Points Contribution: ${Math.floor((member.trophies * percentage) / 100)} (${percentage}%)`
          ].join('\n')
        }
      ]);
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

    embed.setFooter({ text: `Day ${day} (${Season.ID})` });
    return embed;
  }

  private async graph(data: APIPlayer) {
    const seasonIds = Array(Math.min(3))
      .fill(0)
      .map((_, m) => {
        const now = new Date(Season.ID);
        now.setHours(0, 0, 0, 0);
        now.setMonth(now.getMonth() - (m - 1), 0);
        return this.getLastMondayOfMonth(now.getMonth(), now.getFullYear());
      })
      .reverse();
    const [, seasonStart, seasonEnd] = seasonIds;
    const [prevSeasonStart, prevSeasonEnd] = seasonIds;

    const result = await this.client.db
      .collection(Collections.LEGEND_ATTACKS)
      .aggregate<{
        _id: string;
        logs: {
          timestamp: Date;
          trophies: number | null;
        }[];
        avgGain: number;
        avgOffense: number;
        avgDefense: number;
      }>([
        {
          $match: {
            tag: data.tag,
            seasonId: {
              $in: seasonIds.map((id) => Season.generateID(id))
            }
          }
        },
        {
          $unwind: {
            path: '$logs'
          }
        },
        {
          $set: {
            ts: {
              $toDate: '$logs.timestamp'
            }
          }
        },
        {
          $set: {
            ts: {
              $dateTrunc: {
                date: '$ts',
                unit: 'day',
                timezone: '-05:00'
              }
            }
          }
        },
        {
          $sort: {
            ts: 1
          }
        },
        {
          $addFields: {
            gain: {
              $subtract: ['$logs.end', '$logs.start']
            },
            offense: {
              $cond: {
                if: {
                  $gt: ['$logs.inc', 0]
                },
                then: '$logs.inc',
                else: 0
              }
            },
            defense: {
              $cond: {
                if: {
                  $lte: ['$logs.inc', 0]
                },
                then: '$logs.inc',
                else: 0
              }
            }
          }
        },
        {
          $group: {
            _id: '$ts',
            seasonId: {
              $first: '$seasonId'
            },
            trophies: {
              $last: '$logs.end'
            },
            gain: {
              $sum: '$gain'
            },
            offense: {
              $sum: '$offense'
            },
            defense: {
              $sum: '$defense'
            }
          }
        },
        {
          $sort: {
            _id: 1
          }
        },
        {
          $group: {
            _id: '$seasonId',
            logs: {
              $push: {
                timestamp: '$_id',
                trophies: '$trophies'
              }
            },
            avgGain: {
              $avg: '$gain'
            },
            avgDefense: {
              $avg: '$defense'
            },
            avgOffense: {
              $avg: '$offense'
            }
          }
        },
        {
          $sort: {
            _id: -1
          }
        }
      ])
      .toArray();
    if (!result.length) return null;

    const season = result.at(0)!;
    const prevSeason = result.at(1);
    const prevFinalTrophies = prevSeason?.logs.at(-1)?.trophies ?? '';

    if (season._id !== Season.ID) return null;

    const labels = Array.from({ length: moment(seasonEnd).diff(seasonStart, 'days') + 1 }, (_, i) =>
      moment(seasonStart).add(i, 'days').toDate()
    );

    const prevLabels = Array.from({ length: moment(prevSeasonEnd).diff(prevSeasonStart, 'days') + 1 }, (_, i) =>
      moment(prevSeasonStart).add(i, 'days').toDate()
    );

    for (const label of labels) {
      const log = season.logs.find((log) => moment(log.timestamp).isSame(label, 'day'));
      if (!log) season.logs.push({ timestamp: label, trophies: null });
    }
    season.logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (prevSeason) {
      for (const label of prevLabels) {
        const log = prevSeason.logs.find((log) => moment(log.timestamp).isSame(label, 'day'));
        if (!log) prevSeason.logs.push({ timestamp: label, trophies: null });
      }
      prevSeason.logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      // if (prevSeason.logs.length > season.logs.length) {
      // 	prevSeason.logs = randomlySelectItems(prevSeason.logs, season.logs.length);
      // }
    }

    const res = await fetch(`${process.env.ASSET_API_BACKEND!}/legends/graph`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        datasets: result.slice(0, 2),
        labels,
        name: data.name,
        avgNetGain: this.formatNumber(season.avgGain),
        avgOffense: this.formatNumber(season.avgOffense),
        avgDefense: this.formatNumber(season.avgDefense),
        prevAvgNetGain: prevSeason ? this.formatNumber(prevSeason.avgGain) : '',
        prevAvgOffense: prevSeason ? this.formatNumber(prevSeason.avgOffense) : '',
        prevAvgDefense: prevSeason ? this.formatNumber(prevSeason.avgDefense) : '',
        townHall: data.townHallLevel.toString(),
        prevFinalTrophies,
        prevSeason: prevSeason ? `${moment(prevSeason._id).format('MMM')}` : '',
        currentTrophies: data.trophies.toFixed(0),
        clanName: data.clan?.name,
        clanBadgeURL: data.clan?.badgeUrls.large,
        season: `${moment(season._id).format('MMMM YYYY')} (${moment(seasonStart).format('DD MMM')} - ${moment(seasonEnd).format(
          'DD MMM'
        )})`
      })
    }).then((res) => res.json());
    return `${process.env.ASSET_API_BACKEND!}/${(res as any).id as string}`;
  }

  private async logs(data: APIPlayer) {
    const seasonId = Season.ID;
    const legend = await this.client.db.collection<LegendAttacks>(Collections.LEGEND_ATTACKS).findOne({ tag: data.tag, seasonId });

    const logs = legend?.logs ?? [];

    const days = Util.getLegendDays();

    const perDayLogs = days.reduce<
      { attackCount: number; defenseCount: number; gain: number; loss: number; final: number; initial: number }[]
    >((prev, { startTime, endTime }) => {
      const mixedLogs = logs.filter((atk) => atk.timestamp >= startTime && atk.timestamp <= endTime);
      const attacks = mixedLogs.filter((en) => en.inc > 0) ?? [];
      const defenses = mixedLogs.filter((en) => en.inc <= 0) ?? [];

      const attackCount = attacks.length;
      const defenseCount = defenses.length;
      const [final] = mixedLogs.slice(-1);
      const [initial] = mixedLogs;

      const gain = attacks.reduce((acc, cur) => acc + cur.inc, 0);
      const loss = defenses.reduce((acc, cur) => acc + cur.inc, 0);

      prev.push({ attackCount, defenseCount, gain, loss, final: final?.end ?? '-', initial: initial?.start ?? '-' });
      return prev;
    }, []);

    const weaponLevel = data.townHallWeaponLevel ? ATTACK_COUNTS[data.townHallWeaponLevel] : '';
    const logDescription =
      perDayLogs.length >= 32
        ? [
            '```',
            'DAY   ATK    DEF   +/-   INIT  FINAL ',
            ...perDayLogs.map((day, i) => {
              const net = day.gain + day.loss;
              const def = this.pad(`-${Math.abs(day.loss)}${ATTACK_COUNTS[Math.min(9, day.defenseCount)]}`, 5);
              const atk = this.pad(`+${day.gain}${ATTACK_COUNTS[Math.min(9, day.attackCount)]}`, 5);
              const ng = this.pad(`${net > 0 ? '+' : ''}${net}`, 4);
              const final = this.pad(day.final, 4);
              const init = this.pad(day.initial, 5);
              const n = (i + 1).toString().padStart(2, ' ');
              return `\u200e${n}  ${atk}  ${def}  ${ng}  ${init}  ${final}`;
            }),
            '```'
          ]
        : [
            '`DAY` `  ATK ` `  DEF ` ` +/- ` ` INIT ` `FINAL `',
            ...perDayLogs.map((day, i) => {
              const net = day.gain + day.loss;
              const def = this.pad(`-${Math.abs(day.loss)}${ATTACK_COUNTS[Math.min(9, day.defenseCount)]}`, 5);
              const atk = this.pad(`+${day.gain}${ATTACK_COUNTS[Math.min(9, day.attackCount)]}`, 5);
              const ng = this.pad(`${net > 0 ? '+' : ''}${net}`, 4);
              const final = this.pad(day.final, 4);
              const init = this.pad(day.initial, 5);
              const n = (i + 1).toString().padStart(2, ' ');
              return `\`\u200e${n} \` \`${atk} \` \`${def} \` \`${ng} \` \`${init} \` \` ${final} \``;
            })
          ];

    const description = [
      ...[
        `${TOWN_HALLS[data.townHallLevel]} **${data.townHallLevel}${weaponLevel}** ${
          data.league?.id === 29000022 ? EMOJIS.LEGEND_LEAGUE : EMOJIS.TROPHY
        } **${data.trophies}**`,
        ''
      ],
      `**Legend Season Logs (${Season.ID})**`,
      `- ${data.attackWins} ${Util.plural(data.attackWins, 'attack')} and ${data.defenseWins} ${Util.plural(
        data.defenseWins,
        'defense'
      )} won`,
      '',
      logDescription.join('\n')
    ].join('\n');

    const embed = new EmbedBuilder()
      .setTitle(`${escapeMarkdown(data.name)} (${data.tag})`)
      .setURL(`https://link.clashofclans.com/en?action=OpenPlayerProfile&tag=${encodeURIComponent(data.tag)}`);
    embed.setDescription(description);

    const url = await this.graph(data);
    if (url) embed.setImage(url);

    return embed;
  }

  private pad(num: number | string, padding = 4) {
    return num.toString().padStart(padding, ' ');
  }

  private formatNumber(num: number) {
    return `${num > 0 ? '+' : ''}${num.toFixed(0)}`;
  }

  private getLastMondayOfMonth(month: number, year: number): Date {
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const lastMonday = new Date(lastDayOfMonth);
    lastMonday.setDate(lastMonday.getDate() - ((lastMonday.getDay() + 6) % 7));
    lastMonday.setHours(5, 0, 0, 0);
    // if (date.getTime() > lastMonday.getTime()) {
    // 	return this.getLastMondayOfMonth(month + 1, year, date);
    // }
    return lastMonday;
  }
}

export interface LogType {
  start: number;
  end: number;
  timestamp: number;
  inc: number;
  type?: string;
}

export interface LegendAttacksAggregated {
  _id: string;
  logs: {
    timestamp: Date;
    trophies: number | null;
  }[];
  avgGain: number;
  avgOffense: number;
  avgDefense: number;
}
