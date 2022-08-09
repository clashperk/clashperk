import { stringify } from 'querystring';
import { CommandInteraction } from 'discord.js';
import { Listener, Command } from '../../lib/index.js';
import { CommandHandlerEvents } from '../../lib/util.js';
import { BIT_FIELD } from '../../util/Constants.js';

const texts: Record<string, string> = {
	guild: 'You must be in a server to use this command.',
	restrict: "You can't use this command because you have been restricted.",
	permission: "I'm missing **Send/Read Messages** permission in this channel.",
	dm: 'You must use a DM channel to use this command.',
	emoji: 'You must enable `Use External Emojis` permission for @everyone role to let the bot use our custom emojis.'
};

export default class CommandBlockedListener extends Listener {
	public constructor() {
		super('commandBlocked', {
			event: CommandHandlerEvents.COMMAND_BLOCKED,
			emitter: 'commandHandler',
			category: 'commandHandler'
		});
	}

	public exec(interaction: CommandInteraction, command: Command, reason: string) {
		const content = texts[reason];
		const label = interaction.guild ? `${interaction.guild.name}/${interaction.user.tag}` : `${interaction.user.tag}`;
		this.client.logger.log(`${command.id} ~ ${reason}`, { label });

		if (!interaction.inCachedGuild() && interaction.inGuild()) {
			const query = stringify({
				client_id: interaction.applicationId,
				scope: 'bot applications.commands',
				permissions: BIT_FIELD.toString()
			});
			return interaction.reply({
				content: `Please [invite the bot](https://discord.com/api/oauth2/authorize?${query}) again to execute its commands.`,
				ephemeral: true
			});
		}

		if (!content) return;
		return interaction.reply({ content, ephemeral: true });
	}
}
