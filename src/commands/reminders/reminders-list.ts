import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/handlers.js';

export default class RemindersListCommand extends Command {
  public constructor() {
    super('reminders-list', {
      category: 'reminders',
      userPermissions: ['ManageGuild'],
      channel: 'guild',
      defer: false
    });
  }

  public exec(interaction: CommandInteraction, args: { command: string; type: string }) {
    const command = {
      create: this.handler.getCommand(`${args.type}-reminder-create`)!,
      delete: this.handler.getCommand(`${args.type}-reminder-delete`)!,
      edit: this.handler.getCommand(`${args.type}-reminder-edit`)!,
      list: this.handler.getCommand(`${args.type}-reminder-list`)!,
      now: this.handler.getCommand(`${args.type}-reminder-now`)!
    }[args.command];

    if (!command) throw Error(`Command "${args.type}" not found.`);
    return this.handler.continue(interaction, command);
  }
}
