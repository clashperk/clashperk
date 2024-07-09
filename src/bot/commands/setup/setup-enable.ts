import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class SetupEnableCommand extends Command {
  public constructor() {
    super('setup-enable', {
      category: 'none',
      channel: 'guild',
      defer: false,
      userPermissions: ['ManageGuild']
    });
  }

  public exec(interaction: CommandInteraction<'cached'>, args: { option: string }) {
    const command = {
      'channel-link': this.handler.getCommand('setup-channel-link')!,
      'clan-embed': this.handler.getCommand('setup-clan-embed')!,
      'server-link': this.handler.getCommand('setup-server-link')!,
      'lastseen': this.handler.getCommand('setup-clan-log')!,
      'clan-feed': this.handler.getCommand('setup-clan-log')!,
      'donation-log': this.handler.getCommand('setup-clan-log')!,
      'clan-games': this.handler.getCommand('setup-clan-log')!,
      'war-feed': this.handler.getCommand('setup-clan-log')!,
      'legend-log': this.handler.getCommand('setup-clan-log')!,
      'capital-log': this.handler.getCommand('setup-clan-log')!,
      'join-leave': this.handler.getCommand('setup-clan-log')!
    }[args.option];

    if (!command) throw Error('Command not found.');
    return this.handler.continue(interaction, command);
  }
}
