import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/handlers.js';

export default class SetupEnableCommand extends Command {
  public constructor() {
    super('setup-enable', {
      category: 'hidden',
      channel: 'guild',
      defer: false,
      userPermissions: ['ManageGuild']
    });
  }

  public exec(interaction: CommandInteraction<'cached'>) {
    return interaction.reply({
      content: `This command has been replaced with ${this.client.commands.get('/setup clan')} and ${this.client.commands.get('/setup clan-embed')}`,
      ephemeral: true
    });
  }
}
