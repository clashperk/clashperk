import { BOT_MANAGER_HYPERLINK, mapMissingPermissions, missingPermissions } from '@app/constants';
import { AutocompleteInteraction, Interaction, MessageFlags, PermissionsString, TextChannel, User } from 'discord.js';
import { Command, Listener } from '../../lib/handlers.js';

export default class MissingPermissionsListener extends Listener {
  public constructor() {
    super('missingPermissions', {
      event: 'missingPermissions',
      emitter: 'commandHandler',
      category: 'commandHandler'
    });
  }

  public exec(
    interaction: Exclude<Interaction, AutocompleteInteraction>,
    command: Command,
    type: 'user' | 'client',
    missing: PermissionsString[]
  ) {
    const text = {
      client: () => {
        const name = mapMissingPermissions(missing).missingPerms;
        return `The bot is missing ${name} to execute this command.`;
      },
      user: () => {
        const name = this.missingPermissions(interaction.channel as TextChannel, interaction.user, missing);
        return `You are missing the ${name} or the ${BOT_MANAGER_HYPERLINK} role to use this command.`;
      }
    }[type];

    const label = interaction.guild ? `${interaction.guild.name}/${interaction.user.displayName}` : `${interaction.user.displayName}`;
    this.client.logger.log(`${command.id} ~ ${type}Permissions (${missing.join(', ')})`, { label });

    return interaction.reply({ content: text(), flags: MessageFlags.Ephemeral });
  }

  private missingPermissions(channel: TextChannel, user: User, permissions: PermissionsString[]) {
    return missingPermissions(channel, user, permissions).missingPerms;
  }
}
