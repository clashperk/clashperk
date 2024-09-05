import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, StringSelectMenuBuilder, User } from 'discord.js';
import { Args, Command } from '../../lib/index.js';
import { Collections } from '../../util/constants.js';
import { EMOJIS } from '../../util/emojis.js';
import { recoverDonations } from '../../util/helper.js';
import { Season, Util } from '../../util/index.js';
import { PlayerSeasonsEntity } from '@app/entities';

export default class DonationsCommand extends Command {
  public constructor() {
    super('donations', {
      category: 'activity',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public args(): Args {
    return {
      season: {
        match: 'ENUM',
        enums: [...Util.getSeasonIds(), [Util.getLastSeasonId(), 'last']],
        default: Season.ID
      }
    };
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: {
      tag?: string;
      season: string;
      sort_by?: SortKey[];
      order_by?: OrderKey;
      user?: User;
      player_tag?: string;
    }
  ) {
    if ((args.user || args.player_tag) && !interaction.isButton()) {
      return interaction.editReply(`This command option has been replaced with the ${this.client.commands.get('/history')} command.`);
    }

    const { sort_by: sortBy, order_by: orderBy } = args;
    const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
    if (!clan) return;
    if (clan.members < 1) {
      return interaction.editReply(this.i18n('common.no_clan_members', { lng: interaction.locale, clan: clan.name }));
    }

    const season = args.season || Season.ID;
    const isSameSeason = Season.ID === Season.generateID(season);

    await Promise.allSettled([recoverDonations(clan)]);
    const dbMembers = await this.client.db
      .collection<Pick<PlayerSeasonsEntity, 'tag' | 'clans' | 'townHallLevel'>>(Collections.PLAYER_SEASONS)
      .find(
        { season, __clans: clan.tag, tag: { $in: clan.memberList.map((m) => m.tag) } },
        { projection: { tag: 1, clans: 1, townHallLevel: 1 } }
      )
      .toArray();

    if (!dbMembers.length && !isSameSeason) {
      return interaction.editReply(this.i18n('command.donations.no_season_data', { lng: interaction.locale, season }));
    }

    const members: {
      tag: string;
      name: string;
      donated: number;
      received: number;
      townHall: number;
      difference: number;
      ratio: number;
    }[] = [];

    if (isSameSeason) {
      for (const member of clan.memberList.filter((m) => !dbMembers.some((d) => d.tag === m.tag))) {
        const { tag, name, townHallLevel, donations, donationsReceived } = member;
        members.push({
          tag,
          name,
          donated: donations,
          received: donationsReceived,
          townHall: townHallLevel,
          difference: donations - donationsReceived,
          ratio: donationsReceived === 0 ? 0 : donations / donationsReceived
        });
      }
    }

    for (const mem of clan.memberList) {
      const m = dbMembers.find((m) => m.tag === mem.tag);
      if (m) {
        const curr = m.clans?.[clan.tag] ?? { donations: { current: 0, total: 0 }, donationsReceived: { current: 0, total: 0 } };
        let donated = isSameSeason
          ? mem.donations >= curr.donations.current
            ? curr.donations.total + (mem.donations - curr.donations.current)
            : curr.donations.total
          : curr.donations.total;
        donated = Math.max(mem.donations, donated);

        let received = isSameSeason
          ? mem.donationsReceived >= curr.donationsReceived.current
            ? curr.donationsReceived.total + (mem.donationsReceived - curr.donationsReceived.current)
            : curr.donationsReceived.total
          : curr.donationsReceived.total;
        received = Math.max(mem.donationsReceived, received);

        members.push({
          name: mem.name,
          tag: mem.tag,
          townHall: mem.townHallLevel,
          donated,
          received,
          difference: donated - received,
          ratio: received === 0 ? 0 : donated / received
        });
      }
    }

    const receivedMax = Math.max(...members.map((m) => m.received));
    const rs = receivedMax > 99999 ? 6 : receivedMax > 999999 ? 7 : 5;
    const donatedMax = Math.max(...members.map((m) => m.donated));
    const ds = donatedMax > 99999 ? 6 : donatedMax > 999999 ? 7 : 5;

    members.sort((a, b) => b.donated - a.donated);
    const donated = members.reduce((pre, mem) => mem.donated + pre, 0);
    const received = members.reduce((pre, mem) => mem.received + pre, 0);

    for (const sort of sortBy ?? []) {
      members.sort((a, b) => (orderBy === 'asc' ? a[sort] - b[sort] : b[sort] - a[sort]));
    }

    const isTh = sortBy?.includes('townHall');
    const isDiff = sortBy?.includes('difference');
    const getEmbed = () => {
      const embed = new EmbedBuilder()
        .setColor(this.client.embed(interaction))
        .setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.medium });
      if (isDiff) {
        const ds = Math.max(...members.map((m) => m.difference)).toString().length + 1;
        embed.setDescription(
          [
            '```',
            `\u200e # ${'DIFF'.padStart(ds, ' ')} ${'RATIO'.padStart(5, ' ')}  ${'NAME'}`,
            members
              .map((mem, count) => {
                const ratio = mem.ratio.toFixed(2).padStart(5, ' ');
                const name = this.padEnd(mem.name.slice(0, 15));
                const rank = (count + 1).toString().padStart(2, ' ');
                return `${rank} ${this.donation(mem.difference, ds)} ${ratio}  \u200e${name}`;
              })
              .join('\n'),
            '```'
          ].join('\n')
        );
      } else {
        embed.setDescription(
          [
            '```',
            `\u200e${isTh ? 'TH' : ' #'} ${'DON'.padStart(ds, ' ')} ${'REC'.padStart(rs, ' ')}  ${'NAME'}`,
            members
              .map((mem, count) => {
                const donation = `${this.donation(mem.donated, ds)} ${this.donation(mem.received, rs)}`;
                const name = this.padEnd(mem.name.slice(0, 15));
                const thOrIndex = (isTh ? mem.townHall : count + 1).toString().padStart(2, ' ');
                return `${thOrIndex} ${donation}  \u200e${name}`;
              })
              .join('\n'),
            '```'
          ].join('\n')
        );
      }

      return embed.setFooter({ text: `[DON ${donated} | REC ${received}] (Season ${season})` });
    };

    const embed = getEmbed();

    const payload = {
      cmd: this.id,
      tag: clan.tag,
      sort_by: args.sort_by,
      order_by: args.order_by,
      season: args.season
    };
    const customId = {
      order: this.createId({ ...payload, string_key: 'order_by' }),
      sort: this.createId({ ...payload, array_key: 'sort_by' }),
      refresh: this.createId({ ...payload })
    };

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Secondary).setCustomId(customId.refresh).setEmoji(EMOJIS.REFRESH).setDisabled(!isSameSeason)
    );

    const sortingRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(customId.sort)
        .setPlaceholder('Sort by')
        .setMaxValues(2)
        .addOptions([
          {
            label: 'Donations',
            description: 'Sorted by donations',
            value: 'donated',
            default: sortBy?.includes('donated')
          },
          {
            label: 'Donations Received',
            description: 'Sorted by donations received',
            value: 'received',
            default: sortBy?.includes('received')
          },
          {
            label: 'Donation Difference',
            description: 'Donation difference and ratio',
            value: 'difference',
            default: sortBy?.includes('difference')
          },
          {
            label: 'Town-Hall Level',
            description: 'Sorted by Town-Hall level',
            value: 'townHall',
            default: sortBy?.includes('townHall')
          }
        ])
    );

    const orderingRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(customId.order)
        .setPlaceholder('Order by')
        .addOptions([
          {
            label: 'Descending',
            description: 'High to Low',
            value: 'desc',
            default: orderBy === 'desc'
          },
          {
            label: 'Ascending',
            description: 'Low to High',
            value: 'asc',
            default: orderBy === 'asc'
          }
        ])
    );

    return interaction.editReply({ embeds: [embed], components: [row, sortingRow, orderingRow] });
  }

  private padEnd(name: string) {
    return name.replace(/\`/g, '\\');
  }

  private donation(num: number, space: number) {
    return num.toString().padStart(space, ' ');
  }
}

type SortKey = 'donated' | 'received' | 'townHall' | 'difference';
type OrderKey = 'asc' | 'desc';
