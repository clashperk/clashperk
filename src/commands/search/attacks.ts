import { Collections } from '@app/constants';
import { APIClanMember } from 'clashofclans.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, StringSelectMenuBuilder, User } from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/handlers.js';
import { MembersCommandOptions } from '../../util/command.options.js';
import { EMOJIS } from '../../util/emojis.js';
import { Season } from '../../util/toolkit.js';

export default class ClanAttacksCommand extends Command {
  public constructor() {
    super('attacks', {
      category: 'search',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: { tag?: string; user?: User; sort_by_defense?: boolean; with_options?: boolean; season?: string }
  ) {
    const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
    if (!clan) return;
    if (clan.members < 1) {
      return interaction.editReply(this.i18n('common.no_clan_members', { lng: interaction.locale, clan: clan.name }));
    }

    const fetched = await this.getPlayers(clan.memberList, args.season);
    const seasonId = args.season ?? Season.ID;

    const members = fetched.map((player) => ({
      name: player.name,
      tag: player.tag,
      attackWins: player.attackWins,
      defenseWins: player.defenseWins
    }));

    if (args.sort_by_defense) {
      members.sort((a, b) => b.defenseWins - a.defenseWins);
    } else {
      members.sort((a, b) => b.attackWins - a.attackWins);
    }

    const embed = new EmbedBuilder()
      .setColor(this.client.embed(interaction))
      .setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.medium })
      .setDescription(
        [
          '```',
          `\u200e ${'#'}  ${'ATK'}  ${'DEF'}  ${'NAME'.padEnd(15, ' ')}`,
          members
            .map((member, i) => {
              const name = `${member.name.replace(/\`/g, '\\').padEnd(15, ' ')}`;
              const attackWins = `${member.attackWins.toString().padStart(3, ' ')}`;
              const defenseWins = `${member.defenseWins.toString().padStart(3, ' ')}`;
              return `${(i + 1).toString().padStart(2, ' ')}  ${attackWins}  ${defenseWins}  \u200e${name}`;
            })
            .join('\n'),
          '```'
        ].join('\n')
      )
      .setFooter({ text: `Season ${moment(seasonId).format('MMM YYYY')} \nSynced` })
      .setTimestamp();

    const payload = {
      cmd: this.id,
      tag: clan.tag,
      sort_by_defense: args.sort_by_defense,
      with_options: args.with_options
    };
    const customIds = {
      refresh: this.createId(payload),
      option: this.createId({ ...payload, cmd: 'members', string_key: 'option' }),
      sort_by: this.createId({ ...payload, sort_by_defense: !args.sort_by_defense })
    };

    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setEmoji(EMOJIS.REFRESH).setCustomId(customIds.refresh).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(customIds.sort_by)
        .setStyle(ButtonStyle.Secondary)
        .setLabel(args.sort_by_defense ? `Sort by Attacks` : `Sort by Defense`)
    );

    const menu = new StringSelectMenuBuilder()
      .setPlaceholder('Select an option!')
      .setCustomId(customIds.option)
      .addOptions(
        Object.values(MembersCommandOptions).map((option) => ({
          label: option.label,
          value: option.id,
          description: option.description,
          default: option.id === MembersCommandOptions.attacks.id
        }))
      );
    const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);

    return interaction.editReply({
      embeds: [embed],
      components: args.with_options || !args.season ? [buttonRow, menuRow] : [buttonRow]
    });
  }

  private async getPlayers(memberList: APIClanMember[], seasonId?: string) {
    const fetched = await this.client.db
      .collection(Collections.PLAYER_SEASONS)
      .find<{ name: string; tag: string; attackWins: number; defenseWins: number }>({
        season: seasonId ?? Season.ID,
        tag: { $in: memberList.map((m) => m.tag) }
      })
      .toArray();

    if (!fetched.length && !seasonId) {
      const players = await this.client.http._getPlayers(memberList);
      return players;
    }

    return fetched;
  }
}
