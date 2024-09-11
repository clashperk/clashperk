import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder } from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/constants.js';
import { EMOJIS } from '../../util/emojis.js';
import { Season, Util } from '../../util/index.js';

export default class SummaryCapitalContributionCommand extends Command {
  public constructor() {
    super('summary-capital-contribution', {
      category: 'none',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: { season?: string; week?: string; clans?: string; clans_only?: boolean }
  ) {
    const season = args.season ?? Season.ID;
    const week = args.week;

    const { clans, resolvedArgs } = await this.client.storage.handleSearch(interaction, { args: args.clans });
    if (!clans) return;

    const startWeek = moment(week).utc(true).add(7, 'h').utc().toDate();
    const endWeek = moment(week).utc(true).add(7, 'd').add(7, 'h').toDate();

    const result = await this.client.db
      .collection(Collections.CAPITAL_CONTRIBUTIONS)
      .aggregate<{ clans: { name: string; tag: string; total: number }[]; members: { name: string; tag: string; total: number }[] }>([
        {
          $match: {
            ...(week ? { createdAt: { $gt: startWeek, $lt: endWeek } } : { season: season }),
            'clan.tag': { $in: clans.map((clan) => clan.tag) }
          }
        },
        {
          $addFields: {
            total: {
              $subtract: ['$current', '$initial']
            }
          }
        },
        {
          $facet: {
            clans: [
              {
                $group: {
                  _id: '$clan.tag',
                  total: { $sum: '$total' },
                  name: { $first: '$clan.name' },
                  tag: { $first: '$clan.tag' }
                }
              },
              {
                $sort: {
                  total: -1
                }
              }
            ],
            members: [
              {
                $group: {
                  _id: '$tag',
                  name: { $first: '$name' },
                  tag: { $first: 'tag' },
                  total: { $sum: '$total' }
                }
              },
              {
                $project: {
                  name: 1,
                  tag: 1,
                  total: 1
                }
              },
              {
                $sort: {
                  total: -1
                }
              },
              {
                $limit: 99
              }
            ]
          }
        }
      ])
      .next();

    const clansGroup = result?.clans ?? [];
    const membersGroup = result?.members ?? [];
    const maxPad = Math.max(...clansGroup.map((clan) => clan.total.toString().length));

    const embed = new EmbedBuilder();
    embed.setColor(this.client.embed(interaction));

    if (args.clans_only) {
      embed.setAuthor({ name: `${interaction.guild.name} Capital Contributions` });
      embed.setDescription(
        [
          '```',
          `\u200e #  ${'TOTAL'.padStart(maxPad, ' ')}  NAME`,
          clansGroup
            .map((clan, i) => `${(i + 1).toString().padStart(2, ' ')}  ${clan.total.toString().padStart(maxPad, ' ')}  ${clan.name}`)
            .join('\n'),
          '```'
        ].join('\n')
      );
    } else {
      embed
        .setAuthor({ name: `${interaction.guild.name} Top Contributors` })
        .setDescription(
          [
            `**${this.i18n('command.capital.contribution.title', { lng: interaction.locale })} (${season})**`,
            '```',
            '\u200e #  TOTAL  NAME',
            membersGroup
              .map((mem, i) => `\u200e${(i + 1).toString().padStart(2, ' ')}  ${this.padding(mem.total)}  ${mem.name}`)
              .join('\n'),
            '```'
          ].join('\n')
        );
    }

    if (week) {
      embed.setFooter({ text: `Week ${Util.dateRangeFormat(startWeek, endWeek)}` });
    } else {
      embed.setFooter({ text: `Season ${season}` });
    }

    const payload = {
      cmd: this.id,
      season: args.season,
      week: args.week,
      clans: resolvedArgs,
      clans_only: args.clans_only
    };

    const customIds = {
      refresh: this.createId(payload),
      toggle: this.createId({ ...payload, clans_only: !args.clans_only })
    };

    const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder().setEmoji(EMOJIS.REFRESH).setStyle(ButtonStyle.Secondary).setCustomId(customIds.refresh),
      new ButtonBuilder()
        .setLabel(args.clans_only ? 'Players Summary' : 'Clans Summary')
        .setStyle(ButtonStyle.Secondary)
        .setCustomId(customIds.toggle)
    );

    return interaction.editReply({ embeds: [embed], components: [row] });
  }

  private padding(num: number) {
    return num.toString().padStart(5, ' ');
  }
}
