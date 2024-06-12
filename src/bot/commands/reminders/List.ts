import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class RemindersListCommand extends Command {
  public constructor() {
    super('reminders-list', {
      category: 'reminders',
      channel: 'guild',
      defer: false
    });
  }

  public exec(interaction: CommandInteraction, args: { command: string; type: string }) {
    const command = {
      create: this.handler.modules.get(`${args.type}-reminder-create`)!,
      delete: this.handler.modules.get(`${args.type}-reminder-delete`)!,
      edit: this.handler.modules.get(`${args.type}-reminder-edit`)!,
      list: this.handler.modules.get(`${args.type}-reminder-list`)!,
      now: this.handler.modules.get(`${args.type}-reminder-now`)!
    }[args.command];

    if (!command) throw Error('Command not found.');
    return this.handler.continue(interaction, command);
  }
}
