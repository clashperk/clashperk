import { APIClan } from 'clashofclans.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  escapeMarkdown,
  Guild,
  Message,
  StringSelectMenuBuilder,
  User
} from 'discord.js';
import { cluster } from 'radash';
import { getClanSwitchingMenu } from '../../helper/clans.helper.js';
import { Command } from '../../lib/index.js';
import { MembersCommandOptions } from '../../util/CommandOptions.js';
import { Collections } from '../../util/Constants.js';
import { CLAN_LABELS, CWL_LEAGUES, EMOJIS, ORANGE_NUMBERS, TOWN_HALLS } from '../../util/Emojis.js';
import { Season } from '../../util/index.js';

const clanTypes: Record<string, string> = {
  inviteOnly: 'Invite Only',
  closed: 'Closed',
  open: 'Anybody Can Join'
};

export default class ClanCommand extends Command {
  public constructor() {
    super('clan', {
      category: 'search',
      channel: 'guild',
      clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
      defer: true
    });
  }

  public async run(message: Message, { tag }: { tag: string }) {
    const { res, body: clan } = await this.client.http.getClan(tag);
    if (!res.ok) return null;
    const embed = await this.embed(message.guild!, clan);
    return message.channel.send({
      embeds: [embed],
      allowedMentions: { repliedUser: false },
      reply: { messageReference: message, failIfNotExists: false }
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; user?: User; with_options?: boolean }) {
    const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
    if (!clan) return;

    const embed = await this.embed(interaction.guild, clan);

    const payload = {
      cmd: this.id,
      tag: clan.tag,
      with_options: args.with_options
    };
    const customIds = {
      option: this.createId({ ...payload, cmd: 'members', string_key: 'option' })
    };

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setEmoji(EMOJIS.REFRESH)
          .setStyle(ButtonStyle.Secondary)
          .setCustomId(JSON.stringify({ cmd: 'clan', tag: clan.tag }))
      )
      .addComponents(new ButtonBuilder().setLabel('Clan Badge').setStyle(ButtonStyle.Link).setURL(clan.badgeUrls.large));

    const menu = new StringSelectMenuBuilder()
      .setPlaceholder('Select an option!')
      .setCustomId(customIds.option)
      .addOptions(
        Object.values(MembersCommandOptions).map((option) => ({
          label: option.label,
          value: option.id,
          description: option.description,
          default: option.id === MembersCommandOptions.clan.id
        }))
      );
    const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
    const clanRow = await getClanSwitchingMenu(interaction, this.createId({ cmd: this.id, string_key: 'tag' }), clan.tag);

    return interaction.editReply({ embeds: [embed], components: clanRow ? [row, menuRow, clanRow] : [row, menuRow] });
  }

  private async embed(guild: Guild, clan: APIClan) {
    const embed = new EmbedBuilder()
      .setTitle(`${escapeMarkdown(clan.name)} (${clan.tag})`)
      .setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(clan.tag)}`)
      .setColor(this.client.embed(guild.id))
      .setThumbnail(clan.badgeUrls.medium);

    const capitalHall = clan.clanCapital.capitalHallLevel ? ` ${EMOJIS.CAPITAL_HALL} **${clan.clanCapital.capitalHallLevel}**` : '';

    embed.setDescription(
      [
        `${EMOJIS.CLAN} **${clan.clanLevel}**${capitalHall} ${EMOJIS.USERS} **${clan.members}** ${EMOJIS.TROPHY} **${clan.clanPoints}** ${EMOJIS.BB_TROPHY} **${clan.clanBuilderBasePoints}**`,
        '',
        `${clan.description}${clan.description ? '\n\n' : ''}${clan.labels.map((d) => `${CLAN_LABELS[d.name]} ${d.name}`).join('\n')}`
      ].join('\n')
    );

    const location = clan.location
      ? clan.location.isCountry
        ? `:flag_${clan.location.countryCode!.toLowerCase()}: ${clan.location.name}`
        : `🌐 ${clan.location.name}`
      : `${EMOJIS.WRONG} None`;

    const leader = clan.memberList.filter((m) => m.role === 'leader').map((m) => m.name);
    const rankInfo = await this.clanRank(clan.tag, clan.clanPoints);
    const rank = rankInfo
      ? rankInfo.gain > 0
        ? `\n**Global Rank**\n📈 #${rankInfo.rank} ${EMOJIS.UP_KEY} +${rankInfo.gain}`
        : `\n**Global Rank**\n📈 #${rankInfo.rank} ${EMOJIS.DOWN_KEY} ${rankInfo.gain}`
      : '';

    embed.addFields([
      {
        name: '\u200e',
        value: [
          '**Clan Leader**',
          `${EMOJIS.OWNER} ${leader.length ? `${escapeMarkdown(leader.join(', '))}` : 'No Leader'}`,
          '**Location**',
          `${location}${rank}`,
          '**Requirements**',
          `⚙️ ${clanTypes[clan.type]} ${EMOJIS.TROPHY} ${clan.requiredTrophies} Required ${
            clan.requiredTownhallLevel ? `${EMOJIS.TOWN_HALL} ${clan.requiredTownhallLevel}+` : ''
          }`,
          '\u200b\u2002'
        ].join('\n')
      }
    ]);

    const [action, season, wars] = await Promise.all([this.getActivity(clan), this.getSeason(clan), this.getWars(clan.tag)]);
    const fields = [];
    if (action) {
      fields.push(
        ...[
          '**Daily Average**',
          `${EMOJIS.ACTIVITY} ${action.avgDailyActivity.toFixed()} Activities`,
          `${EMOJIS.USER_BLUE} ${action.avgDailyOnline.toFixed()} Active Members`
        ]
      );
    }
    if (season) {
      fields.push(
        ...[
          '**Total Attacks**',
          `${EMOJIS.SWORD} ${season.attackWins} ${EMOJIS.SHIELD} ${season.defenseWins}`,
          '**Total Donations**',
          `${EMOJIS.TROOPS_DONATE} ${season.donations} ${EMOJIS.UP_KEY} ${season.donationsReceived} ${EMOJIS.DOWN_KEY}`
        ]
      );
    }
    if (wars.length) {
      const won = wars.filter((war) => war.result).length;
      const lost = wars.filter((war) => !war.result).length;
      fields.push(...['**Total Wars**', `${EMOJIS.CROSS_SWORD} ${wars.length} Wars ${EMOJIS.OK} ${won} Won ${EMOJIS.WRONG} ${lost} Lost`]);
    }
    if (fields.length) embed.addFields([{ name: `**Season Stats (${Season.ID})**`, value: [...fields, '\u200e'].join('\n') }]);

    embed.addFields([
      {
        name: '**War and League**',
        value: [
          '**War Log**',
          `${clan.isWarLogPublic ? '🔓 Public' : '🔒 Private'}`,
          '**War Performance**',
          `${EMOJIS.OK} ${clan.warWins} Won ${
            clan.isWarLogPublic ? `${EMOJIS.WRONG} ${clan.warLosses!} Lost ${EMOJIS.EMPTY} ${clan.warTies!} Tied` : ''
          }`,
          '**Win Streak**',
          `${'🏅'} ${clan.warWinStreak}`,
          '**War Frequency**',
          clan.warFrequency.toLowerCase() === 'morethanonceperweek'
            ? '🎟️ More Than Once Per Week'
            : `🎟️ ${clan.warFrequency.toLowerCase().replace(/\b(\w)/g, (char) => char.toUpperCase())}`,
          '**War League**',
          `${CWL_LEAGUES[clan.warLeague?.name ?? ''] || EMOJIS.EMPTY} ${clan.warLeague?.name ?? 'Unranked'}`
        ].join('\n')
      }
    ]);

    if (clan.members > 0) {
      const reduced = clan.memberList.reduce<{ [key: string]: number }>((count, member) => {
        const townHall = member.townHallLevel;
        count[townHall] = (count[townHall] || 0) + 1;
        return count;
      }, {});

      const townHalls = Object.entries(reduced)
        .map((arr) => ({ level: Number(arr[0]), total: Number(arr[1]) }))
        .sort((a, b) => b.level - a.level);

      embed.addFields({
        name: `**Town Halls**`,
        value: cluster(townHalls, 3)
          .map((townHalls) => {
            return townHalls.map((th) => `${TOWN_HALLS[th.level]}${ORANGE_NUMBERS[th.total]}\u200b`).join(' ');
          })
          .join('\n')
      });
    }

    return embed;
  }

  private async clanRank(tag: string, clanPoints: number) {
    if (clanPoints >= 50000) {
      const { res, body: clanRank } = await this.client.http.getClanRanks('global');
      if (!res.ok) return null;
      const clan = clanRank.items.find((clan) => clan.tag === tag);
      if (!clan) return null;

      return {
        rank: Number(clan.rank),
        gain: Number(clan.previousRank - clan.rank)
      };
    }
    return null;
  }

  private async getActivity(clan: APIClan): Promise<{ avgDailyActivity: number; avgDailyOnline: number } | null> {
    const body = await this.client.elastic.search<unknown, AggregationsAggregate>({
      index: 'player_activities',
      query: {
        bool: {
          filter: [
            {
              term: {
                clanTag: {
                  value: clan.tag
                }
              }
            },
            {
              range: {
                timestamp: {
                  gte: 'now-30d/d'
                }
              }
            }
          ]
        }
      },
      size: 0,
      aggs: {
        daily_stats: {
          date_histogram: {
            field: 'timestamp',
            calendar_interval: 'day'
          },
          aggs: {
            online_members_count: {
              cardinality: {
                field: 'tag'
              }
            }
          }
        },
        avg_daily_members: {
          avg_bucket: {
            buckets_path: 'daily_stats>online_members_count'
          }
        },
        avg_daily_activity: {
          avg_bucket: {
            buckets_path: 'daily_stats>_count'
          }
        }
      }
    });
    return {
      avgDailyOnline: body.aggregations?.avg_daily_members.value ?? 0,
      avgDailyActivity: body.aggregations?.avg_daily_activity.value ?? 0
    };
  }

  private async getSeason(clan: APIClan) {
    [
      {
        $limit: 100
      },
      {
        $match: {
          __clans: {
            $size: 3
          }
        }
      },
      {
        $project: {
          clans: {
            $objectToArray: '$clans'
          },
          name: 1,
          tag: 1,
          attackWins: 1,
          defenseWins: 1
        }
      },
      {
        $unwind: {
          path: '$clans'
        }
      },
      {
        $project: {
          name: 1,
          tag: 1,
          clanTag: '$clans.v.tag',
          donations: '$clans.v.donations.total',
          donationsReceived: '$clans.v.donationsReceived.total'
        }
      }
    ];
    return this.client.db
      .collection(Collections.PLAYER_SEASONS)
      .aggregate<{ donations: number; donationsReceived: number; attackWins: number; defenseWins: number }>([
        {
          $match: {
            __clans: clan.tag,
            season: Season.ID,
            tag: { $in: clan.memberList.map((m) => m.tag) }
          }
        },
        {
          $project: {
            attackWins: 1,
            defenseWins: 1,
            donations: `$clans.${clan.tag}.donations.total`,
            donationsReceived: `$clans.${clan.tag}.donationsReceived.total`
          }
        },
        {
          $sort: { donations: -1 }
        },
        {
          $limit: 50
        },
        {
          $group: {
            _id: null,
            donations: {
              $sum: '$donations'
            },
            donationsReceived: {
              $sum: '$donationsReceived'
            },
            attackWins: {
              $sum: '$attackWins'
            },
            defenseWins: {
              $sum: '$defenseWins'
            }
          }
        }
      ])
      .next();
  }

  private async getWars(tag: string): Promise<{ result: boolean; stars: number[] }[]> {
    return this.client.db
      .collection(Collections.CLAN_WARS)
      .aggregate<{ result: boolean; stars: number[] }>([
        {
          $match: {
            $or: [{ 'clan.tag': tag }, { 'opponent.tag': tag }],
            state: 'warEnded',
            season: Season.ID
          }
        },
        {
          $set: {
            clan: {
              $cond: [{ $eq: ['$clan.tag', tag] }, '$clan', '$opponent']
            },
            opponent: {
              $cond: [{ $eq: ['$clan.tag', tag] }, '$opponent', '$clan']
            }
          }
        },
        {
          $project: {
            result: {
              $switch: {
                branches: [
                  {
                    case: { $gt: ['$clan.stars', '$opponent.stars'] },
                    then: true
                  },
                  {
                    case: { $lt: ['$clan.stars', '$opponent.stars'] },
                    then: false
                  },
                  {
                    case: { $gt: ['$clan.destructionPercentage', '$opponent.destructionPercentage'] },
                    then: true
                  },
                  {
                    case: { $lt: ['$clan.destructionPercentage', '$opponent.destructionPercentage'] },
                    then: false
                  }
                ],
                default: false
              }
            }
          }
        }
      ])
      .toArray();
  }
}

interface AggregationsAggregate {
  daily_stats: {
    buckets: {
      key_as_string: string;
      key: number;
      doc_count: number;
      online_members_count: {
        value: number;
      };
    }[];
  };
  avg_daily_members: {
    value: number | null;
  };
  avg_daily_activity: {
    value: number | null;
  };
}
