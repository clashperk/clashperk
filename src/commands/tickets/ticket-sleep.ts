import { Collections } from '@app/constants';
import { TicketEntity, TicketPanelEntity } from '@app/entities';
import { CategoryChannel, CommandInteraction, EmbedBuilder, TextChannel } from 'discord.js';
import { ObjectId } from 'mongodb';
import { Args, Command } from '../../lib/handlers.js';

export default class TicketSleepCommand extends Command {
  public constructor() {
    super('ticket-sleep', {
      category: 'tickets',
      channel: 'guild',
      userPermissions: ['ManageChannels'],
      clientPermissions: ['ManageChannels', 'EmbedLinks', 'SendMessages'],
      defer: true,
      ephemeral: true
    });
  }

  public args(): Args {
    return {};
  }

  public async exec(interaction: CommandInteraction<'cached'>) {
    const ticket = await this.client.db
      .collection<TicketEntity>(Collections.TICKETS)
      .findOne({ channelId: interaction.channelId, status: 'open' });

    if (!ticket) {
      return interaction.editReply({
        content: 'This command can only be used inside an open ticket channel.'
      });
    }

    const panel = await this.client.db
      .collection<TicketPanelEntity>(Collections.TICKET_PANELS)
      .findOne({ _id: new ObjectId(ticket.panelId) });

    const btn = panel?.ticketTypes.find((b) => b.id === ticket.buttonId);
    const channel = interaction.channel as TextChannel;

    // Remove ticket creator's send access
    await channel.permissionOverwrites
      .edit(ticket.creatorId, {
        SendMessages: false,
        ViewChannel: true
      })
      .catch(() => null);

    // Move to sleep category
    if (btn?.sleepCategoryId) {
      const sleepCat = interaction.guild!.channels.cache.get(btn.sleepCategoryId) as
        | CategoryChannel
        | undefined;

      if (sleepCat) {
        await channel.setParent(sleepCat, { lockPermissions: false }).catch(() => null);
      }
    }

    // Update DB
    await this.client.db
      .collection<TicketEntity>(Collections.TICKETS)
      .updateOne({ _id: ticket._id }, { $set: { status: 'sleep', updatedAt: new Date() } });

    // Log
    if (panel?.logChannels.statusChange) {
      const logCh = interaction.guild!.channels.cache.get(panel.logChannels.statusChange) as
        | TextChannel
        | undefined;

      if (logCh) {
        await logCh
          .send({
            embeds: [
              new EmbedBuilder()
                .setTitle('Ticket Status Changed')
                .setColor(0xeffd5f)
                .addFields(
                  {
                    name: 'Ticket',
                    value: `#${String(ticket.count).padStart(4, '0')} <#${ticket.channelId}>`,
                    inline: true
                  },
                  { name: 'Changed by', value: `<@${interaction.user.id}>`, inline: true },
                  { name: 'Status', value: 'open → sleep', inline: true }
                )
            ]
          })
          .catch(() => null);
      }
    }

    await channel
      .send({
        content: `Ticket put to sleep by <@${interaction.user.id}>. Use \`/ticket reopen\` to restore access.`
      })
      .catch(() => null);

    await interaction.editReply({ content: 'Ticket is now sleeping.' });
  }
}
