import { Settings } from '@app/constants';
import { APIClan } from 'clashofclans.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  User
} from 'discord.js';
import { title } from 'radash';
import { getClanSwitchingMenu } from '../../helper/clans.helper.js';
import { Args, Command } from '../../lib/handlers.js';
import { MembersCommandOptions } from '../../util/command.options.js';
import { EMOJIS } from '../../util/emojis.js';
import { escapeBackTick, padStart } from '../../util/helper.js';
import { Util } from '../../util/toolkit.js';

const SortingKey = {
  NAME: '_name',
  TAG: '_tag',
  USERNAME: '_username',
  TOWN_HALL_LEVEL: '_townHallLevel'
};
const sortingKeys = Object.values(SortingKey);

// ASCII /[^\x00-\xF7]+/
export default class LinkListCommand extends Command {
  public constructor() {
    super('link-list', {
      category: 'link',
      clientPermissions: ['EmbedLinks'],
      channel: 'guild',
      defer: true
    });
  }

  public args(): Args {
    return {
      clan: {
        id: 'tag',
        match: 'STRING'
      }
    };
  }

  public async exec(
    interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>,
    args: { tag?: string; sort_by?: string; user?: User; links?: boolean; with_options?: boolean }
  ) {
    const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
    if (!clan) return;
    if (!clan.members)
      return interaction.editReply(
        this.i18n('common.no_clan_members', { lng: interaction.locale, clan: clan.name })
      );

    if (args.links) {
      if (!this.client.util.isManager(interaction.member, Settings.LINKS_MANAGER_ROLE)) {
        return interaction.followUp({
          content: this.i18n('common.missing_manager_role', { lng: interaction.locale }),
          flags: MessageFlags.Ephemeral
        });
      }

      const token = this.client.util.createToken({
        userId: interaction.user.id,
        guildId: interaction.guild.id
      });
      const linkRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setURL(
            `https://clashperk.com/links?tag=${encodeURIComponent(clan.tag)}&bot=${this.client.isCustom() ? 'custom' : 'public'}&token=${token}`
          )
          .setLabel('Open in Browser')
          .setStyle(ButtonStyle.Link)
      );

      this.client.storage.updateClanLinks(interaction.guildId);

      return interaction.followUp({
        content: [`**Click the button below to manage Discord links on our Dashboard.**`].join(
          '\n'
        ),
        flags: MessageFlags.Ephemeral,
        components: [linkRow]
      });
    }

    const users = await this.client.resolver.getLinkedUsersMap(clan.memberList);
    const members: {
      name: string;
      tag: string;
      userId: string;
      verified: boolean;
      displayName: string;
    }[] = [];

    for (const mem of clan.memberList) {
      const user = users[mem.tag];
      if (user)
        members.push({
          tag: mem.tag,
          userId: user.userId,
          name: mem.name,
          verified: user.verified,
          displayName: user.displayName
        });
    }

    const guildMembers = await this.client.util.getGuildMembers(interaction);

    const clanMembers = clan.memberList.map((member) => {
      const link = members.find((mem) => mem.tag === member.tag);
      const username = link
        ? (guildMembers.get(link.userId)?.displayName || link.displayName)?.slice(0, 14)
        : member.tag;

      return {
        name: padStart(escapeBackTick(member.name), 15),
        _name: member.name,
        tag: padStart(member.tag, 14),
        _tag: member.tag,
        isVerified: Boolean(link?.verified),
        username: padStart(
          args.sort_by === SortingKey.TAG ? member.tag : (escapeBackTick(username) ?? member.tag),
          14
        ),
        _username: username || '',
        townHallLevel: member.townHallLevel,
        _townHallLevel: member.townHallLevel,
        isInServer: Boolean(link && guildMembers.has(link.userId)),
        isLinked: !!link
      };
    });

    switch (args.sort_by) {
      case SortingKey.NAME:
      case SortingKey.TAG:
        clanMembers.sort((a, b) => b._townHallLevel - a._townHallLevel);
        clanMembers.sort((a, b) => this.localeSort(a._name, b._name));
        break;
      case SortingKey.USERNAME:
        clanMembers.sort((a, b) => this.localeSort(a._name, b._name));
        clanMembers.sort((a, b) => this.localeSort(a._username, b._username));
        break;
      case SortingKey.TOWN_HALL_LEVEL:
        clanMembers.sort((a, b) => this.localeSort(a._name, b._name));
        clanMembers.sort((a, b) => b._townHallLevel - a._townHallLevel);
        break;
      default:
        break;
    }

    const payload = {
      cmd: this.id,
      tag: clan.tag,
      with_options: args.with_options
    };

    const sortIndex = sortingKeys.indexOf(args.sort_by || SortingKey.NAME);
    const customIds = {
      refresh: this.createId(payload),
      sort: this.createId({ ...payload, sort_by: sortingKeys[this.getRotationalKey(sortIndex)] }),
      manage: this.createId({ ...payload, links: true }),
      option: this.createId({ ...payload, cmd: 'members', string_key: 'option' }),
      tag: this.createId({ ...payload, string_key: 'tag' })
    };

    clan.name = await this.client.storage.getNickname(interaction.guildId, clan.tag, clan.name);

    const embed = this.getEmbed(clan, clanMembers);
    if (args.sort_by) embed.setFooter({ text: `Sorted by ${title(args.sort_by)}` });

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Secondary)
          .setEmoji(EMOJIS.REFRESH)
          .setCustomId(customIds.refresh)
      )
      .addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Secondary)
          .setEmoji(EMOJIS.SORTING)
          .setCustomId(customIds.sort)
      )
      .addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🔗')
          .setLabel('Manage')
          .setCustomId(customIds.manage)
      );

    const menu = new StringSelectMenuBuilder()
      .setPlaceholder('Select an option!')
      .setCustomId(customIds.option)
      .addOptions(
        Object.values(MembersCommandOptions).map((option) => ({
          label: option.label,
          value: option.id,
          description: option.description,
          default: option.id === MembersCommandOptions.discord.id
        }))
      );
    const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);

    const clanRow = await getClanSwitchingMenu(interaction, customIds.tag, clan.tag);
    const components = args.with_options ? [row, menuRow] : [row];
    if (clanRow) components.push(clanRow);

    return interaction.editReply({ embeds: [embed], components });
  }

  private getEmbed(
    clan: APIClan,
    clanMembers: {
      name: string;
      tag: string;
      username: string;
      isVerified: boolean;
      isLinked: boolean;
      isInServer: boolean;
      townHallLevel: number;
    }[]
  ) {
    const playersInServerList = clanMembers.filter((mem) => mem.isInServer && mem.isLinked);
    const playersNotInServerList = clanMembers.filter((mem) => !mem.isInServer && mem.isLinked);
    const playersNotLinkedList = clanMembers.filter((mem) => !mem.isLinked);

    const chunks = Util.splitMessage(
      [
        `**Players in the Server: ${playersInServerList.length}**`,
        playersInServerList
          .map(({ name, username, isVerified, townHallLevel }) => {
            const label = isVerified ? EMOJIS.VERIFIED : EMOJIS.OK;
            return `${label} \`\u200e${padStart(townHallLevel, 2)} ${name} ${username} \u200f\``;
          })
          .join('\n'),
        playersNotInServerList.length
          ? `\n**Players not in the Server: ${playersNotInServerList.length}**`
          : '',
        playersNotInServerList
          .map(({ name, username, isVerified, townHallLevel }) => {
            const label = isVerified ? EMOJIS.VERIFIED : EMOJIS.OK;
            return `${label} \`\u200e${padStart(townHallLevel, 2)} ${name} ${username} \u200f\``;
          })
          .join('\n'),
        playersNotLinkedList.length
          ? `\n**Players not Linked: ${playersNotLinkedList.length}**`
          : '',
        playersNotLinkedList
          .map(({ name, username, townHallLevel }) => {
            const label = EMOJIS.WRONG;
            return `${label} \`\u200e${padStart(townHallLevel, 2)} ${name} ${username} \u200f\``;
          })
          .join('\n')
      ]
        .filter((text) => text)
        .join('\n'),
      { maxLength: 4096 }
    );

    const embed = new EmbedBuilder()
      .setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.small })
      .setDescription(chunks[0]);
    if (chunks.length > 1) {
      embed.addFields(chunks.slice(1).map((chunk) => ({ name: '\u200b', value: chunk })));
    }

    return embed;
  }

  private localeSort(a: string, b: string) {
    // a.localeCompare(b);
    // name.replace(/[^\x00-\xF7]+/g, ' ').trim();
    return a.replace(/[^\x00-\xF7]+/g, '').localeCompare(b.replace(/[^\x00-\xF7]+/g, ''));
  }

  private getRotationalKey(idx: number) {
    return idx + 1 > sortingKeys.length - 1 ? 0 : idx + 1;
  }
}
