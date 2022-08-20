import { CommandInteraction, MessageComponentInteraction } from 'discord.js';
import { Listener, Command } from '../../lib/index.js';
import { CommandHandlerEvents } from '../../lib/util.js';
import { locales } from '../../util/Constants.js';

export default class CommandEndedListener extends Listener {
	public constructor() {
		super(CommandHandlerEvents.COMMAND_ENDED, {
			event: CommandHandlerEvents.COMMAND_ENDED,
			emitter: 'commandHandler',
			category: 'commandHandler'
		});
	}

	public async exec(interaction: MessageComponentInteraction | CommandInteraction, _command: Command, _args: unknown) {
		const suggested = await this.client.stats.localeSuggested(interaction);
		if (!suggested) {
			await interaction.followUp({
				content: [
					`Do you want the bot in **${locales[interaction.locale] || interaction.locale}** language?`,
					'Help us with the translation on [Crowdin.](https://crowdin.com/project/clashperk) Join our [support server](https://discord.gg/ppuppun) to get more details.'
				].join('\n'),
				ephemeral: true
			});
		}
	}
}
