import { addBreadcrumb, captureException, setContext } from '@sentry/node';
import {
  ActionRowBuilder,
  AutocompleteInteraction,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  DiscordAPIError,
  Interaction,
  InteractionType
} from 'discord.js';
import { inspect } from 'node:util';
import { Command, Listener } from '../../lib/index.js';

export default class ErrorListener extends Listener {
  public constructor() {
    super('commandHandlerError', {
      event: 'error',
      emitter: 'commandHandler',
      category: 'commandHandler'
    });
  }

  public async exec(error: Error, interaction: Exclude<Interaction, AutocompleteInteraction>, command?: Command) {
    const label = interaction.guild ? `${interaction.guild.name}/${interaction.user.displayName}` : `${interaction.user.displayName}`;
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    this.client.logger.error(`${command?.id ?? 'unknown'} ~ ${error.toString()}`, { label });
    console.error(inspect(error, { depth: Infinity }));

    addBreadcrumb({
      message: 'command_errored',
      category: command ? command.category : 'inhibitor',
      level: 'error',
      data: {
        user: {
          id: interaction.user.id,
          displayName: interaction.user.displayName,
          username: interaction.user.username
        },
        guild: interaction.guild ? { id: interaction.guild.id, name: interaction.guild.name } : interaction.guildId,
        channel: interaction.channel ? { id: interaction.channel.id, type: ChannelType[interaction.channel.type] } : interaction.channelId,
        command: {
          id: command?.id,
          category: command?.category
        },
        interaction: {
          id: interaction.id,
          type: InteractionType[interaction.type],
          command: interaction.isCommand() ? interaction.commandName : null,
          customId: interaction.isMessageComponent() ? interaction.customId : null
        }
      }
    });

    setContext('command_errored', {
      user: {
        id: interaction.user.id,
        username: interaction.user.username,
        displayName: interaction.user.displayName
      },
      guild: interaction.guild ? { id: interaction.guild.id, name: interaction.guild.name } : null,
      channel: interaction.channel ? { id: interaction.channel.id, type: ChannelType[interaction.channel.type] } : interaction.channelId,
      command: {
        id: command?.id,
        category: command?.category
      },
      interaction: {
        id: interaction.id,
        type: InteractionType[interaction.type],
        command: interaction.isCommand() ? interaction.commandName : null,
        customId: interaction.isMessageComponent() ? interaction.customId : null
      }
    });

    captureException(error);

    const message = {
      content: `${this.i18n('common.something_went_wrong', { lng: interaction.locale })}`,
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel(this.i18n('component.button.contact_support', { lng: interaction.locale }))
            .setURL('https://discord.gg//ppuppun')
        )
      ],
      ephemeral: true
    };

    try {
      if (!interaction.deferred) return await interaction.reply(message);
      return await interaction.followUp(message);
    } catch (err) {
      // eslint-disable-next-line
			this.client.logger.error(`${(err as DiscordAPIError).toString()}`, { label: 'ERRORED' });
    }
  }
}
