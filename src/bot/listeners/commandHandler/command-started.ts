import { addBreadcrumb, setContext } from '@sentry/node';
import { BaseInteraction, ChannelType, Interaction, InteractionType } from 'discord.js';
import { Command, Listener } from '../../lib/index.js';
import { CommandHandlerEvents } from '../../lib/util.js';
import { mixpanel } from '../../struct/_Mixpanel.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const flattenArgs = (obj: Record<string, any>) => {
  const result: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('_') || key === 'cmd') continue;

    if (typeof value === 'object') {
      if (value?.id) result[`${key}_id`] = value.id;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result[key] = value;
    }
  }
  return result;
};

export default class CommandStartedListener extends Listener {
  public constructor() {
    super(CommandHandlerEvents.COMMAND_STARTED, {
      event: CommandHandlerEvents.COMMAND_STARTED,
      emitter: 'commandHandler',
      category: 'commandHandler'
    });
  }

  public exec(interaction: Interaction, command: Command, args: Record<string, unknown>) {
    mixpanel.track('Command used', {
      distinct_id: interaction.user.id,
      command_id: command.id,
      user_id: interaction.user.id,
      username: interaction.user.username,
      display_name: interaction.user.displayName,
      guild_id: interaction.guildId ?? '0',
      guild_name: interaction.guild?.name ?? 'DM',
      interaction_type: InteractionType[interaction.type],
      sub_command_id: args.command ?? args.option ?? null,
      args: flattenArgs(args),
      is_application_command: Boolean(interaction.isCommand() && [command.id, ...(command.aliases ?? [])].includes(interaction.commandName))
    });

    mixpanel.people.set(interaction.user.id, {
      $first_name: interaction.user.displayName,
      username: interaction.user.username,
      user_id: interaction.user.id,
      locale: interaction.locale
    });

    const context = {
      user: {
        id: interaction.user.id,
        displayName: interaction.user.displayName,
        username: interaction.user.username
      },
      guild: interaction.guild ? { id: interaction.guild.id, name: interaction.guild.name } : null,
      channel: interaction.channel ? { id: interaction.channel.id, type: ChannelType[interaction.channel.type] } : interaction.channelId,
      command: {
        id: command.id,
        category: command.category
      },
      interaction: {
        id: interaction.id,
        type: InteractionType[interaction.type],
        command: interaction.isCommand() ? interaction.commandName : null,
        customId: interaction.isMessageComponent() ? interaction.customId : null
      },
      args
    };

    addBreadcrumb({
      message: 'command_started',
      category: command.category,
      level: 'info',
      data: context
    });
    setContext('command_started', context);

    const label = interaction.guild ? `${interaction.guild.name}/${interaction.user.displayName}` : `${interaction.user.displayName}`;
    this.client.logger.debug(`${command.id}`, { label });
    return this.counter(interaction, command);
  }

  private counter(interaction: BaseInteraction, command: Command) {
    if (!interaction.inCachedGuild()) return;
    this.client.stats.interactions(interaction, command.id);
    if (command.category === 'owner') return;
    if (this.client.isOwner(interaction.user.id)) return;
    this.client.stats.users(interaction);
    this.client.stats.commands(command.id);
    if (interaction.inCachedGuild()) this.client.stats.guilds(interaction.guild);
  }
}
