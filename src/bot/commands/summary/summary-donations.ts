import { APIClan } from 'clashofclans.js';
import {
  ActionRowBuilder,
  BaseInteraction,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  StringSelectMenuBuilder,
  embedLength
} from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/constants.js';
import { BLUE_NUMBERS, EMOJIS, ORANGE_NUMBERS } from '../../util/emojis.js';
import { recoverDonations } from '../../util/helper.js';
import { Season, Util } from '../../util/index.js';

export default class DonationSummaryCommand extends Command {
  public constructor() {
    super('summary-donations', {
      category: 'none',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>,
    args: { season?: string; clans?: string; sort_by?: SortType[]; order_by?: OrderType; clans_only?: boolean }
  ) {
    const season = args.season ?? Season.ID;

    const { clans, resolvedArgs } = await this.client.storage.handleSearch(interaction, { args: args.clans });
    if (!clans) return;

    const fetched = await this.client.http._getClans(clans);
    if (!fetched.length) {
      return interaction.editReply(this.i18n('common.fetch_failed', { lng: interaction.locale }));
    }

    await Promise.allSettled(fetched.map((clan) => recoverDonations(clan)));
    const [topClansEmbed, topPlayersEmbed] = await Promise.all([
      this.clanDonations(interaction, {
        clans: fetched,
        seasonId: season,
        sortBy: args.sort_by,
        orderBy: args.order_by
      }),
      this.playerDonations(interaction, {
        clans: fetched,
        seasonId: season,
        sortBy: args.sort_by,
        orderBy: args.order_by
      })
    ]);

    const payload = {
      cmd: this.id,
      clans: resolvedArgs,
      season: args.season,
      sort_by: args.sort_by,
      order_by: args.order_by,
      clans_only: args.clans_only
    };

    const customId = {
      orderBy: this.createId({ ...payload, string_key: 'order_by' }),
      sortBy: this.createId({ ...payload, array_key: 'sort_by' }),
      refresh: this.createId(payload),
      toggle: this.createId({ ...payload, clans_only: !args.clans_only })
    };

    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Secondary).setCustomId(customId.refresh).setEmoji(EMOJIS.REFRESH)
    );

    const splitted = embedLength(topPlayersEmbed.toJSON()) + embedLength(topClansEmbed.toJSON()) > 6000;
    if (splitted) {
      buttonRow.addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Secondary)
          .setCustomId(customId.toggle)
          .setLabel(args.clans_only ? 'Players Summary' : 'Clans Summary')
      );
    }

    const sortingRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(customId.sortBy)
        .setPlaceholder('Sort by')
        .setMaxValues(2)
        .addOptions([
          {
            label: 'Donations',
            description: 'Sorted by donations',
            value: 'donations',
            default: args.sort_by?.includes('donations')
          },
          {
            label: 'Donations Received',
            description: 'Sorted by donations received',
            value: 'donationsReceived',
            default: args.sort_by?.includes('donationsReceived')
          },
          {
            label: 'Donation Difference',
            description: 'Donation difference and ratio',
            value: 'difference',
            default: args.sort_by?.includes('difference')
          },
          {
            label: 'Town-Hall Level',
            description: 'Sorted by Town-Hall level',
            value: 'townHallLevel',
            default: args.sort_by?.includes('townHallLevel')
          }
        ])
    );

    const orderingRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(customId.orderBy)
        .setPlaceholder('Order by')
        .addOptions([
          {
            label: 'Descending',
            description: 'High to Low',
            value: 'desc',
            default: args.order_by === 'desc'
          },
          {
            label: 'Ascending',
            description: 'Low to High',
            value: 'asc',
            default: args.order_by === 'asc'
          }
        ])
    );

    return interaction.editReply({
      embeds: splitted ? [args.clans_only ? topClansEmbed : topPlayersEmbed] : [topClansEmbed, topPlayersEmbed],
      components: [buttonRow, sortingRow, orderingRow]
    });
  }

  private donation(num: number, space: number) {
    return num.toString().padStart(space, ' ');
  }

  private predict(num: number) {
    return num > 999999 ? 7 : num > 99999 ? 6 : 5;
  }

  private async clanDonations(
    interaction: BaseInteraction<'cached'>,
    {
      clans,
      seasonId,
      sortBy,
      orderBy
    }: {
      clans: APIClan[];
      seasonId: string;
      sortBy?: SortType[];
      orderBy?: OrderType;
    }
  ) {
    const embed = new EmbedBuilder()
      .setColor(this.client.embed(interaction))
      .setAuthor({ name: `${interaction.guild.name} Top Donations`, iconURL: interaction.guild.iconURL({ forceStatic: false })! });

    const orders = [];
    for (const key of sortBy ?? ['donations']) {
      if (key === 'townHallLevel') {
        orders.push({ $sort: { donations: orderBy === 'asc' ? 1 : -1 } });
      } else {
        orders.push({ $sort: { [key]: orderBy === 'asc' ? 1 : -1 } });
      }
    }

    const aggregated = await this.client.db
      .collection(Collections.PLAYER_SEASONS)
      .aggregate<Aggregated>([
        {
          $match: {
            season: seasonId,
            __clans: { $in: clans.map((clan) => clan.tag) }
          }
        },
        {
          $project: {
            clans: {
              $objectToArray: '$clans'
            },
            name: 1,
            tag: 1
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
            clanName: '$clans.v.name',
            donations: '$clans.v.donations.total',
            donationsReceived: '$clans.v.donationsReceived.total'
          }
        },
        {
          $match: {
            clanTag: {
              $in: clans.map((clan) => clan.tag)
            }
          }
        },
        {
          $group: {
            _id: '$clanTag',
            donations: {
              $sum: '$donations'
            },
            donationsReceived: {
              $sum: '$donationsReceived'
            },
            difference: {
              $sum: {
                $subtract: ['$donations', '$donationsReceived']
              }
            },
            name: {
              $first: '$clanName'
            },
            tag: {
              $first: '$clanTag'
            }
          }
        },
        ...orders
      ])
      .toArray();

    const [clanDp, clanRp] = [
      this.predict(Math.max(...aggregated.map((m) => m.donations))),
      this.predict(Math.max(...aggregated.map((m) => m.donationsReceived)))
    ];

    if (aggregated.length) {
      embed.setDescription(
        [
          '**Top Clans**',
          `${EMOJIS.HASH} \`\u200e${'DON'.padStart(clanDp, ' ')} ${'REC'.padStart(clanRp, ' ')}  ${'CLAN'.padEnd(15, ' ')}\u200f\``,
          Util.splitMessage(
            aggregated
              .map((clan, n) => {
                return `${BLUE_NUMBERS[++n]} \`\u200e${this.donation(clan.donations, clanDp)} ${this.donation(
                  clan.donationsReceived,
                  clanRp
                )}  ${Util.escapeBackTick(clan.name).padEnd(15, ' ')}\u200f\``;
              })
              .join('\n'),
            { maxLength: 4000 }
          )[0]
        ].join('\n')
      );
    }

    return embed;
  }

  private async playerDonations(
    interaction: BaseInteraction<'cached'>,
    {
      clans,
      seasonId,
      sortBy,
      orderBy
    }: {
      clans: APIClan[];
      seasonId: string;
      sortBy?: SortType[];
      orderBy?: OrderType;
    }
  ) {
    const orders = [];
    for (const key of sortBy ?? ['donations']) orders.push({ $sort: { [key]: orderBy === 'asc' ? 1 : -1 } });

    let members = await this.client.db
      .collection(Collections.PLAYER_SEASONS)
      .aggregate<{
        name: string;
        tag: string;
        donations: number;
        donationsReceived: number;
        townHallLevel: number;
        difference: number;
      }>([
        {
          $match: {
            __clans: { $in: clans.map((clan) => clan.tag) },
            season: seasonId
          }
        },
        {
          $project: {
            clans: { $objectToArray: '$clans' },
            name: 1,
            tag: 1,
            townHallLevel: 1
          }
        },
        {
          $unwind: { path: '$clans' }
        },
        {
          $project: {
            name: 1,
            tag: 1,
            clanTag: '$clans.v.tag',
            clanName: '$clans.v.name',
            donations: '$clans.v.donations.total',
            townHallLevel: '$townHallLevel',
            donationsReceived: '$clans.v.donationsReceived.total'
          }
        },
        {
          $set: { difference: { $subtract: ['$donations', '$donationsReceived'] } }
        },
        {
          $match: { clanTag: { $in: clans.map((clan) => clan.tag) } }
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
            donations: {
              $sum: '$donations'
            },
            donationsReceived: {
              $sum: '$donationsReceived'
            },
            townHallLevel: {
              $max: '$townHallLevel'
            }
          }
        },
        ...orders,
        {
          $limit: 150
        }
      ])
      .toArray();

    const playerTags = clans.flatMap((clan) => clan.memberList.map((m) => m.tag));
    members = members.filter((m) => playerTags.includes(m.tag)).slice(0, 100);

    const [memDp, memRp] = [
      this.predict(Math.max(...members.map((m) => m.donations))),
      this.predict(Math.max(...members.map((m) => m.donationsReceived)))
    ];

    const embed = new EmbedBuilder()
      .setColor(this.client.embed(interaction))
      .setAuthor({ name: `Donation Leaderboard for ${moment(seasonId).format('MMM YYYY')}` })
      .setFooter({ text: `Season ${moment(seasonId).format('MMM YYYY')}` });

    const isTH = sortBy?.includes('townHallLevel');
    if (members.length) {
      embed.setDescription(
        [
          `${EMOJIS.HASH} \u200e\`${'DON'.padStart(memDp, ' ')} ${'REC'.padStart(memRp, ' ')}  ${'PLAYER'.padEnd(15, ' ')}\u200f\``,
          Util.splitMessage(
            members
              .map((mem, i) => {
                const icon = (isTH ? ORANGE_NUMBERS : BLUE_NUMBERS)[isTH ? mem.townHallLevel : i + 1];
                const don = this.donation(mem.donations, memDp);
                const rec = this.donation(mem.donationsReceived, memRp);
                return `${icon} \`\u200e${don} ${rec}  ${Util.escapeBackTick(mem.name).padEnd(15, ' ')}\u200f\``;
              })
              .join('\n'),
            { maxLength: 4000 }
          )[0]
        ].join('\n')
      );
    }
    return embed;
  }
}

interface Aggregated {
  tag: string;
  name: string;
  donations: number;
  donationsReceived: number;
  difference: number;
  // members: {
  // 	tag: string;
  // 	name: string;
  // 	clanTag: string;
  // 	donations: number;
  // 	donationsReceived: number;
  // }[];
}

type SortType = 'donations' | 'donationsReceived' | 'difference' | 'townHallLevel';
type OrderType = 'asc' | 'desc';
