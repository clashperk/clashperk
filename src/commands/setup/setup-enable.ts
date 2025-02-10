import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/handlers.js';

export default class SetupEnableCommand extends Command {
  public constructor() {
    super('setup-enable', {
      category: 'setup',
      channel: 'guild',
      defer: false,
      userPermissions: ['ManageGuild']
    });
  }

  public exec(interaction: CommandInteraction<'cached'>, args: { action: string }) {
    const command = {
      'clan-embed': this.handler.getCommand('setup-clan-embed')!,
      'link-channel': this.handler.getCommand('setup-clan')!,
      'link-clan': this.handler.getCommand('setup-clan')!,
      'enable-logs': this.handler.getCommand('setup-clan-logs')!,
      'war-feed': this.handler.getCommand('setup-clan-logs')!,
      'last-seen': this.handler.getCommand('setup-clan-logs')!,
      'clan-games': this.handler.getCommand('setup-clan-logs')!,
      'legend-log': this.handler.getCommand('setup-clan-logs')!,
      'capital-log': this.handler.getCommand('setup-clan-logs')!,
      'clan-feed': this.handler.getCommand('setup-clan-logs')!,
      'join-leave': this.handler.getCommand('setup-clan-logs')!,
      'donation-log': this.handler.getCommand('setup-clan-logs')
    }[args.action];

    if (!command) throw Error('Command not found.');
    return this.handler.continue(interaction, command);
  }
}
