import { Collections } from '@app/constants';
import { TicketEntity, TicketPanelEntity } from '@app/entities';
import { CategoryChannel, CommandInteraction, EmbedBuilder, TextChannel } from 'discord.js';
import { ObjectId } from 'mongodb';
import { Command } from '../../lib/handlers.js';

export default class TicketReopenCommand extends Command {
  public constructor() {
    super('ticket-reopen', {
      category: 'tickets',
      channel: 'guild',
      userPermissions: ['ManageChannels'],
      clientPermissions: ['ManageChannels', 'EmbedLinks', 'SendMessages'],
      defer: true,
      ephemeral: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>) {
    const ticket = await this.client.db
      .collection<TicketEntity>(Collections.TICKETS)
      .findOne({ channelId: interaction.channelId, status: 'sleep' });

    if (!ticket) {
      return interaction.editReply({
        content: 'This command can only be used inside a sleeping ticket channel.'
      });
    }

    const panel = await this.client.db
      .collection<TicketPanelEntity>(Collections.TICKET_PANELS)
      .findOne({ _id: new ObjectId(ticket.panelId) });

    const btn = panel?.ticketTypes.find((b) => b.id === ticket.buttonId);
    const channel = interaction.channel as TextChannel;

    // Restore ticket creator's send access
    await channel.permissionOverwrites
      .edit(ticket.creatorId, {
        SendMessages: true,
        ViewChannel: true
      })
      .catch(() => null);

    // Move back to open category
    if (btn?.openCategoryId) {
      const openCat = interaction.guild!.channels.cache.get(btn.openCategoryId) as
        | CategoryChannel
        | undefined;

      if (openCat) {
        await channel.setParent(openCat, { lockPermissions: false }).catch(() => null);
      }
    }

    // If the ticket was claimed, restore staff role access and clear the claim
    if (ticket.claimedBy) {
      if (ticket.claimedBy !== ticket.creatorId) {
        await channel.permissionOverwrites.delete(ticket.claimedBy).catch(() => null);
      }
      for (const roleId of btn?.pingRoleIds ?? []) {
        await channel.permissionOverwrites
          .edit(roleId, {
            ViewChannel: true,
            SendMessages: true,
            AttachFiles: true,
            EmbedLinks: true,
            ReadMessageHistory: true,
            ManageMessages: true,
            ManageChannels: true
          })
          .catch(() => null);
      }
      for (const roleId of btn?.viewOnlyRoleIds ?? []) {
        await channel.permissionOverwrites
          .edit(roleId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true })
          .catch(() => null);
      }
    }

    // Update DB
    await this.client.db.collection<TicketEntity>(Collections.TICKETS).updateOne(
      { _id: ticket._id },
      {
        $set: { status: 'open', updatedAt: new Date() },
        ...(ticket.claimedBy ? { $unset: { claimedBy: '' } } : {})
      }
    );

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
                .setColor(0x38d863)
                .addFields(
                  {
                    name: 'Ticket',
                    value: `#${String(ticket.count).padStart(4, '0')} <#${ticket.channelId}>`,
                    inline: true
                  },
                  { name: 'Changed by', value: `<@${interaction.user.id}>`, inline: true },
                  { name: 'Status', value: 'sleep → open', inline: true }
                )
            ]
          })
          .catch(() => null);
      }
    }

    await channel
      .send({ content: `Ticket reopened by <@${interaction.user.id}>.` })
      .catch(() => null);

    await interaction.editReply({ content: 'Ticket has been reopened.' });
  }
}
