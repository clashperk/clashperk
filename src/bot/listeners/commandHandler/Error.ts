import { inspect } from 'util';
import { addBreadcrumb, captureException, setContext } from '@sentry/node';
import { BaseCommandInteraction, DiscordAPIError, MessageActionRow, MessageButton, MessageComponentInteraction } from 'discord.js';
import { Listener, Command } from '../../lib/index.js';

export default class ErrorListener extends Listener {
	public constructor() {
		super('error', {
			event: 'error',
			emitter: 'commandHandler',
			category: 'commandHandler'
		});
	}

	public async exec(error: Error, interaction: MessageComponentInteraction | BaseCommandInteraction, command?: Command) {
		const label = interaction.guild ? `${interaction.guild.name}/${interaction.user.tag}` : `${interaction.user.tag}`;
		// eslint-disable-next-line @typescript-eslint/no-base-to-string
		this.client.logger.error(`${command?.id ?? 'unknown'} ~ ${error.toString()}`, { label });
		console.error(inspect(error, { depth: Infinity }));

		addBreadcrumb({
			message: 'command_errored',
			category: command ? command.category : 'inhibitor',
			level: 'error',
			data: {
				user: {
					id: interaction.user.id,
					username: interaction.user.tag
				},
				guild: interaction.guild ? { id: interaction.guild.id, name: interaction.guild.name } : null,
				channel: interaction.channel?.id ?? null,
				command: {
					id: command?.id,
					category: command?.category
				},
				interaction: {
					id: interaction.id,
					command: interaction.isApplicationCommand() ? interaction.commandName : null,
					customId: interaction.isMessageComponent() ? interaction.customId : null
				}
			}
		});

		setContext('command_started', {
			user: {
				id: interaction.user.id,
				username: interaction.user.tag
			},
			guild: interaction.guild ? { id: interaction.guild.id, name: interaction.guild.name } : null,
			channel: interaction.channel?.id ?? null,
			command: {
				id: command?.id,
				category: command?.category
			},
			interaction: {
				id: interaction.id,
				command: interaction.isApplicationCommand() ? interaction.commandName : null,
				customId: interaction.isMessageComponent() ? interaction.customId : null
			}
		});

		captureException(error);

		const message = {
			content: '\\❌ Something went wrong while executing that command.',
			components: [
				new MessageActionRow().addComponents(
					new MessageButton().setStyle('LINK').setLabel('Contact Support').setURL('https://discord.gg//ppuppun')
				)
			],
			ephemeral: true
		};

		try {
			if (!interaction.deferred) return await interaction.reply(message);
			return await interaction.followUp(message);
		} catch (err) {
			// eslint-disable-next-line
			this.client.logger.error(`${(err as DiscordAPIError).toString()}`, { label: 'ERRORED' });
		}
	}
}
