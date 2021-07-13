import { addBreadcrumb, Severity, captureException, setContext } from '@sentry/node';
import { Listener, Command } from 'discord-akairo';
import { Message, MessageActionRow, MessageButton, TextChannel } from 'discord.js';

export default class ErrorListener extends Listener {
	public constructor() {
		super('error', {
			event: 'error',
			emitter: 'commandHandler',
			category: 'commandHandler'
		});
	}

	public exec(error: any, message: Message, command?: Command) {
		addBreadcrumb({
			message: 'command_errored',
			category: command ? command.category.id : 'inhibitor',
			level: Severity.Error,
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
				command: command
					? {
						id: command.id,
						aliases: command.aliases,
						category: command.category.id
					}
					: null,
				message: {
					id: message.id,
					content: message.content
				}
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
				id: command?.id,
				aliases: command?.aliases,
				category: command?.category.id
			},
			message: {
				id: message.id,
				content: message.content
			}
		});

		captureException(error);

		const label = message.guild ? `${message.guild.name}/${message.author.tag}` : `${message.author.tag}`;
		this.client.logger.error(`${command!.id} ~ ${error.toString() as string}`, { label });
		this.client.logger.error(error, { label });

		if (message.guild ? (message.channel as TextChannel).permissionsFor(this.client.user!)?.has('SEND_MESSAGES') : true) {
			return message.channel.send({
				content: [
					'\\❌ Something went wrong, report us!',
					`\`\`\`\n${error.toString() as string}\`\`\``
				].join('\n'),
				components: [
					new MessageActionRow()
						.addComponents(
							new MessageButton()
								.setStyle('LINK')
								.setLabel('Contact Support')
								.setURL('https://discord.gg//ppuppun')
						)
				]
			});
		}
	}
}
