import { addBreadcrumb, Severity, captureException, setContext } from '@sentry/node';
import { Listener, Command } from '../../lib';
import { CommandInteraction, MessageActionRow, MessageButton, TextChannel } from 'discord.js';

export default class ErrorListener extends Listener {
	public constructor() {
		super('error', {
			event: 'error',
			emitter: 'commandHandler',
			category: 'commandHandler'
		});
	}

	public exec(error: Error, interaction: CommandInteraction, command?: Command) {
		const label = interaction.guild ? `${interaction.guild.name}/${interaction.user.tag}` : `${interaction.user.tag}`;
		// eslint-disable-next-line @typescript-eslint/no-base-to-string
		this.client.logger.error(`${command?.id ?? 'unknown'} ~ ${error.toString()}`, { label });
		console.error(error);

		addBreadcrumb({
			message: 'command_errored',
			category: command ? command.category : 'inhibitor',
			level: Severity.Error,
			data: {
				user: {
					id: interaction.user.id,
					username: interaction.user.tag
				},
				guild: interaction.guild
					? {
							id: interaction.guild.id,
							name: interaction.guild.name
					  }
					: null,
				command: command
					? {
							id: command.id,
							category: command.category
					  }
					: null,
				interaction: {
					id: interaction.id,
					content: interaction.commandName
				}
			}
		});

		setContext('command_started', {
			user: {
				id: interaction.user.id,
				username: interaction.user.tag
			},
			guild: interaction.guild
				? {
						id: interaction.guild.id,
						name: interaction.guild.name,
						channel_id: interaction.channel!.id
				  }
				: null,
			command: {
				id: command?.id,
				category: command?.category
			},
			interaction: {
				id: interaction.id,
				content: interaction.commandName
			}
		});

		captureException(error);

		if (interaction.guild ? (interaction.channel as TextChannel).permissionsFor(this.client.user!)?.has('SEND_MESSAGES') : true) {
			return interaction.followUp({
				// eslint-disable-next-line @typescript-eslint/no-base-to-string
				content: ['\\❌ Something went wrong while executing that command.', `\`\`\`\n${error.toString()}\`\`\``].join('\n'),
				components: [
					new MessageActionRow().addComponents(
						new MessageButton().setStyle('LINK').setLabel('Contact Support').setURL('https://discord.gg//ppuppun')
					)
				],
				ephemeral: true
			});
		}
	}
}
