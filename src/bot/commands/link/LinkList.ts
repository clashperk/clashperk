import { Settings } from '@app/constants';
import { Command } from '@lib/core';
import { APIClan } from 'clashofclans.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  StringSelectMenuBuilder,
  User
} from 'discord.js';
import { getClanSwitchingMenu } from '../../helper/clans.helper.js';
import { MembersCommandOptions } from '../../util/CommandOptions.js';
import { EMOJIS } from '../../util/Emojis.js';
import { padStart } from '../../util/Helper.js';
import { Util } from '../../util/index.js';

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

  public async exec(
    interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>,
    args: { tag?: string; show_tags?: boolean; user?: User; links?: boolean; with_options?: boolean }
  ) {
    const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
    if (!clan) return;
    if (!clan.members) return interaction.editReply(this.i18n('common.no_clan_members', { lng: interaction.locale, clan: clan.name }));

    if (args.links) {
      if (!this.client.util.isManager(interaction.member, Settings.LINKS_MANAGER_ROLE)) {
        return interaction.followUp({
          content: this.i18n('common.missing_manager_role', { lng: interaction.locale }),
          ephemeral: true
        });
      }

      const token = this.client.util.createToken({ userId: interaction.user.id, guildId: interaction.guild.id });
      const linkRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setURL(`https://clashperk.com/links?tag=${encodeURIComponent(clan.tag)}&token=${token}`)
          .setLabel('Open in Browser')
          .setStyle(ButtonStyle.Link)
      );

      this.client.storage.updateClanLinks(interaction.guildId);

      return interaction.followUp({
        content: [`**Click the button below to manage Discord links on our Dashboard.**`].join('\n'),
        ephemeral: true,
        components: [linkRow]
      });
    }

    const users = await this.client.resolver.getLinkedUsersMap(clan.memberList);
    const members: { name: string; tag: string; userId: string; verified: boolean }[] = [];

    for (const mem of clan.memberList) {
      if (mem.tag in users) {
        const user = users[mem.tag];
        members.push({ tag: mem.tag, userId: user.userId, name: mem.name, verified: user.verified });
      }
    }

    const guildMembers = await interaction.guild.members.fetch();

    const clanMembers = clan.memberList.map((member) => {
      const link = members.find((mem) => mem.tag === member.tag);
      const username = link ? guildMembers.get(link.userId)?.displayName.slice(0, 14) : member.tag;
      return {
        name: this.parseName(member.name),
        tag: padStart(member.tag, 14),
        isVerified: Boolean(link?.verified),
        username: padStart(args.show_tags ? member.tag : username ?? member.tag, 14),
        townHallLevel: member.townHallLevel,
        isInServer: Boolean(link && guildMembers.has(link.userId)),
        isLinked: !!link
      };
    });

    const payload = {
      cmd: this.id,
      tag: clan.tag,
      with_options: args.with_options
    };
    const customIds = {
      refresh: this.createId(payload),
      toggleTag: this.createId({ ...payload, show_tags: !args.show_tags }),
      manage: this.createId({ ...payload, links: true }),
      option: this.createId({ ...payload, cmd: 'members', string_key: 'option' }),
      tag: this.createId({ ...payload, string_key: 'tag' })
    };

    const embed = this.getEmbed(clan, clanMembers);
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(new ButtonBuilder().setStyle(ButtonStyle.Secondary).setEmoji(EMOJIS.REFRESH).setCustomId(customIds.refresh))
      .addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Secondary)
          .setEmoji(args.show_tags ? EMOJIS.DISCORD : EMOJIS.HASH)
          .setCustomId(customIds.toggleTag)
      )
      .addComponents(new ButtonBuilder().setStyle(ButtonStyle.Primary).setEmoji('🔗').setLabel('Manage').setCustomId(customIds.manage));

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
    const playersInServerList = clanMembers.filter((mem) => mem.isInServer && mem.isLinked).sort((a, b) => this.localeSort(a, b));
    const playersNotInServerList = clanMembers.filter((mem) => !mem.isInServer && mem.isLinked).sort((a, b) => this.localeSort(a, b));
    const playersNotLinkedList = clanMembers.filter((mem) => !mem.isLinked).sort((a, b) => this.localeSort(a, b));

    const chunks = Util.splitMessage(
      [
        `**Players in the Server: ${playersInServerList.length}**`,
        playersInServerList
          .map(({ name, username, isVerified, townHallLevel }) => {
            const label = isVerified ? EMOJIS.VERIFIED : EMOJIS.OK;
            return `${label} \`\u200e${padStart(townHallLevel, 2)} ${name} ${username} \u200f\``;
          })
          .join('\n'),
        playersNotInServerList.length ? `\n**Players not in the Server: ${playersNotInServerList.length}**` : '',
        playersNotInServerList
          .map(({ name, username, isVerified, townHallLevel }) => {
            const label = isVerified ? EMOJIS.VERIFIED : EMOJIS.OK;
            return `${label} \`\u200e${padStart(townHallLevel, 2)} ${name} ${username} \u200f\``;
          })
          .join('\n'),
        playersNotLinkedList.length ? `\n**Players not Linked: ${playersNotLinkedList.length}**` : '',
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

  private parseName(name: string) {
    return Util.escapeBackTick(name).padEnd(15, ' ');
    // return name.replace(/[^\x00-\xF7]+/g, ' ').trim().padEnd(15, ' ');
  }

  private localeSort(a: { name: string }, b: { name: string }) {
    // return a.name.localeCompare(b.name);
    return a.name.replace(/[^\x00-\xF7]+/g, '').localeCompare(b.name.replace(/[^\x00-\xF7]+/g, ''));
  }
}
