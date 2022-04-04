import { addBreadcrumb, Severity, setContext } from '@sentry/node';
import { Listener, Command } from '../../lib';
import { CommandInteraction } from 'discord.js';
import { CommandHandlerEvents } from '../../lib/util';

export default class CommandStartedListener extends Listener {
	public constructor() {
		super(CommandHandlerEvents.COMMAND_EXECUTED, {
			event: CommandHandlerEvents.COMMAND_EXECUTED,
			emitter: 'commandHandler',
			category: 'commandHandler'
		});
	}

	public exec(interaction: CommandInteraction, command: Command, args: unknown) {
		addBreadcrumb({
			message: 'command_started',
			category: command.category,
			level: Severity.Info,
			data: {
				user: {
					id: interaction.user.id,
					username: interaction.user.tag
				},
				guild: interaction.guild ? { id: interaction.guild.id, name: interaction.guild.name } : null,
				command: {
					id: command.id,
					category: command.category
				},
				interaction: {
					id: interaction.id,
					command: interaction.commandName
				},
				args
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
						channel_id: interaction.channel?.id ?? null
				  }
				: null,
			command: {
				id: command.id,
				category: command.category
			},
			interaction: {
				id: interaction.id,
				command: interaction.commandName
			},
			args
		});

		const label = interaction.guild ? `${interaction.guild.name}/${interaction.user.tag}` : `${interaction.user.tag}`;
		this.client.logger.debug(`${command.id}`, { label });
		return this.counter(interaction, command);
	}

	private counter(interaction: CommandInteraction, command: Command) {
		if (interaction.inCachedGuild()) this.client.stats.interactions(interaction, command.id);
		if (command.category === 'owner') return;
		if (this.client.isOwner(interaction.user.id)) return;
		this.client.stats.users(interaction.user);
		this.client.stats.commands(command.id);
		if (interaction.guild) this.client.stats.guilds(interaction.guild);
	}
}
