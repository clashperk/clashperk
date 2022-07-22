import { addBreadcrumb, setContext } from '@sentry/node';
import { BaseCommandInteraction, Interaction, MessageComponentInteraction } from 'discord.js';
import { Listener, Command } from '../../lib';
import { CommandHandlerEvents } from '../../lib/util';

export default class CommandStartedListener extends Listener {
	public constructor() {
		super(CommandHandlerEvents.COMMAND_STARTED, {
			event: CommandHandlerEvents.COMMAND_STARTED,
			emitter: 'commandHandler',
			category: 'commandHandler'
		});
	}

	public exec(interaction: MessageComponentInteraction | BaseCommandInteraction, command: Command, args: unknown) {
		addBreadcrumb({
			message: 'command_started',
			category: command.category,
			level: 'info',
			data: {
				user: {
					id: interaction.user.id,
					username: interaction.user.tag
				},
				guild: interaction.guild ? { id: interaction.guild.id, name: interaction.guild.name } : null,
				channel: interaction.channel?.id ?? null,
				command: {
					id: command.id,
					category: command.category
				},
				interaction: {
					id: interaction.id,
					command: interaction.isApplicationCommand() ? interaction.commandName : null,
					customId: interaction.isMessageComponent() ? interaction.customId : null
				},
				args
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
				id: command.id,
				category: command.category
			},
			interaction: {
				id: interaction.id,
				command: interaction.isApplicationCommand() ? interaction.commandName : null,
				customId: interaction.isMessageComponent() ? interaction.customId : null
			},
			args
		});

		const label = interaction.guild ? `${interaction.guild.name}/${interaction.user.tag}` : `${interaction.user.tag}`;
		this.client.logger.debug(`${command.id}`, { label });
		return this.counter(interaction, command);
	}

	private counter(interaction: Interaction, command: Command) {
		if (interaction.inCachedGuild()) this.client.stats.interactions(interaction, command.id);
		if (command.category === 'owner') return;
		if (this.client.isOwner(interaction.user.id)) return;
		this.client.stats.users(interaction);
		this.client.stats.commands(command.id);
		if (interaction.inCachedGuild()) this.client.stats.guilds(interaction.guild);
	}
}
