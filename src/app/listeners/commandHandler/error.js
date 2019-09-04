const { Listener } = require('discord-akairo');
const Logger = require('../../util/logger');
const { addBreadcrumb, Severity, captureException } = require('@sentry/node');

class ErrorListener extends Listener {
	constructor() {
		super('error', {
			event: 'error',
			emitter: 'commandHandler',
			category: 'commandHandler'
		});
	}

	async exec(error, message, command) {
		const level = message.guild ? `${message.guild.name}/${message.author.tag}` : `${message.author.tag}`;
		Logger.error(`${command.id} ~ ${error}`, { level });
		Logger.stacktrace(error);

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
		captureException(error);

		if (message.guild ? message.channel.permissionsFor(this.client.user).has('SEND_MESSAGES') : true) {
			await message.channel.send([
				`${this.client.emojis.get('545968755423838209')} Something went wrong, report us!`,
				`${this.client.emojis.get('609271613740941313')} https://discord.gg/ppuppun`,
				`\`\`\`${error.toString()}\`\`\``
			]);
		}

		const webhook = await this.client.fetchWebhook('618710060973031424').catch(() => null);
		if (!webhook) return Logger.log('WEBHOOK NOT FOUND');

		const embed = this.client.util.embed()
			.setTimestamp()
			.setColor(0xf30c11)
			.setAuthor('ClashPerk - Error');
		if (message.guild) embed.addField('Guild', `${message.guild.name} (${message.guild.id})`);
		if (message.author) embed.addField('Author', `${message.author.tag} (${message.author.id})`);
		if (command) embed.addField('Command', `\`${command.id}\``);
		if (message) embed.addField(`Message (${message.id})`, `\`${message.content}\``);
		embed.addField('Error', `\`\`\`js\n${error}\n\`\`\``);

		return webhook.send({ embeds: [embed] });
	}
}

module.exports = ErrorListener;
