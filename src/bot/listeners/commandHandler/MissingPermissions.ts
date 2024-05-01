import { TextChannel, PermissionsString, User, Interaction, AutocompleteInteraction } from 'discord.js';
import { Listener, Command } from '../../lib/index.js';
import { BOT_MANAGER_HYPERLINK, missingPermissions } from '../../util/Constants.js';

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
        const name = this.missingPermissions(interaction.channel as TextChannel, this.client.user!, missing);
        return `I'm missing ${name} to execute this command.`;
      },
      user: () => {
        const name = this.missingPermissions(interaction.channel as TextChannel, interaction.user, missing);
        return `You are missing the ${name} or the ${BOT_MANAGER_HYPERLINK} role to use this command.`;
      }
    }[type];

    const label = interaction.guild ? `${interaction.guild.name}/${interaction.user.displayName}` : `${interaction.user.displayName}`;
    this.client.logger.debug(`${command.id} ~ ${type}Permissions`, { label });

    return interaction.reply({ content: text(), ephemeral: true });
  }

  private missingPermissions(channel: TextChannel, user: User, permissions: PermissionsString[]) {
    return missingPermissions(channel, user, permissions).missingPerms;
  }
}
