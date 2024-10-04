import { CommandInteraction } from 'discord.js';
import { Args, Command } from '../../lib/handlers.js';

export default class HistoryCommand extends Command {
  public constructor() {
    super('history', {
      category: 'summary',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: false
    });
  }

  public args(): Args {
    return {
      player: {
        id: 'tag',
        match: 'STRING'
      }
    };
  }

  public exec(interaction: CommandInteraction, args: { option: string }) {
    const command = {
      'cwl-attacks': this.handler.getCommand('cwl-attacks-history')!,
      'war-attacks': this.handler.getCommand('war-attacks-history')!,
      'capital-raids': this.handler.getCommand('capital-raids-history')!,
      'capital-contribution': this.handler.getCommand('capital-contribution-history')!,
      'clan-games': this.handler.getCommand('clan-games-history')!,
      'join-leave': this.handler.getCommand('join-leave-history')!,
      'donations': this.handler.getCommand('donations-history')!,
      'eos-trophies': this.handler.getCommand('eos-trophies-history')!,
      'attacks': this.handler.getCommand('attacks-history')!,
      'loot': this.handler.getCommand('loot-history')!,
      'legend-attacks': this.handler.getCommand('history-legend-attacks')!
    }[args.option];

    if (!command) throw Error('Command not found.');
    return this.handler.continue(interaction, command);
  }
}
