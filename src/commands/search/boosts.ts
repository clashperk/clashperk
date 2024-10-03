import { Collections } from '@app/constants';
import { APIPlayer } from 'clashofclans.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, StringSelectMenuBuilder, User } from 'discord.js';
import { Command } from '../../lib/handlers.js';
import { EMOJIS, SUPER_TROOPS } from '../../util/emojis.js';
import { Util } from '../../util/toolkit.js';
import { RAW_SUPER_TROOPS } from '../../util/troops.js';

export default class BoostsCommand extends Command {
  public constructor() {
    super('boosts', {
      category: 'search',
      channel: 'guild',
      clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; unit?: string; recent?: boolean; user?: User }) {
    const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
    if (!clan) return;
    if (!clan.members) {
      return interaction.followUp({
        content: this.i18n('common.no_clan_members', { lng: interaction.locale, clan: clan.name }),
        ephemeral: true
      });
    }

    const members = await this.client.coc._getPlayers(clan.memberList);
    const players = members.filter((mem) => mem.troops.filter((en) => en.superTroopIsActive).length);
    if (!players.length)
      return interaction.followUp({ content: this.i18n('command.boosts.no_boosts', { lng: interaction.locale }), ephemeral: true });

    const boostTimes = await this.client.db
      .collection<{ tag: string; lastSeen: Date }>(Collections.PLAYERS)
      .find({ tag: { $in: players.map((m) => m.tag) } }, { projection: { _id: 0, tag: 1, lastSeen: 1 } })
      .toArray();

    const recently = boostTimes.filter((m) => m.lastSeen >= new Date(Date.now() - 10 * 60 * 1000)).map((m) => m.tag);

    const selected = players
      .filter((mem) => mem.troops.filter((en) => en.name === args.unit && en.superTroopIsActive).length)
      .filter((m) => (recently.length && args.recent ? recently.includes(m.tag) : true)).length;

    const boosters = players.filter((m) => (recently.length && args.recent ? recently.includes(m.tag) : true));
    const memObj = boosters.reduce<{ [key: string]: { name: string; duration: number; online: boolean }[] }>((pre, curr) => {
      for (const troop of curr.troops) {
        if (troop.name in SUPER_TROOPS && troop.superTroopIsActive && (args.unit && selected ? args.unit === troop.name : true)) {
          if (!(troop.name in pre)) pre[troop.name] = [];
          pre[troop.name].push({ name: curr.name, duration: 0, online: recently.includes(curr.tag) });
        }
      }
      return pre;
    }, {});

    const embed = new EmbedBuilder()
      .setColor(this.client.embed(interaction.guild.id))
      .setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.small })
      .setDescription(
        `**Currently Boosted Super Troops**${args.recent && recently.length ? '\nRecently Active Members (~10m)' : ''}\n\u200b`
      );
    if (args.recent && recently.length) {
      embed.setFooter({
        text: `Total ${boosters.length}/${clan.members}`,
        iconURL: interaction.user.displayAvatarURL()
      });
    } else {
      embed.setFooter({
        text: `Total ${players.length}/${this.boostable(members)}/${clan.members}`,
        iconURL: interaction.user.displayAvatarURL()
      });
    }

    for (const [key, val] of Object.entries(memObj)) {
      embed.addFields([
        {
          name: `${SUPER_TROOPS[key]} ${key}`,
          value: Util.splitMessage(
            `${val
              .map(
                (mem) => `\u200e${mem.name}${mem.duration ? ` (${Util.duration(mem.duration)})` : ''} ${mem.online ? EMOJIS.ONLINE : ''}`
              )
              .join('\n')}\n\u200b`,
            { maxLength: 1024 }
          )[0]
        }
      ]);
      embed.setTimestamp();
    }

    if (args.recent && !recently.length) {
      return interaction.followUp({
        ephemeral: true,
        content: this.i18n('command.boosts.no_recent_boosts', { lng: interaction.locale })
      });
    }

    if (args.unit && !selected) {
      return interaction.followUp({
        ephemeral: true,
        content: args.recent
          ? this.i18n('command.boosts.no_recent_unit_boosts', { lng: interaction.locale, unit: args.unit })
          : this.i18n('command.boosts.no_unit_boosts', { lng: interaction.locale, unit: args.unit })
      });
    }

    const buttons = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setEmoji(EMOJIS.REFRESH)
          .setStyle(ButtonStyle.Secondary)
          .setCustomId(JSON.stringify({ tag: clan.tag, cmd: this.id }))
      )
      .addComponents(
        new ButtonBuilder()
          .setLabel('Recently Active')
          .setStyle(ButtonStyle.Secondary)
          .setCustomId(JSON.stringify({ tag: clan.tag, cmd: this.id, recent: true }))
      );

    const menus = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setPlaceholder('Select a Super Troop')
        .setCustomId(JSON.stringify({ tag: clan.tag, cmd: this.id, recent: Boolean(args.recent), string_key: 'unit' }))
        .addOptions(Object.entries(SUPER_TROOPS).map(([key, value]) => ({ label: key, value: key, emoji: value })))
    );

    return interaction.editReply({ embeds: [embed], components: [buttons, menus] });
  }

  private boostable(players: APIPlayer[]) {
    return players
      .filter((en) => en.townHallLevel >= 11)
      .reduce((pre, curr) => {
        const troops = RAW_SUPER_TROOPS.filter((unit) =>
          curr.troops.find((un) => un.village === 'home' && un.name === unit.original && un.level >= unit.minOriginalLevel)
        );
        return pre + (troops.length ? 1 : 0);
      }, 0);
  }
}
