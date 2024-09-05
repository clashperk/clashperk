import { Interaction } from 'discord.js';
import { Command, Listener } from '../../lib/index.js';
import { CommandHandlerEvents } from '../../lib/util.js';

export default class CommandEndedListener extends Listener {
  public constructor() {
    super(CommandHandlerEvents.COMMAND_ENDED, {
      event: CommandHandlerEvents.COMMAND_ENDED,
      emitter: 'commandHandler',
      category: 'commandHandler'
    });
  }

  public async exec(interaction: Interaction, _command: Command, _args: unknown) {
    if (!interaction.isCommand()) return;
  }
}
