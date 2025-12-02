import { Collections } from '@app/constants';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder
} from 'discord.js';
import { Command } from '../../lib/handlers.js';
import { EMOJIS } from '../../util/emojis.js';
import { escapeBackTick, padStart } from '../../util/helper.js';
import { Util } from '../../util/toolkit.js';

export default class SummaryCapitalRaidsCommand extends Command {
  public constructor() {
    super('summary-capital-raids', {
      category: 'none',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: {
      week?: string;
      clans?: string;
      clans_only?: boolean;
      layout?: 'avg_loot' | 'medals_earned' | 'players_rank';
    }
  ) {
    const { weekId } = this.raidWeek();
    let { week } = args;
    if (!week) week = weekId;

    const { clans, resolvedArgs } = await this.client.storage.handleSearch(interaction, {
      args: args.clans
    });
    if (!clans) return;

    const { clansGroup, membersGroup } = await this.queryFromDB(week, clans);

    args.clans_only ??= clansGroup.length >= 4;

    const maxPad = Math.max(...clansGroup.map((clan) => clan.looted.toString().length));
    const embed = new EmbedBuilder();
    embed.setColor(this.client.embed(interaction));

    if (args.clans_only && args.layout === 'avg_loot') {
      embed.setAuthor({ name: `Capital Raids Leaderboard (${week})` });
      embed.setDescription(
        [
          `\` # ${padStart('LOOT', maxPad)} HIT  AVG\` \u200b **NAME**`,
          ...clansGroup.map((clan, idx) => {
            const looted = padStart(clan.looted.toFixed(0), maxPad);
            const attacks = padStart(clan.attacks, 3);
            const hit = padStart((clan.looted ? clan.looted / clan.attacks : 0).toFixed(0), 4);
            const _clan = `[${clan.name}](http://cprk.us/c/${clan.tag.replace('#', '')})`;
            return `\`${padStart(idx + 1, 2)} ${looted} ${attacks} ${hit}\` \u200b \u200e${_clan}`;
          })
        ].join('\n')
      );
    } else if (args.clans_only && args.layout === 'players_rank') {
      embed.setAuthor({ name: `Capital Raids Leaderboard (${week})` });
      embed.setDescription(
        [
          `\` # PLAYERS ${padStart('LOOTED', 6)}\` \u200b **NAME**`,
          ...clansGroup.map((clan, i) => {
            const looted = padStart(Util.formatNumber(clan.looted, 1), 6);
            const players = padStart(`${clan.players}/50`, 6);
            const _clan = `[${clan.name}](http://cprk.us/c/${clan.tag.replace('#', '')})`;
            return `\`${padStart(i + 1, 2)} ${players}  ${looted}\` \u200b \u200e${_clan}`;
          })
        ].join('\n')
      );
    } else if (args.clans_only && args.layout === 'medals_earned') {
      embed.setAuthor({ name: `Capital Raids Leaderboard (${week})` });
      embed.setDescription(
        [
          `\` # ${padStart('LOOT', 6)} HIT MEDAL\` \u200b **NAME**`,
          ...clansGroup.map((clan, i) => {
            const looted = padStart(Util.formatNumber(clan.looted, 1), 6);
            const attacks = padStart(clan.attacks, 3);
            const medals = padStart(clan.medals.toFixed(0), 5);
            const _clan = `[${clan.name}](http://cprk.us/c/${clan.tag.replace('#', '')})`;
            return `\`${padStart(i + 1, 2)} ${looted} ${attacks} ${medals}\` \u200b \u200e${_clan}`;
          })
        ].join('\n')
      );
    } else {
      embed.setAuthor({ name: `Top Capital Looters (${week})` });
      embed.setDescription(
        [
          '\` #   LOOT  HIT \` \u200b **NAME**',
          ...membersGroup.map((mem, i) => {
            const looted = this.padding(mem.capitalResourcesLooted);
            return `\`${padStart(i + 1, 2)}  ${looted}  ${mem.attacks}/${mem.attackLimit} \` \u200b \u200e${escapeBackTick(mem.name)}`;
          })
        ].join('\n')
      );
    }
    embed.setFooter({ text: `Week ${week}` });
    embed.setTimestamp();

    const payload = {
      cmd: this.id,
      clans: resolvedArgs,
      week: args.week,
      clans_only: args.clans_only,
      layout: args.layout
    };

    const customIds = {
      refresh: this.createId(payload),
      layout: this.createId({
        ...payload,
        layout:
          args.layout === 'avg_loot'
            ? 'players_rank'
            : args.layout === 'medals_earned'
              ? 'avg_loot'
              : 'medals_earned',
        clans_only: true
      }),
      toggle: this.createId({ ...payload, clans_only: !args.clans_only })
    };

    const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder()
        .setEmoji(EMOJIS.REFRESH)
        .setStyle(ButtonStyle.Secondary)
        .setCustomId(customIds.refresh),
      new ButtonBuilder()
        .setLabel(args.clans_only ? 'Players Summary' : 'Clans Summary')
        .setStyle(ButtonStyle.Primary)
        .setCustomId(customIds.toggle)
    );

    if (args.clans_only) {
      row.addComponents(
        new ButtonBuilder()
          .setLabel(
            args.layout === 'avg_loot'
              ? 'Participation'
              : args.layout === 'medals_earned'
                ? 'Avg. Loot/Hit'
                : 'Loot/Hit/Medals'
          )
          .setStyle(ButtonStyle.Secondary)
          .setCustomId(customIds.layout)
      );
    }

    return interaction.editReply({ embeds: [embed], components: [row] });
  }

  private async queryFromDB(weekId: string, clans: { tag: string; name: string }[]) {
    const result = await this.client.db
      .collection(Collections.CAPITAL_RAID_SEASONS)
      .aggregate<{
        clans: {
          name: string;
          tag: string;
          attacks: number;
          looted: number;
          attackLimit: number;
          medals: number;
          players: number;
        }[];
        members: {
          name: string;
          tag: string;
          attacks: number;
          attackLimit: number;
          capitalResourcesLooted: number;
        }[];
      }>([
        {
          $match: {
            weekId,
            tag: { $in: clans.map((clan) => clan.tag) }
          }
        },
        {
          $facet: {
            clans: [
              {
                $project: {
                  name: 1,
                  tag: 1,
                  looted: {
                    $sum: '$members.capitalResourcesLooted'
                  },
                  attacks: {
                    $sum: '$members.attacks'
                  },
                  attackLimit: {
                    $sum: '$members.attackLimit'
                  },
                  medals: {
                    $sum: [{ $multiply: ['$offensiveReward', 6] }, '$defensiveReward']
                  },
                  players: {
                    $size: '$members'
                  }
                }
              },
              {
                $sort: {
                  looted: -1
                }
              }
            ],
            members: [
              {
                $unwind: {
                  path: '$members'
                }
              },
              {
                $replaceRoot: {
                  newRoot: '$members'
                }
              },
              {
                $project: {
                  name: 1,
                  tag: 1,
                  attacks: 1,
                  attackLimit: {
                    $sum: ['$attackLimit', '$bonusAttackLimit']
                  },
                  capitalResourcesLooted: 1
                }
              },
              {
                $sort: {
                  capitalResourcesLooted: -1
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

    return { clansGroup, membersGroup };
  }

  private padding(num: number, pad = 5) {
    return num.toString().padStart(pad, ' ');
  }

  private raidWeek() {
    const today = new Date();
    const weekDay = today.getUTCDay();
    const hours = today.getUTCHours();
    const isRaidWeek =
      (weekDay === 5 && hours >= 7) || [0, 6].includes(weekDay) || (weekDay === 1 && hours < 7);
    today.setUTCDate(today.getUTCDate() - today.getUTCDay());
    if (weekDay < 5 || (weekDay <= 5 && hours < 7)) today.setDate(today.getUTCDate() - 7);
    today.setUTCDate(today.getUTCDate() + 5);
    today.setUTCMinutes(0, 0, 0);
    return { weekDate: today, weekId: today.toISOString().slice(0, 10), isRaidWeek };
  }
}
