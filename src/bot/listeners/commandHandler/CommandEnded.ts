import { stripIndent } from 'common-tags';
import { CommandInteraction, MessageComponentInteraction } from 'discord.js';
import { Listener, Command } from '../../lib/index.js';
import { CommandHandlerEvents } from '../../lib/util.js';

export default class CommandEndedListener extends Listener {
  public constructor() {
    super(CommandHandlerEvents.COMMAND_ENDED, {
      event: CommandHandlerEvents.COMMAND_ENDED,
      emitter: 'commandHandler',
      category: 'commandHandler'
    });
  }

  public async exec(interaction: MessageComponentInteraction | CommandInteraction, _command: Command, _args: unknown) {
    if (!interaction.isCommand()) return;
    const suggested = 0 + 1; // await this.client.stats.featureSuggested(interaction);
    if (suggested > 10) {
      const msg = await interaction.followUp({
        content: stripIndent`
				- **Checkout the new Features!**

				- **Legend Tracking**
					- Attacks summary and daily log.
					- </legend days:1061698815356325910>
					- </legend attacks:1061698815356325910>

				- **Automatic Roles**
					- Clan roles
					- League roles
					- Town Hall roles

				- **Reminder**
					- Capital raid reminder
					- Clan games reminder
					- Supports war end, war start, war cc fill-up reminders
					- All type of filters imaginable.

				- **Summary**
					- </summary best:813041692188999707>

				- **Raid Weekend Card**
					<https://i.imgur.com/aSr4uIE.jpg>

				- **Player Attack History**
					<https://app.clashperk.com/members/%23QYG8UQLC>

				- [Join Support Server to know more!](https://discord.gg/ppuppun)
				`,
        ephemeral: false
      });
      setTimeout(() => msg.delete().catch(() => null), 1000 * 60 * 2).unref();
    }
  }
}
