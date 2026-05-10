import { Collections } from '@app/constants';
import { TicketEntity, TicketPanelEntity } from '@app/entities';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  ComponentType,
  EmbedBuilder,
  TextChannel
} from 'discord.js';
import { ObjectId } from 'mongodb';
import { Args, Command } from '../../lib/handlers.js';

export default class TicketCloseCommand extends Command {
  public constructor() {
    super('ticket-close', {
      category: 'tickets',
      channel: 'guild',
      userPermissions: ['ManageChannels'],
      clientPermissions: ['ManageChannels', 'EmbedLinks', 'SendMessages', 'ReadMessageHistory'],
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
      .findOne({ channelId: interaction.channelId, status: { $ne: 'closed' } });

    if (!ticket) {
      return interaction.editReply({
        content: 'This command can only be used inside an open ticket channel.'
      });
    }

    const confirmId = this.client.uuid(interaction.user.id);
    const cancelId = this.client.uuid(interaction.user.id);

    const embed = new EmbedBuilder()
      .setTitle('Close Ticket?')
      .setDescription(
        'This will generate a transcript, post it to the log channel, and delete this channel.'
      )
      .setColor(0xeb3508);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(confirmId)
        .setLabel('Close Ticket')
        .setEmoji('🔒')
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

    await action.update({ content: 'Closing ticket…', embeds: [], components: [] });

    const channel = interaction.channel as TextChannel;

    // Generate transcript
    const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
    let transcript = `Transcript for #${channel.name}\nGenerated: ${new Date().toISOString()}\n${'='.repeat(60)}\n`;

    if (messages) {
      transcript += [...messages.values()]
        .reverse()
        .map((m) => {
          const time = m.createdAt.toISOString();
          const author = m.author.username;
          const content = m.content || (m.embeds.length ? '[embed]' : '[attachment]');
          return `[${time}] ${author}: ${content}`;
        })
        .join('\n');
    }

    // Update ticket
    await this.client.db.collection<TicketEntity>(Collections.TICKETS).updateOne(
      { _id: ticket._id },
      {
        $set: {
          status: 'closed',
          closedAt: new Date(),
          closedBy: interaction.user.id,
          updatedAt: new Date()
        }
      }
    );

    // Log
    const panel = await this.client.db
      .collection<TicketPanelEntity>(Collections.TICKET_PANELS)
      .findOne({ _id: new ObjectId(ticket.panelId) });

    if (panel?.logChannels.ticketClose) {
      const logCh = interaction.guild!.channels.cache.get(panel.logChannels.ticketClose) as
        | TextChannel
        | undefined;

      if (logCh) {
        const logEmbed = new EmbedBuilder()
          .setTitle(`Ticket Closed — #${String(ticket.count).padStart(4, '0')}`)
          .setColor(0xeb3508)
          .addFields(
            { name: 'Created by', value: `<@${ticket.creatorId}>`, inline: true },
            { name: 'Closed by', value: `<@${interaction.user.id}>`, inline: true },
            {
              name: 'Created at',
              value: `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:F>`,
              inline: true
            }
          );

        await logCh
          .send({
            embeds: [logEmbed],
            files: [
              {
                attachment: Buffer.from(transcript, 'utf-8'),
                name: `ticket-${ticket.count}.txt`
              }
            ]
          })
          .catch(() => null);
      }
    }

    setTimeout(() => channel.delete('Ticket closed').catch(() => null), 3000);
  }
}
