import { BIT_FIELD } from '@app/constants';
import { CommandInteraction } from 'discord.js';
import { Command, Listener } from '../../lib/handlers.js';
import { CommandHandlerEvents } from '../../lib/util.js';

const texts: Record<string, string> = {
  guild: 'You must be in a server to use this command.',
  whitelist: 'This command was whitelisted for specific users or roles. Ask the server owner to grant you access.',
  restrict: "You can't use this command because you have been restricted.",
  permission: "I'm missing **Send/Read Messages** permission in this channel.",
  dm: 'You must use a DM channel to use this command.',
  emoji: 'You must enable `Use External Emojis` permission for @everyone role to let the bot use our custom emojis.'
};

export default class CommandBlockedListener extends Listener {
  public constructor() {
    super('commandBlocked', {
      event: CommandHandlerEvents.COMMAND_BLOCKED,
      emitter: 'commandHandler',
      category: 'commandHandler'
    });
  }

  public exec(interaction: CommandInteraction, command: Command, reason: string) {
    const content = texts[reason];
    const label = interaction.guild ? `${interaction.guild.name}/${interaction.user.displayName}` : `${interaction.user.displayName}`;
    this.client.logger.log(`${command.id} ~ ${reason}`, { label });

    if (!interaction.inCachedGuild() && interaction.inGuild()) {
      const query = new URLSearchParams({
        client_id: interaction.applicationId,
        scope: 'bot applications.commands',
        permissions: BIT_FIELD.toString()
      }).toString();
      this.client.logger.log('Guild is not cached.', { label });
      return interaction.reply({
        content: `Please [invite the bot](https://discord.com/api/oauth2/authorize?${query}) again to execute its commands.`,
        ephemeral: true
      });
    }

    if (!interaction.channel) {
      const label = interaction.guild ? `${interaction.guild.name}/${interaction.user.displayName}` : `${interaction.user.displayName}`;
      this.client.logger.log(`${command.id} ~ noChannel`, { label });
      return null;
    }

    if (!content) {
      this.client.logger.log(`${command.id} ~ ${reason} (no response)`, { label });
      return null;
    }
    return interaction.reply({ content, ephemeral: true });
  }
}
