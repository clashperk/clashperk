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
		const suggested = await this.client.stats.featureSuggested(interaction);
		if (!suggested) {
			const msg = await interaction.followUp({
				content: stripIndent`
				- **Checkout the new Features!**

				- **Legend Tracking**
					- Attacks summary and daily log.

				- **Automatic Roles**
					- Clan roles
					- League roles
					- Town Hall roles

				- **Reminder**
					- Capital raid reminder
					- Clan games reminder
					- Supports war end, war start, war cc fill-up reminders
					- All type of filters imaginable.

				- [Join Support Server to know more!](https://discord.gg/ppuppun)
				`,
				ephemeral: false
			});
			setTimeout(() => msg.delete().catch(() => null), 1000 * 60 * 2).unref();
		}
	}
}
