import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, parseEmoji } from 'discord.js';
import { Command } from '../../lib/index.js';
import { EMOJIS } from '../../util/emojis.js';

export default class GameEvents extends Command {
  public constructor() {
    super('events', {
      category: 'search',
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>) {
    const visibleEvents = this.client.guildEvents.getEvents(interaction.locale, { filtered: true, useGraceTime: false });

    const embed = new EmbedBuilder()
      .setAuthor({
        name: 'Upcoming Events!',
        iconURL: `https://cdn.discordapp.com/emojis/${parseEmoji(EMOJIS.COC_LOGO)!.id!}.png?v=1`
      })
      .setColor(this.client.embed(interaction))
      .addFields(
        visibleEvents.map((event, index, items) => ({
          name: event.formattedName,
          value: `${event.value}${items.length - 1 === index ? '' : '\n\u200b'}`
        }))
      )
      .setFooter({ text: 'Synced' })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setEmoji(EMOJIS.REFRESH)
        .setCustomId(JSON.stringify({ cmd: this.id }))
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.editReply({ embeds: [embed], components: [row] });
  }
}
