import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/handlers.js';

/** @deprecated */
export default class SetupUtilityCommand extends Command {
  public constructor() {
    super('setup-utility', {
      category: 'none',
      channel: 'guild',
      defer: false,
      ephemeral: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { option: string }) {
    const command = {
      'reminder-ping-exclusion': this.client.commands.get('/reminders config'),
      'role-refresh-button': this.client.commands.get('/setup buttons'),
      'link-button': this.client.commands.get('/setup buttons'),
      'events-schedular': this.client.commands.get('/setup events'),
      'flag-alert-log': this.client.commands.get('/setup server-logs'),
      'roster-changelog': this.client.commands.get('/setup server-logs'),
      'maintenance-break-log': this.client.commands.get('/setup server-logs')
    }[args.option];

    if (!command) {
      return interaction.reply({ content: 'This command is no longer supported.', ephemeral: true });
    }

    return interaction.reply({ content: `This command is no longer supported. Use ${command} instead.`, ephemeral: true });
  }
}
