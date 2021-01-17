import { addBreadcrumb, Severity, setContext } from '@sentry/node';
import { Listener, Command } from 'discord-akairo';
import { Message } from 'discord.js';

export default class CommandStartedListener extends Listener {
	public constructor() {
		super('commandStarted', {
			event: 'commandStarted',
			emitter: 'commandHandler',
			category: 'commandHandler'
		});
	}

	public exec(message: Message, command: Command, args: any) {
		addBreadcrumb({
			message: 'command_started',
			category: command.category.id,
			level: Severity.Info,
			data: {
				user: {
					id: message.author.id,
					username: message.author.tag
				},
				guild: message.guild
					? {
						id: message.guild.id,
						name: message.guild.name
					}
					: null,
				command: {
					id: command.id,
					aliases: command.aliases,
					category: command.category.id
				},
				message: {
					id: message.id,
					content: message.content
				},
				args
			}
		});

		setContext('command_started', {
			user: {
				id: message.author.id,
				username: message.author.tag
			},
			guild: message.guild
				? {
					id: message.guild.id,
					name: message.guild.name,
					channel_id: message.channel.id
				}
				: null,
			command: {
				id: command.id,
				aliases: command.aliases,
				category: command.category.id
			},
			message: {
				id: message.id,
				content: message.content
			},
			args
		});

		const label = message.guild ? `${message.guild.name}/${message.author.tag}` : `${message.author.tag}`;
		this.client.logger.debug(`${command.id}`, { label });

		// Counters
		return this.counter(message, command);
	}

	private counter(message: Message, command: Command) {
		if (command.category.id === 'owner') return;
		if (this.client.isOwner(message.author.id)) return;
		this.client.stats.users(message.author.id);
		this.client.stats.commands(command.id);
		if (message.guild) this.client.stats.guilds(message.guild.id);
	}
}
