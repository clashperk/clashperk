import { Collections } from '@app/constants';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  escapeMarkdown
} from 'discord.js';
import moment from 'moment';
import { LegendAttacksEntity } from '../../entities/legend-attacks.entity.js';
import { Command } from '../../lib/index.js';
import { EMOJIS } from '../../util/emojis.js';
import { padStart } from '../../util/helper.js';
import { Season } from '../../util/season.js';
import { Util } from '../../util/util.js';

export default class LegendStreaksCommand extends Command {
  public constructor() {
    super('legend-streaks', {
      category: 'search',
      channel: 'guild',
      clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>,
    args: {
      clans?: string;
      season?: string;
    }
  ) {
    const { clans, resolvedArgs } = await this.client.storage.handleSearch(interaction, { args: args.clans });
    if (!clans) return;

    const seasonId = args.season ?? Season.ID;

    const _clans = await this.client.redis.getClans(clans.map((clan) => clan.tag));
    const playerTags = _clans.flatMap((clan) => clan.memberList.map((member) => member.tag));

    const legends = await this.client.db
      .collection<LegendAttacksEntity>(Collections.LEGEND_ATTACKS)
      .aggregate([
        {
          $match: {
            seasonId: {
              $in: Util.getSeasonIds().slice(0, 3)
            },
            tag: {
              $in: playerTags
            }
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

    const embed = new EmbedBuilder();
    embed.setTitle(`Legend League 3-Star Streaks`);
    embed.setColor(this.client.embed(interaction));
    embed.setDescription(
      legends.map((player, idx) => `\`${padStart(idx + 1, 2)}  ${padStart(player.streak, 3)} \` ${escapeMarkdown(player.name)}`).join('\n')
    );
    embed.setFooter({ text: `Season: ${moment(seasonId).format('MMM YYYY')}` });

    const customIds = {
      refresh: this.createId({ cmd: this.id, clans: resolvedArgs, season: args.season })
    };
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setEmoji(EMOJIS.REFRESH).setStyle(ButtonStyle.Secondary).setCustomId(customIds.refresh)
    );

    return interaction.editReply({ embeds: [embed], components: [row] });
  }
}
