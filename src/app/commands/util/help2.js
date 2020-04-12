const { Command } = require('discord-akairo');

class HelpCommand extends Command {
	constructor() {
		super('help2', {
			aliases: ['help2'],
			category: 'util',
			clientPermissions: ['EMBED_LINKS'],
			cooldown: 1000,
			args: [
				{
					id: 'command',
					type: 'commandAlias'
				}
			],
			description: {
				content: 'Displays a list of commands or info about a command.',
				usage: '[command]',
				examples: ['', 'start']
			}
		});
	}

	exec(message, { command }) {
		if (!command) return this.execCommandList(message);

		const prefix = this.handler.prefix(message);
		const description = Object.assign({
			content: 'No description available.',
			usage: '',
			image: '',
			examples: [],
			fields: []
		}, command.description);

		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setTitle(`\`${prefix}${command.aliases[0].replace(/-/g, '')} ${description.usage}\``)
			.setImage(description.image)
			.addField('Description', description.content);

		for (const field of description.fields) embed.addField(field.name, field.value);

		if (description.examples.length) {
			const text = `${prefix}${command.aliases[0].replace(/-/g, '')}`;
			embed.addField('Examples', `\`${text} ${description.examples.join(`\`\n\`${text} `)}\``, true);
		}

		if (command.aliases.length > 1) {
			embed.addField('Aliases', `\`${command.aliases.join('` `')}\``, true);
		}

		if (command.userPermissions && command.userPermissions[0]) {
			embed.addField('User Permissions',
				`\`${command.userPermissions.join('` `').replace(/_/g, ' ').toLowerCase()
					.replace(/\b(\w)/g, char => char.toUpperCase())}\`` || null, true);
		}

		if (command.clientPermissions && command.clientPermissions[0]) {
			embed.addField('Client Permissions',
				`\`${command.clientPermissions.join('` `').replace(/_/g, ' ').toLowerCase()
					.replace(/\b(\w)/g, char => char.toUpperCase())}\`` || null, true);
		}

		return message.util.send({ embed });
	}

	async execCommandList(message) {
		const prefix = this.handler.prefix(message);
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor('Command List')
			.setDescription([
				`To view details for a command, do \`${prefix}help <command>\``,
				'Official Discord: https://discord.gg/ppuppun'
			]);

		for (const categories of this.handler.categories.values()) {
			for (const command of categories[0]) {
				if (command.aliases.length) {
					embed.addField(`\`${prefix}${command.aliases[0].replace(/-/g, '')}\``, [
						command.description.content.toLowerCase()
					]);
				}
			}

			// if (title) embed.addField(title, `${category.filter(cmd => cmd.aliases.length > 0).map(cmd => `\`${prefix}${cmd.aliases[0].replace(/-/g, '')}\` - ${cmd.description.content.toLowerCase()}`).join('\n')}`);
		}

		return message.util.send({ embed });
	}
}

module.exports = HelpCommand;
