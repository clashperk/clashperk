import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/handlers.js';

export default class NicknameConfigCommand extends Command {
  public constructor() {
    super('nickname-refresh', {
      category: 'setup',
      channel: 'guild',
      userPermissions: ['ManageGuild'],
      clientPermissions: ['EmbedLinks', 'ManageNicknames'],
      defer: true,
      ephemeral: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>) {
    const command = this.handler.getCommand('autorole-refresh');
    return this.handler.exec(interaction, command!, { nickname_only: true });
  }
}
