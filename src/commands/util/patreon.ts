import { Collections } from '@app/constants';
import { PatreonMembersEntity } from '@app/entities';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  ComponentType,
  EmbedBuilder,
  MessageFlags
} from 'discord.js';
import { Command } from '../../lib/handlers.js';

export default class PatreonCommand extends Command {
  public constructor() {
    super('patreon', {
      category: 'none',
      clientPermissions: ['EmbedLinks'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>) {
    const content = [
      '### Help us with our hosting related expenses. Any help is beyond appreciated. Thanks!',
      'https://www.patreon.com/clashperk'
    ].join('\n');

    const customId = this.client.uuid(interaction.user.id);
    const button = new ButtonBuilder()
      .setCustomId(customId)
      .setStyle(ButtonStyle.Secondary)
      .setLabel('Our Current Patrons');

    if (!this.client.isOwner(interaction.user.id)) {
      return interaction.editReply({ content });
    }

    const msg = await interaction.editReply({
      content,
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)]
    });
    const collector = msg.createMessageComponentCollector<
      ComponentType.Button | ComponentType.StringSelect
    >({
      filter: (action) => action.customId === customId && action.user.id === interaction.user.id,
      time: 5 * 60 * 1000
    });

    const patrons = (await this.patrons()).filter(
      (patron) => patron.active && patron.userId !== this.client.ownerId
    );
    collector.on('collect', async (action) => {
      if (action.customId === customId) {
        const embed = new EmbedBuilder();
        embed.setDescription(
          [
            `**Our Current Members (${patrons.length})**`,
            ...patrons.map((patron) => `0. ${patron.username}`)
          ].join('\n')
        );

        await action.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        return collector.stop();
      }
    });

    collector.on('end', async (_, reason) => {
      this.client.components.delete(customId);
      if (!/delete/i.test(reason)) await msg.edit({ components: [] });
    });
  }

  private patrons() {
    return this.client.db
      .collection<PatreonMembersEntity>(Collections.PATREON_MEMBERS)
      .find()
      .sort({ createdAt: 1 })
      .toArray();
  }
}
