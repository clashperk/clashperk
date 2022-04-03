import { addBreadcrumb, Severity, captureException, setContext } from '@sentry/node';
import { Listener, Command } from '../../lib';
import { CommandInteraction, DiscordAPIError, MessageActionRow, MessageButton } from 'discord.js';
import { inspect } from 'util';

export default class ErrorListener extends Listener {
	public constructor() {
		super('error', {
			event: 'error',
			emitter: 'commandHandler',
			category: 'commandHandler'
		});
	}

	public async exec(error: Error, interaction: CommandInteraction, command?: Command) {
		const label = interaction.guild ? `${interaction.guild.name}/${interaction.user.tag}` : `${interaction.user.tag}`;
		// eslint-disable-next-line @typescript-eslint/no-base-to-string
		this.client.logger.error(`${command?.id ?? 'unknown'} ~ ${error.toString()}`, { label });
		console.error(inspect(error, { depth: Infinity }));

		addBreadcrumb({
			message: 'command_errored',
			category: command ? command.category : 'inhibitor',
			level: Severity.Error,
			data: {
				user: {
					id: interaction.user.id,
					username: interaction.user.tag
				},
				guild: interaction.guild ? { id: interaction.guild.id, name: interaction.guild.name } : null,
				command: command ? { id: command.id, category: command.category } : null,
				interaction: {
					id: interaction.id,
					command: interaction.commandName
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
				command: interaction.commandName
			}
		});

		captureException(error);

		const message = {
			// eslint-disable-next-line @typescript-eslint/no-base-to-string
			content: ['\\❌ Something went wrong while executing that command.', `\`\`\`\n${error.toString()}\`\`\``].join('\n'),
			components: [
				new MessageActionRow().addComponents(
					new MessageButton().setStyle('LINK').setLabel('Contact Support').setURL('https://discord.gg//ppuppun')
				)
			],
			ephemeral: true
		};

		try {
			if (!interaction.replied) await interaction.reply(message);
			await interaction.followUp(message);
		} catch (err) {
			// eslint-disable-next-line
			this.client.logger.error(`${(err as DiscordAPIError).toString()}`, { label: 'ERRORED' });
		}
	}
}
