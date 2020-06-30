const { Listener } = require('discord-akairo');
const { addBreadcrumb, Severity, captureException, setContext } = require('@sentry/node');
const { emoji } = require('../../util/emojis');

class ErrorListener extends Listener {
	constructor() {
		super('error', {
			event: 'error',
			emitter: 'commandHandler',
			category: 'commandHandler'
		});
	}

	async exec(error, message, command) {
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
			extra: {
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
				}
			}
		});

		captureException(error);

		const label = message.guild ? `${message.guild.name}/${message.author.tag}` : `${message.author.tag}`;
		this.client.logger.error(`${command.id} ~ ${error}`, { label });
		this.client.logger.error(error, { label });

		if (message.guild ? message.channel.permissionsFor(this.client.user).has('SEND_MESSAGES') : true) {
			await message.channel.send([
				`${emoji.wrong} Something went wrong, report us!`,
				`\`\`\`${error.toString()}\`\`\``
			]);
		}
	}
}

module.exports = ErrorListener;
