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
import { Command, Listener } from '../../lib/handlers.js';

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

    this.client.logger.error(`${command?.id ?? 'unknown'} ~ ${error.toString()}`, { label });
    console.error(inspect(error, { depth: Infinity }));

    const context = {
      user: {
        id: interaction.user.id,
        displayName: interaction.user.displayName,
        username: interaction.user.username
      },
      guild: interaction.guild
        ? { id: interaction.guild.id, name: interaction.guild.name, locale: interaction.guildLocale }
        : interaction.guildId,
      channel: interaction.channel ? { id: interaction.channel.id, type: ChannelType[interaction.channel.type] } : interaction.channelId,
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
    captureException(error);

    const content =
      interaction.inCachedGuild() && !interaction.channel
        ? 'Something went wrong while executing this command. (most likely the bot is missing **View Channel** permission in this channel)'
        : `${this.i18n('common.something_went_wrong', { lng: interaction.locale })}`;

    const message = {
      content,
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel(this.i18n('common.contact_support', { lng: interaction.locale }))
            .setURL('https://discord.gg//ppuppun')
        )
      ],
      ephemeral: true
    };

    try {
      if (!interaction.deferred) return await interaction.reply(message);
      return await interaction.followUp(message);
    } catch (err) {
      this.client.logger.error(`${(err as DiscordAPIError).toString()}`, { label: 'ERRORED' });
    }
  }
}
