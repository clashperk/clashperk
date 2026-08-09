import { addBreadcrumb, setContext } from '@sentry/node';
import {
  ChannelType,
  CommandInteraction,
  InteractionType,
  MessageComponentInteraction
} from 'discord.js';
import { Command } from '../lib/handlers.js';

export function captureContext(
  interaction: CommandInteraction | MessageComponentInteraction,
  command: Command
) {
  const context = {
    user: {
      id: interaction.user.id,
      displayName: interaction.user.displayName,
      username: interaction.user.username
    },
    guild: interaction.guild
      ? {
          id: interaction.guild.id,
          name: interaction.guild.name,
          locale: interaction.guildLocale
        }
      : interaction.guildId,
    channel: interaction.channel
      ? { id: interaction.channel.id, type: ChannelType[interaction.channel.type] }
      : interaction.channelId,
    command: {
      id: command?.id,
      category: command?.category
    },
    interaction: {
      locale: interaction.locale,
      id: interaction.id,
      type: InteractionType[interaction.type],
      command: interaction.isCommand() ? interaction.commandName : null,
      customId: interaction.isMessageComponent() ? interaction.customId : null
    }
  };

  addBreadcrumb({
    message: 'command_errored',
    category: command ? command.category : 'inhibitor',
    level: 'error',
    data: context
  });
  setContext('command_errored', context);
}
