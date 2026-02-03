import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/handlers.js';

export default class SetupDisableCommand extends Command {
  public constructor() {
    super('setup-disable', {
      category: 'hidden',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: false
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>) {
    return interaction.reply({
      content: `This command has been replaced with ${this.client.commands.get('/setup clan')} and ${this.client.commands.get('/setup clan-embed')}`,
      ephemeral: true
    });
  }
}
