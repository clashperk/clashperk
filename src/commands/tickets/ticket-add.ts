import { Collections } from '@app/constants';
import { TicketEntity } from '@app/entities';
import { CommandInteraction, GuildMember, TextChannel } from 'discord.js';
import { Args, Command } from '../../lib/handlers.js';

export default class TicketAddCommand extends Command {
  public constructor() {
    super('ticket-add', {
      category: 'tickets',
      channel: 'guild',
      userPermissions: ['ManageChannels'],
      clientPermissions: ['ManageChannels', 'SendMessages'],
      defer: true,
      ephemeral: true
    });
  }

  public args(): Args {
    return {
      member: { match: 'MEMBER' }
    };
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { member: GuildMember }) {
    const { member } = args;
    if (!member) {
      return interaction.editReply({ content: 'Please specify a member to add.' });
    }

    const ticket = await this.client.db
      .collection<TicketEntity>(Collections.TICKETS)
      .findOne({ channelId: interaction.channelId, status: { $ne: 'closed' } });

    if (!ticket) {
      return interaction.editReply({
        content: 'This command can only be used inside an open ticket channel.'
      });
    }

    const channel = interaction.channel as TextChannel;

    await channel.permissionOverwrites
      .edit(member.user.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: true
      })
      .catch(() => null);

    await channel
      .send({ content: `<@${member.user.id}> has been added to this ticket.` })
      .catch(() => null);

    await interaction.editReply({
      content: `<@${member.user.id}> has been added to this ticket.`
    });
  }
}
