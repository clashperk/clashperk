import { APIClan } from 'clashofclans.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, User } from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/index.js';
import { ClanCapitalGoldModel } from '../../types/index.js';
import { Collections } from '../../util/Constants.js';
import { EMOJIS } from '../../util/Emojis.js';
import { Util } from '../../util/index.js';

export default class CapitalContributionCommand extends Command {
  public constructor() {
    super('capital-contribution', {
      category: 'activity',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; week?: string; user?: User }) {
    const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
    if (!clan) return;

    const currentWeekId = this.raidWeek().weekId;
    const weekId = args.week ?? currentWeekId;

    const startWeek = moment(weekId).utc(true).add(7, 'h').utc().toDate();
    const endWeek = moment(weekId).utc(true).add(7, 'd').add(7, 'h').toDate();
    const weekend = Util.raidWeekDateFormat(startWeek, endWeek);

    const contributions = await this.client.db
      .collection(Collections.CAPITAL_CONTRIBUTIONS)
      .aggregate<ClanCapitalGoldModel & { total: number }>([
        {
          $match: {
            'clan.tag': clan.tag
            // 'tag': { $in: clan.memberList.map((clan) => clan.tag) }
          }
        },
        {
          $match: {
            createdAt: {
              $gt: startWeek,
              $lt: endWeek
            }
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
          $group: {
            _id: '$tag',
            name: {
              $first: '$name'
            },
            tag: {
              $first: '$tag'
            },
            total: {
              $sum: '$total'
            }
          }
        },
        {
          $sort: {
            total: -1
          }
        }
      ])
      .toArray();

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Secondary)
          .setEmoji(EMOJIS.REFRESH)
          .setCustomId(JSON.stringify({ cmd: this.id, tag: clan.tag, week: weekId }))
      )
      .addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel('View Contribution Logs')
          .setURL(`https://app.clashperk.com/capital/${encodeURIComponent(clan.tag)}`)
      );

    const embed = this.getCapitalContributionsEmbed({ clan, weekId: weekend, contributions, locale: interaction.locale });
    return interaction.editReply({ embeds: [embed], components: [row] });
  }

  private getCapitalContributionsEmbed({
    clan,
    weekId,
    contributions,
    locale
  }: {
    clan: APIClan;
    weekId: string;
    locale: string;
    contributions: (ClanCapitalGoldModel & { total: number })[];
  }) {
    const members: { name: string; raids: number }[] = [];
    clan.memberList.forEach((member) => {
      const attack = contributions.find((attack) => attack.tag === member.tag);
      if (attack) members.push({ name: member.name, raids: attack.total });
      else members.push({ name: member.name, raids: 0 });
    });

    members.sort((a, b) => b.raids - a.raids);
    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${clan.name} (${clan.tag})`,
        iconURL: clan.badgeUrls.small
      })
      .setDescription(
        [
          `**${this.i18n('command.capital.contribution.title', { lng: locale })}**`,
          '```',
          '\u200e #  TOTAL  NAME',
          members.map((mem, i) => `\u200e${(i + 1).toString().padStart(2, ' ')}  ${this.padding(mem.raids)}  ${mem.name}`).join('\n'),
          '```'
        ].join('\n')
      )
      .setTimestamp()
      .setFooter({ text: `Week of ${weekId}` });

    return embed;
  }

  private padding(num: number) {
    return num.toString().padStart(5, ' ');
  }

  private raidWeek() {
    const today = new Date();
    const weekDay = today.getUTCDay();
    const hours = today.getUTCHours();
    const isRaidWeek = (weekDay === 5 && hours >= 7) || [0, 6].includes(weekDay) || (weekDay === 1 && hours < 7);
    today.setUTCDate(today.getUTCDate() - today.getUTCDay());
    if (weekDay < 5 || (weekDay <= 5 && hours < 7)) today.setDate(today.getUTCDate() - 7);
    today.setUTCDate(today.getUTCDate() + 5);
    today.setUTCMinutes(0, 0, 0);
    return { weekDate: today, weekId: today.toISOString().slice(0, 10), isRaidWeek };
  }
}
