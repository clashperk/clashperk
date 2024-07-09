import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  StringSelectMenuBuilder,
  embedLength,
  escapeMarkdown
} from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/constants.js';
import { BLUE_NUMBERS, EMOJIS } from '../../util/emojis.js';
import { Season, Util } from '../../util/index.js';

interface AggregatedValue {
  name: string;
  tag: string;
  value: number;
}

interface AggregatedResult {
  _elixirLoot: AggregatedValue[];
  _goldLoot: AggregatedValue[];
  _darkLoot: AggregatedValue[];
  _troops: AggregatedValue[];
  _spells: AggregatedValue[];
  _sieges: AggregatedValue[];
  _warStars: AggregatedValue[];
  _cwlStars: AggregatedValue[];
  _clanGamesPoints: AggregatedValue[];
  _clanGamesCompletionTime: AggregatedValue[];
  _trophiesGained: AggregatedValue[];
  _trophies: AggregatedValue[];
  _versusTrophies: AggregatedValue[];
  _versusAttackWins: AggregatedValue[];
  _capitalLoot: AggregatedValue[];
  _capitalDonations: AggregatedValue[];
  _attackWins: AggregatedValue[];
  _defenseWins: AggregatedValue[];
  _score: AggregatedValue[];
  _donations: AggregatedValue[];
}

const fields = {
  _goldLoot: `${EMOJIS.GOLD} Gold Loot`,
  _elixirLoot: `${EMOJIS.ELIXIR} Elixir Loot`,
  _darkLoot: `${EMOJIS.DARK_ELIXIR} Dark Elixir Loot`,
  _score: `${EMOJIS.ACTIVITY} Activity Score`,

  _donations: `${EMOJIS.TROOPS_DONATE} Donations`,
  _attackWins: `${EMOJIS.SWORD} Attack Wins`,
  // _defenseWins: `${EMOJIS.SHIELD} Defense Wins`,
  _versusAttackWins: `${EMOJIS.CROSS_SWORD} Versus Attack Wins`,

  _trophiesGained: `${EMOJIS.TROPHY} Trophies Gained`,
  _trophies: `${EMOJIS.TROPHY} Current Trophies`,
  _versusTrophies: `${EMOJIS.BB_TROPHY} Builder Base Trophies`,
  _warStars: `${EMOJIS.WAR_STAR} War Stars`,
  // _cwlStars: `${EMOJIS.STAR} CWL Stars`,

  // _troops: "",
  // _spells: "",
  // _sieges: "",

  _capitalLoot: `${EMOJIS.CAPITAL_GOLD} Capital Gold Loot`,
  _capitalDonations: `${EMOJIS.CAPITAL_GOLD} Capital Gold Contribution`,
  _clanGamesPoints: `${EMOJIS.CLAN_GAMES} Clan Games Points`,
  _clanGamesCompletionTime: `${EMOJIS.CLAN_GAMES} Fastest Clan Games Completion`
};

export default class SummaryBestCommand extends Command {
  public constructor() {
    super('summary-best', {
      category: 'none',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>,
    args: { season?: string; limit?: number; clans?: string; order?: 'asc' | 'desc'; selected?: string[] }
  ) {
    const seasonId = args.season ?? Season.ID;
    const { clans, resolvedArgs } = await this.client.storage.handleSearch(interaction, { args: args.clans });
    if (!clans) return;

    const _clans = await this.client.redis.getClans(clans.map((clan) => clan.tag));
    const members = _clans.map((clan) => clan.memberList.map((m) => m.tag)).flat();

    const _clanGamesStartTimestamp = moment(seasonId).add(21, 'days').hour(8).toDate().getTime();
    const order = args.order ?? 'desc';

    const aggregated = await this.client.db
      .collection(Collections.PLAYER_SEASONS)
      .aggregate<AggregatedResult>([
        {
          $match: {
            __clans: { $in: clans.map((c) => c.tag) },
            season: seasonId,
            tag: { $in: members }
          }
        },
        {
          $project: {
            name: 1,
            tag: 1,
            _elixirLoot: {
              $subtract: ['$elixirLoots.current', '$elixirLoots.initial']
            },
            _goldLoot: {
              $subtract: ['$goldLoots.current', '$goldLoots.initial']
            },
            _darkLoot: {
              $subtract: ['$darkElixirLoots.current', '$darkElixirLoots.initial']
            },
            _troops: {
              $subtract: ['$troopsDonations.current', '$troopsDonations.initial']
            },
            _spells: {
              $subtract: ['$spellsDonations.current', '$spellsDonations.initial']
            },
            _sieges: {
              $multiply: [{ $subtract: ['$siegeMachinesDonations.current', '$siegeMachinesDonations.initial'] }, 30]
            },
            _warStars: {
              $subtract: ['$clanWarStars.current', '$clanWarStars.initial']
            },
            _cwlStars: {
              $subtract: ['$clanWarLeagueStars.current', '$clanWarLeagueStars.initial']
            },
            _clanGamesPoints: {
              $subtract: ['$clanGamesPoints.current', '$clanGamesPoints.initial']
            },
            _trophiesGained: {
              $subtract: ['$trophies.current', '$trophies.initial']
            },
            _trophies: '$trophies.current',
            // _versusTrophies: {
            // 	$subtract: ['$versusTrophies.current', '$versusTrophies.initial']
            // },
            _versusTrophies: '$versusTrophies.current',
            _versusAttackWins: {
              $max: [{ $subtract: ['$versusBattleWins.current', '$versusBattleWins.initial'] }, '$builderBaseAttacksWon', 0]
            },
            _capitalLoot: {
              $subtract: ['$clanCapitalRaids.current', '$clanCapitalRaids.initial']
            },
            _capitalDonations: {
              $subtract: ['$capitalGoldContributions.current', '$capitalGoldContributions.initial']
            },
            _attackWins: '$attackWins',
            _defenseWins: '$defenseWins',
            clans: {
              $objectToArray: '$clans'
            }
          }
        },
        {
          $lookup: {
            from: Collections.PLAYERS,
            localField: 'tag',
            foreignField: 'tag',
            as: '_score',
            pipeline: [
              {
                $project: {
                  _id: 0,
                  count: `$seasons.${seasonId}`
                }
              }
            ]
          }
        },
        {
          $lookup: {
            from: Collections.CLAN_GAMES_POINTS,
            localField: 'tag',
            foreignField: 'tag',
            as: '_clanGames',
            pipeline: [
              { $match: { season: seasonId } },
              { $set: { clan: { $arrayElemAt: ['$__clans', 0] } } },
              { $match: { clan: { $in: clans.map((c) => c.tag) } } },
              { $project: { current: 1, initial: 1, completedAt: 1 } }
            ]
          }
        },
        {
          $unwind: {
            path: '$_score',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $unwind: {
            path: '$_clanGames',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $set: {
            _clanGamesPoints: {
              $max: [{ $subtract: ['$_clanGames.current', '$_clanGames.initial'] }, 0]
            },
            _clanGamesCompletionTime: {
              $dateDiff: {
                startDate: '$_clanGames.completedAt',
                endDate: '$$NOW',
                unit: 'millisecond'
              }
            },
            _clanGamesCompletedAt: '$_clanGames.completedAt',
            _donations: {
              $sum: ['$_troops', '$_spells', '$_sieges']
            },
            _score: {
              $max: ['$_score.count', 0]
            }
          }
        },
        {
          $sort: {
            tag: 1
          }
        },
        {
          $facet: {
            _elixirLoot: [
              {
                $project: {
                  name: 1,
                  tag: 1,
                  value: '$_elixirLoot'
                }
              },
              {
                $sort: {
                  value: order === 'desc' ? -1 : 1
                }
              },
              {
                $limit: 10
              }
            ],
            _goldLoot: [
              {
                $project: {
                  name: 1,
                  tag: 1,
                  value: '$_goldLoot'
                }
              },
              {
                $sort: {
                  value: order === 'desc' ? -1 : 1
                }
              },
              {
                $limit: 10
              }
            ],
            _darkLoot: [
              {
                $project: {
                  name: 1,
                  tag: 1,
                  value: '$_darkLoot'
                }
              },
              {
                $sort: {
                  value: order === 'desc' ? -1 : 1
                }
              },
              {
                $limit: 10
              }
            ],
            _warStars: [
              {
                $project: {
                  name: 1,
                  tag: 1,
                  value: '$_warStars'
                }
              },
              {
                $sort: {
                  value: order === 'desc' ? -1 : 1
                }
              },
              {
                $limit: 10
              }
            ],
            _cwlStars: [
              {
                $project: {
                  name: 1,
                  tag: 1,
                  value: '$_cwlStars'
                }
              },
              {
                $sort: {
                  value: order === 'desc' ? -1 : 1
                }
              },
              {
                $limit: 10
              }
            ],
            _clanGamesPoints: [
              {
                $project: {
                  name: 1,
                  tag: 1,
                  value: {
                    $max: ['$_clanGamesPoints', 0]
                  }
                }
              },
              {
                $sort: {
                  value: order === 'desc' ? -1 : 1
                }
              },
              {
                $limit: 10
              }
            ],
            _trophiesGained: [
              {
                $project: {
                  name: 1,
                  tag: 1,
                  value: '$_trophiesGained'
                }
              },
              {
                $sort: {
                  value: order === 'desc' ? -1 : 1
                }
              },
              {
                $limit: 10
              }
            ],
            _trophies: [
              {
                $project: {
                  name: 1,
                  tag: 1,
                  value: '$_trophies'
                }
              },
              {
                $sort: {
                  value: order === 'desc' ? -1 : 1
                }
              },
              {
                $limit: 10
              }
            ],
            _versusTrophies: [
              {
                $project: {
                  name: 1,
                  tag: 1,
                  value: '$_versusTrophies'
                }
              },
              {
                $sort: {
                  value: order === 'desc' ? -1 : 1
                }
              },
              {
                $limit: 10
              }
            ],
            _versusAttackWins: [
              {
                $project: {
                  name: 1,
                  tag: 1,
                  value: '$_versusAttackWins'
                }
              },
              {
                $sort: {
                  value: order === 'desc' ? -1 : 1
                }
              },
              {
                $limit: 10
              }
            ],
            _capitalLoot: [
              {
                $project: {
                  name: 1,
                  tag: 1,
                  value: {
                    $max: ['$_capitalLoot', 0]
                  }
                }
              },
              {
                $sort: {
                  value: order === 'desc' ? -1 : 1
                }
              },
              {
                $limit: 10
              }
            ],
            _capitalDonations: [
              {
                $project: {
                  name: 1,
                  tag: 1,
                  value: {
                    $max: ['$_capitalDonations', 0]
                  }
                }
              },
              {
                $sort: {
                  value: order === 'desc' ? -1 : 1
                }
              },
              {
                $limit: 10
              }
            ],
            _defenseWins: [
              {
                $project: {
                  name: 1,
                  tag: 1,
                  value: '$_defenseWins'
                }
              },
              {
                $sort: {
                  value: order === 'desc' ? -1 : 1
                }
              },
              {
                $limit: 10
              }
            ],
            _attackWins: [
              {
                $project: {
                  name: 1,
                  tag: 1,
                  value: '$_attackWins'
                }
              },
              {
                $sort: {
                  value: order === 'desc' ? -1 : 1
                }
              },
              {
                $limit: 10
              }
            ],
            _score: [
              {
                $project: {
                  name: 1,
                  tag: 1,
                  value: '$_score'
                }
              },
              {
                $sort: {
                  value: order === 'desc' ? -1 : 1
                }
              },
              {
                $limit: 10
              }
            ],
            _clanGamesCompletionTime: [
              {
                $match: {
                  _clanGamesCompletedAt: {
                    $exists: true
                  }
                }
              },
              {
                $sort: {
                  _clanGamesCompletionTime: -1
                }
              },
              {
                $project: {
                  name: 1,
                  tag: 1,
                  value: {
                    $dateDiff: {
                      startDate: new Date(_clanGamesStartTimestamp),
                      endDate: '$_clanGamesCompletedAt',
                      unit: 'millisecond'
                    }
                  }
                }
              },
              {
                $match: {
                  value: { $gt: 0 }
                }
              },
              {
                $limit: 10
              }
            ],
            _donations: [
              {
                $unwind: '$clans'
              },
              {
                $project: {
                  name: 1,
                  tag: 1,
                  clan: '$clans.v'
                }
              },
              {
                $match: {
                  'clan.tag': {
                    $in: clans.map((clan) => clan.tag)
                  }
                }
              },
              {
                $group: {
                  _id: '$tag',
                  name: { $first: '$name' },
                  tag: { $first: '$tag' },
                  value: {
                    $sum: '$clan.donations.total'
                  }
                }
              },
              {
                $sort: {
                  value: order === 'desc' ? -1 : 1
                }
              },
              {
                $limit: 10
              }
            ]
          }
        }
      ])
      .next();
    if (!aggregated) {
      return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));
    }

    const embed = new EmbedBuilder()
      .setTimestamp()
      .setColor(this.client.embed(interaction))
      .setFooter({ text: `Season ${seasonId}` })
      .setAuthor({ name: `${interaction.guild.name} Best Players`, iconURL: interaction.guild.iconURL({ forceStatic: false })! });

    const _fields = Object.keys(fields).filter((field) => (field === '_clanGamesCompletionTime' && order === 'asc' ? false : true));
    const filtered = _fields.filter((field) => (args.selected ? args.selected.includes(field) : true));

    for (const field of filtered) {
      const key = field as keyof typeof fields;
      const members = aggregated[key].filter((n) => !isNaN(n.value)).slice(0, Number(args.limit ?? 5));

      if (!members.length) {
        embed.addFields({
          name: fields[key],
          value: 'No data available.'
        });
        continue;
      }

      embed.addFields({
        name: fields[key],
        value: members
          .map((member, n) => {
            const num =
              key === '_clanGamesCompletionTime'
                ? this._formatTime(member.value).padStart(7, ' ')
                : this.formatNumber(key, member.value).padStart(7, ' ');
            return `${BLUE_NUMBERS[n + 1]} \`${num} \` \u200e${escapeMarkdown(member.name)}`;
          })
          .join('\n')
      });

      if (embedLength(embed.toJSON()) > 6000) {
        embed.spliceFields(embed.data.fields!.length - 1, 1);
        break;
      }
    }

    const payload = {
      cmd: this.id,
      season: args.season,
      order: args.order,
      clans: resolvedArgs,
      limit: args.limit,
      selected: args.selected
    };

    const customIds = {
      refresh: this.createId(payload),
      order: this.createId({ ...payload, order: order === 'desc' ? 'asc' : 'desc' }),
      deselect: this.createId({ ...payload, selected: args.selected?.length ? null : [] }),
      selected: this.createId({ ...payload, array_key: 'selected' })
    };

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(customIds.refresh).setEmoji(EMOJIS.REFRESH).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(customIds.order)
        .setStyle(ButtonStyle.Secondary)
        .setLabel(order === 'desc' ? 'Ascending' : 'Descending'),
      new ButtonBuilder()
        .setCustomId(customIds.deselect)
        .setStyle(ButtonStyle.Secondary)
        .setLabel('Full List')
        .setDisabled(!payload.selected?.length)
    );

    const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setPlaceholder('Select fields to Display')
        .setCustomId(customIds.selected)
        .setMaxValues(_fields.length)
        .setMinValues(1)
        .setOptions(
          _fields.map((field) => {
            const labelText = fields[field as keyof typeof fields];
            const emoji = /<a?:.+:(\d+)>/.exec(labelText)?.[1];
            const label = emoji ? labelText.replace(/<a?:.+:(\d+)>/, '').trim() : labelText;
            const selected = args.selected?.includes(field);
            return { label: `${selected ? '' : ''}${label}`, emoji, value: field };
          })
          // .map((option) => ({ ...option, default: args.selected?.includes(option.value) }))
        )
    );

    const isSameSeason = seasonId === Season.ID;
    return interaction.editReply({ embeds: [embed], components: isSameSeason ? [row, menuRow] : [menuRow] });
  }

  private _formatTime(diff: number) {
    if (diff >= 24 * 60 * 60 * 1000) {
      return moment.duration(diff).format('d[d] h[h]', { trim: 'both mid' });
    }
    return moment.duration(diff).format('h[h] m[m]', { trim: 'both mid' });
  }

  private formatNumber(key: keyof typeof fields, value: number) {
    if (key === '_trophies' || key === '_trophiesGained' || key === '_versusTrophies') {
      return (value || 0).toString();
    }
    return Util.formatNumber(value);
  }
}
