import { Collections } from '@app/constants';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../lib/handlers.js';
import { EMOJIS } from '../../util/emojis.js';
import { Season } from '../../util/toolkit.js';

export default class SummaryAttacksCommand extends Command {
  public constructor() {
    super('summary-attacks', {
      category: 'none',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { season?: string; clans?: string; clans_only?: boolean }) {
    const season = args.season ?? Season.ID;
    const { clans, resolvedArgs } = await this.client.storage.handleSearch(interaction, { args: args.clans });
    if (!clans) return;

    const allClans = await this.client.coc._getClans(clans);
    const members: { name: string; tag: string; attackWins: number; clan: { name: string; tag: string } }[] = [];

    for (const clan of allClans) {
      const players = await this.client.db
        .collection<{ name: string; tag: string; attackWins: number }>(Collections.PLAYER_SEASONS)
        .find({ season, tag: { $in: clan.memberList.map((mem) => mem.tag) } }, { projection: { tag: 1, attackWins: 1, name: 1 } })
        .toArray();
      members.push(...players.map((spread) => ({ ...spread, clan: { name: clan.name, tag: clan.tag } })));
    }

    // group by clan
    const grouped = Object.values(
      members.reduce<Record<string, { attackWins: number; clan: { name: string; tag: string } }>>((acc, member) => {
        // eslint-disable-next-line
        acc[member.clan.tag] ??= {
          clan: {
            name: member.clan.name,
            tag: member.clan.tag
          },
          attackWins: 0
        };
        acc[member.clan.tag].attackWins += member.attackWins;
        return acc;
      }, {})
    ).sort((a, b) => b.attackWins - a.attackWins);

    const embed = new EmbedBuilder().setColor(this.client.embed(interaction));
    if (args.clans_only) {
      embed.setAuthor({ name: `${interaction.guild.name} Attack Wins` });
      embed.setDescription(
        [
          '```',
          `\u200e # ${'ATTACK'.padStart(5, ' ')}  ${'CLAN'.padEnd(14, ' ')} `,
          grouped
            .map(({ clan, attackWins }, index) => {
              const attacks = `${attackWins.toString().padStart(5, ' ')}`;
              return `\u200e${(index + 1).toString().padStart(2, ' ')}  ${attacks}  ${clan.name.padEnd(14, ' ')}`;
            })
            .join('\n'),
          '```'
        ].join('\n')
      );
    } else {
      members.sort((a, b) => b.attackWins - a.attackWins);
      embed.setAuthor({ name: `${interaction.guild.name} Attack Wins` });
      embed.setDescription(
        [
          '```',
          `\u200e # ATTACK  PLAYER`,
          members
            .slice(0, 99)
            .map((member, index) => {
              const attackWins = `${member.attackWins.toString().padStart(5, ' ')}`;
              return `${(index + 1).toString().padStart(2, ' ')}  ${attackWins}  \u200e${member.name}`;
            })
            .join('\n'),
          '```'
        ].join('\n')
      );
    }
    embed.setFooter({ text: `Season ${season}` });

    const payload = {
      cmd: this.id,
      season: args.season,
      clans: resolvedArgs,
      clans_only: args.clans_only
    };

    const customIds = {
      refresh: this.createId(payload),
      toggle: this.createId({ ...payload, clans_only: !args.clans_only })
    };

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setEmoji(EMOJIS.REFRESH).setStyle(ButtonStyle.Secondary).setCustomId(customIds.refresh),
      new ButtonBuilder()
        .setLabel(args.clans_only ? 'Players Summary' : 'Clans Summary')
        .setStyle(ButtonStyle.Primary)
        .setCustomId(customIds.toggle)
    );

    return interaction.editReply({ embeds: [embed], components: [row] });
  }
}
