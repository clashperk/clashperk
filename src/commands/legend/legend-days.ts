import { ATTACK_COUNTS, Collections, LEGEND_LEAGUE_ID } from '@app/constants';
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
import { getLegendTimestampAgainstDay } from '../../helper/legends.helper.js';
import { Args, Command } from '../../lib/handlers.js';
import { createLegendGraph } from '../../struct/image-helper.js';
import { EMOJIS, HOME_TROOPS, TOWN_HALLS } from '../../util/emojis.js';
import { padStart, trimTag } from '../../util/helper.js';
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

  public async exec(interaction: CommandInteraction, args: { tag?: string; user?: User; prev?: boolean; day?: number; graph?: boolean }) {
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

    if (data.trophies <= 4900 && data.league?.id !== LEGEND_LEAGUE_ID) {
      return interaction.editReply(`**${data.name} (${data.tag})** is not in the Legend League.`);
    }

    const seasonId = Season.ID;
    const legend = await this.client.db.collection(Collections.LEGEND_ATTACKS).findOne({ tag: data.tag, seasonId });

    if (!legend) {
      return interaction.editReply(
        [`No data available for **${data.name} (${data.tag})**`, `Going forward, Legend statistics will be collected.`].join('\n')
      );
    }

    legend.streak = Math.max(legend.streak, await this.getStreak(data.tag));

    const embed = args.prev
      ? (await this.logs(data)).setColor(this.client.embed(interaction))
      : (await this.embed(interaction, data, legend, args.day)).setColor(this.client.embed(interaction));

    embed.setTimestamp();
    await interaction.editReply({ embeds: [embed], components: [row], content: null, files: [] });

    const result = args.prev ? await this.graph(data) : null;
    if (result) {
      const rawFile = new AttachmentBuilder(result.file, { name: result.name });
      embed.setImage(result.attachmentKey);
      return interaction.editReply({ embeds: [embed], components: [row], files: [rawFile], content: null });
    }
  }

  private async embed(interaction: CommandInteraction, data: APIPlayer, legend: LegendAttacksEntity, _day?: number) {
    const clan = data.clan ? await this.client.redis.getClan(data.clan.tag) : null;

    const { startTime, endTime, day } = getLegendTimestampAgainstDay(_day);
    const logs = (legend?.logs ?? []).filter((atk) => atk.timestamp >= startTime && atk.timestamp <= endTime);
    const attacks = logs.filter((en) => en.type === 'attack') ?? [];
    const defenses = logs.filter((en) => en.type === 'defense' || (en.type === 'attack' && en.inc === 0)) ?? [];

    const member = (clan?.memberList ?? []).find((en) => en.tag === data.tag);
    const clanRank = member?.clanRank ?? 0;
    const percentage = this.calc(clanRank);

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
            `- Rank in Clan: ${member.clanRank}`,
            `- Clan Points Contribution: ${Math.floor((member.trophies * percentage) / 100)} (${percentage}%)`
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

    const season = this.client.coc.util.getSeason();
    embed.setFooter({ text: `Day ${day}/${moment(season.endTime).diff(season.startTime, 'days')} (${Season.ID})` });
    return embed;
  }

  private async graph(data: APIPlayer) {
    const lastDayEnd = Util.getCurrentLegendTimestamp().startTime;
    const seasonIds = Array(Math.min(3))
      .fill(0)
      .map((_, m) => {
        const now = new Date(Season.ID);
        now.setHours(0, 0, 0, 0);
        now.setMonth(now.getMonth() - (m - 1), 0);
        return Season.getLastMondayOfMonth(now.getMonth(), now.getFullYear());
      })
      .reverse();
    const [, seasonStart, seasonEnd] = seasonIds;
    const [, lastSeasonEnd] = seasonIds;

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
            },
            count: {
              $sum: 1
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
                trophies: '$trophies',
                defense: '$defense',
                offense: '$offense',
                gain: '$gain',
                count: '$count'
              }
            }
          }
        },
        {
          $set: {
            filtered_logs: {
              $filter: {
                input: '$logs',
                as: 'log',
                cond: {
                  $or: [
                    {
                      $lt: [
                        '$$log.timestamp',
                        {
                          $toDate: lastDayEnd
                        }
                      ]
                    },
                    {
                      $gte: ['$$log.count', 16]
                    }
                  ]
                }
              }
            }
          }
        },
        {
          $project: {
            avgOffense: {
              $avg: {
                $cond: {
                  if: {
                    $gt: [{ $size: '$filtered_logs' }, 0]
                  },
                  then: '$filtered_logs.offense',
                  else: '$logs.offense'
                }
              }
            },
            avgDefense: {
              $avg: {
                $cond: {
                  if: {
                    $gt: [{ $size: '$filtered_logs' }, 0]
                  },
                  then: '$filtered_logs.defense',
                  else: '$logs.defense'
                }
              }
            },
            avgGain: {
              $avg: {
                $cond: {
                  if: {
                    $gt: [{ $size: '$filtered_logs' }, 0]
                  },
                  then: '$filtered_logs.gain',
                  else: '$logs.gain'
                }
              }
            },
            logs: 1,
            _id: 1
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
    const seasonId = Season.ID;
    const legend = await this.client.db.collection(Collections.LEGEND_ATTACKS).findOne({ tag: data.tag, seasonId });

    const logs = legend?.logs ?? [];
    const days = Util.getLegendDays();

    const perDayLogs = days.reduce<AggsEntry[]>((prev, { startTime, endTime }) => {
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
              const def = padStart(`-${Math.abs(day.loss)}${ATTACK_COUNTS[Math.min(8, day.defenseCount)]}`, 5);
              const atk = padStart(`+${day.gain}${ATTACK_COUNTS[Math.min(8, day.attackCount)]}`, 5);
              const ng = padStart(`${net > 0 ? '+' : ''}${net}`, 4);
              const final = padStart(day.final, 4);
              const init = padStart(day.initial, 5);
              const n = (i + 1).toString().padStart(2, ' ');
              return `\u200e${n}  ${atk}  ${def}  ${ng}  ${init}  ${final}`;
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
          data.league?.id === 29000022 ? EMOJIS.LEGEND_LEAGUE : EMOJIS.TROPHY
        } **${data.trophies}**`,
        ''
      ],
      `**Legend Season Logs (${Season.ID})**`,
      `- ${data.attackWins} ${pluralize('attack', data.attackWins)} and ${data.defenseWins} ${pluralize('defense', data.defenseWins)} won`,
      '',
      logDescription.join('\n')
    ].join('\n');

    const embed = new EmbedBuilder();
    embed.setTitle(`${escapeMarkdown(data.name)} (${data.tag})`);
    embed.setURL(`http://cprk.us/c/${trimTag(data.tag)}`);
    embed.setDescription(description);

    const season = this.client.coc.util.getSeason();
    embed.setFooter({ text: `Day ${days.length}/${moment(season.endTime).diff(season.startTime, 'days')} (${Season.ID})` });

    return embed;
  }

  private async getStreak(tag: string) {
    const [legend] = await this.client.db
      .collection(Collections.LEGEND_ATTACKS)
      .aggregate<{ name: string; tag: string; streak: number }>([
        {
          $match: {
            seasonId: {
              $in: Util.getSeasonIds().slice(0, 3)
            },
            tag
          }
        },
        {
          $unwind: '$logs'
        },
        {
          $match: {
            'logs.type': 'attack'
          }
        },
        {
          $sort: {
            'logs.timestamp': 1
          }
        },
        {
          $group: {
            _id: '$tag',
            name: {
              $last: '$name'
            },
            logs: {
              $push: '$logs.inc'
            }
          }
        },
        {
          $set: {
            streaks: {
              $reduce: {
                input: '$logs',
                initialValue: {
                  currentStreak: 0,
                  maxStreak: 0
                },
                in: {
                  $cond: [
                    {
                      $eq: ['$$this', 40]
                    },
                    {
                      currentStreak: {
                        $add: ['$$value.currentStreak', 1]
                      },
                      maxStreak: {
                        $max: [
                          '$$value.maxStreak',
                          {
                            $add: ['$$value.currentStreak', 1]
                          }
                        ]
                      }
                    },
                    {
                      currentStreak: 0,
                      maxStreak: 0
                    }
                  ]
                }
              }
            }
          }
        },
        {
          $project: {
            _id: 0,
            tag: '$_id',
            name: '$name',
            streak: {
              $max: '$streaks.maxStreak'
            }
          }
        },
        {
          $sort: {
            streak: -1
          }
        },
        {
          $limit: 99
        }
      ])
      .toArray();
    return legend?.streak ?? 0;
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

  private calc(clanRank: number) {
    if (clanRank >= 41) return 3;
    else if (clanRank >= 31) return 10;
    else if (clanRank >= 21) return 12;
    else if (clanRank >= 11) return 25;
    return 50;
  }
}

interface AggsEntry {
  attackCount: number;
  defenseCount: number;
  gain: number;
  loss: number;
  final: number;
  initial: number;
}
