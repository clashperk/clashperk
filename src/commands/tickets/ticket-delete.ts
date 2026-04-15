import { Collections } from '@app/constants';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  ComponentType,
  EmbedBuilder
} from 'discord.js';
import { Args, Command } from '../../lib/handlers.js';
import TicketSetupCommand from './ticket-setup.js';

export default class TicketDeleteCommand extends Command {
  public constructor() {
    super('ticket-delete', {
      category: 'tickets',
      channel: 'guild',
      userPermissions: ['ManageGuild'],
      clientPermissions: ['EmbedLinks', 'SendMessages'],
      defer: true,
      ephemeral: true
    });
  }

  public args(): Args {
    return {
      panel_name: { match: 'STRING' }
    };
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { panel_name: string }) {
    const { panel_name } = args;
    if (!panel_name) {
      return interaction.editReply({ content: 'Please provide a panel name.' });
    }

    const setupCmd = this.client.commandHandler.modules.get('ticket-setup') as
      | TicketSetupCommand
      | undefined;

    const panel = await setupCmd?.getPanel(interaction.guildId, panel_name);

    if (!panel) {
      return interaction.editReply({ content: `Panel **${panel_name}** does not exist.` });
    }

    const ticketCount = await this.client.db
      .collection(Collections.TICKETS)
      .countDocuments({ guildId: interaction.guildId, panelId: panel._id.toHexString() });

    const confirmId = this.client.uuid(interaction.user.id);
    const cancelId = this.client.uuid(interaction.user.id);

    const embed = new EmbedBuilder()
      .setTitle('Delete Panel?')
      .setDescription(
        [
          `Are you sure you want to delete panel **${panel_name}**?`,
          '',
          `This will permanently delete the panel configuration.`,
          ticketCount > 0
            ? `Note: ${ticketCount} ticket record(s) from this panel will remain in the database.`
            : ''
        ]
          .filter(Boolean)
          .join('\n')
      )
      .setColor(0xeb3508);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(confirmId)
        .setLabel('Delete Panel')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(cancelId).setLabel('Cancel').setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({ embeds: [embed], components: [row] });

    const action = await interaction
      .channel!.awaitMessageComponent({
        componentType: ComponentType.Button,
        filter: (a) =>
          [confirmId, cancelId].includes(a.customId) && a.user.id === interaction.user.id,
        time: 60_000
      })
      .catch(() => null);

    this.client.components.delete(confirmId);
    this.client.components.delete(cancelId);

    if (!action || action.customId === cancelId) {
      await (action ?? interaction).editReply({
        content: 'Cancelled.',
        embeds: [],
        components: []
      });
      return;
    }

    await this.client.db.collection(Collections.TICKET_PANELS).deleteOne({ _id: panel._id });

    await action.update({
      content: `Panel **${panel_name}** has been deleted.`,
      embeds: [],
      components: []
    });
  }
}
