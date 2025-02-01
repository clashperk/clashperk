import { Collections, WarType } from '@app/constants';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../lib/handlers.js';
import { EMOJIS } from '../../util/emojis.js';
import { Season, Util } from '../../util/toolkit.js';

export default class SummaryMissedWarsCommand extends Command {
  public constructor() {
    super('summary-missed-wars', {
      category: 'none',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: { clans?: string; season?: string; war_type?: string; is_reversed?: boolean }
  ) {
    const { clans, resolvedArgs } = await this.client.storage.handleSearch(interaction, { args: args.clans });
    if (!clans) return;

    const missed: Record<string, { name: string; tag: string; wars: number; missed: number }> = {};
    const season = args.season ?? Season.ID;

    for (const { tag } of clans) {
      const wars = await this.client.db
        .collection(Collections.CLAN_WARS)
        .find({
          $or: [{ 'clan.tag': tag }, { 'opponent.tag': tag }],
          state: 'warEnded',
          warType:
            args.war_type === 'regular-and-cwl'
              ? { $in: [WarType.REGULAR, WarType.CWL] }
              : args.war_type === 'friendly'
                ? WarType.FRIENDLY
                : args.war_type === 'cwl'
                  ? WarType.CWL
                  : WarType.REGULAR,
          startTime: { $gte: new Date(season) }
        })
        .sort({ _id: -1 })
        .toArray();

      for (const war of wars) {
        const clan = war.clan.tag === tag ? war.clan : war.opponent;
        for (const m of clan.members) {
          const mem = missed[m.tag] ? missed[m.tag] : (missed[m.tag] = { name: m.name, tag: m.tag, wars: 0, missed: 0 });
          mem.wars += 1;
          if (m.attacks?.length === war.attacksPerMember) continue;
          mem.missed += war.attacksPerMember - (m.attacks?.length ?? 0);
        }
      }
    }

    const members = Object.values(missed)
      .filter((m) => m.missed > 0)
      .sort((a, b) => a.missed - b.missed);

    if (args.is_reversed) {
      members.sort((a, b) => b.wars - a.wars);
      members.sort((a, b) => a.missed - b.missed);
    } else {
      members.sort((a, b) => b.wars - a.wars);
      members.sort((a, b) => b.missed - a.missed);
    }

    const embed = this.getEmbed(members, season);
    embed.setTimestamp();

    const payload = {
      cmd: this.id,
      clans: resolvedArgs,
      season: args.season,
      war_type: args.war_type,
      is_reversed: args.is_reversed
    };
    const customIds = {
      refresh: this.createId(payload),
      toggle: this.createId({ ...payload, is_reversed: !args.is_reversed })
    };

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setEmoji(EMOJIS.REFRESH).setStyle(ButtonStyle.Secondary).setCustomId(customIds.refresh),
      new ButtonBuilder()
        .setCustomId(customIds.toggle)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(EMOJIS.SORTING)
        .setLabel(args.is_reversed ? 'High to Low' : 'Low to High')
    );
    return interaction.editReply({ embeds: [embed], components: [row] });
  }

  private getEmbed(members: { name: string; tag: string; wars: number; missed: number }[], season: string) {
    const [content] = Util.splitMessage(
      [
        '\u200e # MISS WARS  NAME',
        ...members.slice(0, 99).map((m, i) => `\u200e${this.pad(i + 1, 2)} ${this.pad(m.missed)} ${this.pad(m.wars)}  ${m.name}`)
      ].join('\n'),
      { maxLength: 4000 }
    );
    return new EmbedBuilder().setTitle(`Missed Wars Summary (${season})`).setDescription(`\`\`\`\n${content}\`\`\``);
  }

  private pad(num: number, padding = 4) {
    return num.toString().padStart(padding, ' ');
  }
}
