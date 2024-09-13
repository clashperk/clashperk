import {
  ActionRowBuilder,
  AutocompleteInteraction,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  escapeMarkdown,
  time
} from 'discord.js';
import { ObjectId } from 'mongodb';
import { cluster } from 'radash';
import { FlagsEntity } from '../../entities/flags.entity.js';
import { Args, Command } from '../../lib/handlers.js';
import { Collections } from '../../util/constants.js';
import { EMOJIS } from '../../util/emojis.js';
import { hexToNanoId } from '../../util/helper.js';

export default class FlagListCommand extends Command {
  public constructor() {
    super('flag-list', {
      category: 'flag',
      channel: 'guild',
      defer: true
    });
  }

  public args(): Args {
    return {
      export: {
        match: 'BOOLEAN'
      }
    };
  }

  public autocomplete(interaction: AutocompleteInteraction<'cached'>, args: { player_tag?: string }) {
    return this.client.autocomplete.flagSearchAutoComplete(interaction, args);
  }

  private async resolveTags(guildId: string, clans?: string) {
    if (!clans) return [];
    if (clans === '*') return this.client.storage.find(guildId);
    return this.client.storage.search(guildId, await this.client.resolver.resolveArgs(clans));
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: { flag_type: 'strike' | 'ban'; player_tag?: string; clans?: string; group_by_players?: boolean; page?: number }
  ) {
    // Delete expired flags.
    this.deleteExpiredFlags(interaction.guildId);

    const _clanTags = (await this.resolveTags(interaction.guildId, args.clans)).map((clan) => clan.tag);
    const _clans = _clanTags.length ? await this.client.redis.getClans(_clanTags) : [];
    const playerTags = _clans.map((clan) => clan.memberList.map((mem) => mem.tag)).flat();

    if (args.player_tag) return this.filterByPlayerTag(interaction, args);

    if (args.group_by_players) return this.groupByPlayerTag(interaction, { ...args, playerTags, clans: _clanTags });
    return this.flagList(interaction, { ...args, playerTags, clans: _clanTags });
  }

  public async flagList(
    interaction: CommandInteraction<'cached'>,
    args: { flag_type: 'strike' | 'ban'; playerTags: string[]; group_by_players?: boolean; page?: number; clans: string[] }
  ) {
    const result = await this.client.db
      .collection<FlagsEntity>(Collections.FLAGS)
      .aggregate<FlagsEntity>([
        {
          $match: {
            guild: interaction.guild.id,
            flagType: args.flag_type,
            $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
            ...(args.playerTags.length ? { tag: { $in: args.playerTags } } : {})
          }
        },
        {
          $sort: { _id: -1 }
        }
      ])
      .toArray();

    if (!result.length) {
      return interaction.editReply(`No Flags (${args.flag_type === 'strike' ? 'Strike' : 'Ban'} List)`);
    }

    const embeds: EmbedBuilder[] = [];

    cluster(result, 15).forEach((chunk) => {
      const embed = new EmbedBuilder().setColor(this.client.embed(interaction));
      embed.setTitle(`Flags`);
      chunk.forEach((flag, itemIndex) => {
        const reason = `Reason: ${escapeMarkdown(flag.reason.slice(0, 256))}${flag.reason.length > 256 ? '...' : ''}`;
        embed.addFields({
          name: itemIndex === 0 ? `${args.flag_type === 'strike' ? 'Strike' : 'Ban'} List (Total ${result.length})` : '\u200b',
          value: [
            `\u200e[${escapeMarkdown(flag.name)} (${flag.tag})](http://cprk.eu/p/${flag.tag.replace('#', '')})`,
            `Created ${time(flag.createdAt, 'R')}, by ${flag.username}${flag.expiresAt ? `` : ''}`,
            flag.expiresAt ? `Expires on ${time(flag.expiresAt, 'd')}\n${reason}` : `${reason}`
          ].join('\n')
        });
      });
      if (args.playerTags.length) embed.setFooter({ text: `^clans filter applied` });
      embeds.push(embed);
    });

    return this.dynamicPagination(interaction, embeds, args);
  }

  private async groupByPlayerTag(
    interaction: CommandInteraction<'cached'>,
    args: { flag_type: 'ban' | 'strike'; playerTags: string[]; clans: string[] }
  ) {
    const result = await this.client.db
      .collection<FlagsEntity>(Collections.FLAGS)
      .aggregate<{
        name: string;
        tag: string;
        user: string;
        count: number;
        flagImpact: number;
        createdAt: Date;
        flags: { reason: string; userId: string; createdAt: Date; _id: ObjectId }[];
      }>([
        {
          $match: {
            guild: interaction.guild.id,
            flagType: args.flag_type,
            ...(args.playerTags.length ? { tag: { $in: args.playerTags } } : {})
          }
        },
        {
          $sort: { _id: -1 }
        },
        {
          $group: {
            _id: '$tag',
            flags: {
              $push: {
                _id: '$_id',
                reason: '$reason',
                userId: '$user',
                flagType: '$flagType',
                createdAt: '$createdAt'
              }
            },
            name: { $last: '$name' },
            tag: { $last: '$tag' },
            user: { $last: '$user' },
            createdAt: { $last: '$createdAt' },
            count: { $sum: 1 },
            flagImpact: { $sum: '$flagImpact' }
          }
        },
        {
          $sort: {
            flagImpact: -1
          }
        }
      ])
      .toArray();

    if (!result.length) {
      return interaction.editReply(`No Flags (${args.flag_type === 'strike' ? 'Strike' : 'Ban'} List)`);
    }

    const embeds: EmbedBuilder[] = [];

    cluster(result, 15).forEach((chunk) => {
      const embed = new EmbedBuilder().setColor(this.client.embed(interaction));
      embed.setTitle(`Flags`);
      chunk.forEach((flag, itemIndex) => {
        embed.addFields({
          name: itemIndex === 0 ? `${args.flag_type === 'strike' ? 'Strike' : 'Ban'} List (Total ${result.length})` : '\u200b',
          value: [
            `\u200e[${escapeMarkdown(flag.name)} (${flag.tag})](http://cprk.eu/p/${flag.tag.replace('#', '')})`,
            `**Total ${flag.count} flag${flag.count === 1 ? '' : 's'}, ${flag.flagImpact} ${args.flag_type}${
              flag.flagImpact === 1 ? '' : 's'
            }**`,
            `**Last ${5} Flags (${flag.count})**`,
            flag.flags
              .slice(0, 5)
              .map(({ createdAt, reason, _id }) => {
                const _reason = reason.slice(0, 100);
                return `${time(createdAt, 'd')} - \`${hexToNanoId(_id)}\` - ${_reason}`;
              })
              .join('\n')
          ].join('\n')
        });
      });
      if (args.playerTags.length) embed.setFooter({ text: `^clans filter applied` });
      embeds.push(embed);
    });

    return this.dynamicPagination(interaction, embeds, args);
  }

  private async filterByPlayerTag(interaction: CommandInteraction<'cached'>, args: { player_tag?: string; flag_type: 'ban' | 'strike' }) {
    const player = await this.client.resolver.resolvePlayer(interaction, args.player_tag);
    if (!player) return;

    const flag = await this.client.db
      .collection<FlagsEntity>(Collections.FLAGS)
      .aggregate<{
        name: string;
        tag: string;
        user: string;
        count: number;
        flagImpact: number;
        createdAt: Date;
        flags: { reason: string; userId: string; createdAt: Date; _id: ObjectId }[];
      }>([
        {
          $match: {
            guild: interaction.guild.id,
            tag: player.tag,
            flagType: args.flag_type
          }
        },
        {
          $sort: { _id: -1 }
        },
        {
          $group: {
            _id: '$tag',
            flags: {
              $push: {
                _id: '$_id',
                reason: '$reason',
                userId: '$user',
                flagType: '$flagType',
                createdAt: '$createdAt'
              }
            },
            name: { $last: '$name' },
            tag: { $last: '$tag' },
            user: { $last: '$user' },
            createdAt: { $last: '$createdAt' },
            count: { $sum: 1 },
            flagImpact: { $sum: '$flagImpact' }
          }
        }
      ])
      .next();

    if (!flag) {
      return interaction.editReply(this.i18n('command.flag.search.not_found', { lng: interaction.locale, tag: player.tag }));
    }

    const embed = new EmbedBuilder()
      .setColor(this.client.embed(interaction))
      .setTitle(`Flags (${args.flag_type === 'strike' ? 'Strike' : 'Ban'} List)`)
      .setDescription(
        [
          `[${player.name} (${player.tag})](http://cprk.eu/p/${player.tag.replace('#', '')})`,
          `Flagged by <@${flag.user}>`,
          '',
          `**Flags (Total ${flag.count})**`,
          flag.flags
            .map(({ createdAt, reason, _id }) => `${time(createdAt, 'd')} - \`${_id.toHexString().slice(-5).toUpperCase()}\` \n${reason}`)
            .join('\n\n')
        ].join('\n')
      )
      .setFooter({ text: `Total ${flag.flagImpact} ${args.flag_type}${flag.flagImpact === 1 ? '' : 's'}` });

    return interaction.editReply({ embeds: [embed] });
  }

  private async deleteExpiredFlags(guildId: string) {
    await this.client.db
      .collection<FlagsEntity>(Collections.FLAGS)
      .deleteMany({ guild: guildId, $and: [{ expiresAt: { $lt: new Date() } }] });
  }

  private dynamicPagination(
    interaction: CommandInteraction<'cached'>,
    embeds: EmbedBuilder[],
    args: { flag_type: 'ban' | 'strike'; page?: number; group_by_players?: boolean; clans: string[] }
  ) {
    let pageIndex = args.page ?? 0;
    if (pageIndex < 0) pageIndex = embeds.length - 1;
    if (pageIndex >= embeds.length) pageIndex = 0;

    const payload = { cmd: this.id, flag_type: args.flag_type, group_by_players: args.group_by_players, clans: args.clans.join(',') };
    const customIds = {
      refresh: this.createId({ ...payload }),
      group: this.createId({ ...payload, group_by_players: !args.group_by_players }),
      next: this.createId({ ...payload, page: pageIndex + 1 }),
      prev: this.createId({ ...payload, page: pageIndex - 1 }),
      page: this.client.uuid()
    };

    const pagingRow = new ActionRowBuilder<ButtonBuilder>();

    const prevButton = new ButtonBuilder()
      .setCustomId(customIds.prev)
      .setEmoji(EMOJIS.PREVIOUS)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(embeds.length <= 1);

    const nextButton = new ButtonBuilder()
      .setCustomId(customIds.next)
      .setEmoji(EMOJIS.NEXT)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(embeds.length <= 1);

    const pageButton = new ButtonBuilder()
      .setCustomId(customIds.next)
      .setLabel(`${pageIndex + 1}/${embeds.length}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true)
      .setCustomId('disabled');

    if (embeds.length > 0) {
      pagingRow.addComponents(prevButton);
      pagingRow.addComponents(nextButton);
      pagingRow.addComponents(pageButton);
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(customIds.refresh).setEmoji(EMOJIS.REFRESH).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(customIds.group)
        .setLabel(args.group_by_players ? 'List Flags' : 'Group Flags')
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.editReply({ embeds: [embeds[pageIndex]], components: [row, pagingRow] });
  }
}
