const { Command, Argument } = require('discord-akairo');

class HelpCommand extends Command {
	constructor() {
		super('help', {
			aliases: ['help', 'commands'],
			category: 'util',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			cooldown: 1000,
			args: [
				{
					id: 'command',
					match: 'content',
					type: (msg, cmd) => {
						if (!cmd) return null;
						const resolver = this.handler.resolver.type('commandAlias');
						return resolver(msg, cmd.toLocaleLowerCase().replace(/ /g, '-'));
					}
				}
			],
			description: {
				content: 'Displays info about commands.',
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
			.addField('Description', description.content.replace(/{prefix}/g, `\\${prefix}`));

		for (const field of description.fields) embed.addField(field.name, field.value);

		if (description.examples.length) {
			const text = `${prefix}${command.aliases[0].replace(/-/g, '')}`;
			embed.addField('Examples', `\`${text} ${description.examples.join(`\`\n\`${text} `)}\``);
		}

		if (command.aliases.length > 1) {
			embed.addField('Aliases', `\`${command.aliases.join('`, `')}\``);
		}

		if (command.userPermissions && command.userPermissions[0]) {
			embed.addField('User Permissions',
				`\`${command.userPermissions.join('`, `').replace(/_/g, ' ').toLowerCase()
					.replace(/\b(\w)/g, char => char.toUpperCase())}\`` || null);
		}

		if (command.clientPermissions && command.clientPermissions[0]) {
			embed.addField('Client Permissions',
				`\`${command.clientPermissions.join('`, `').replace(/_/g, ' ').toLowerCase()
					.replace(/\b(\w)/g, char => char.toUpperCase())}\`` || null);
		}

		return message.util.send({ embed });
	}

	async execCommandList(message) {
		const prefix = this.handler.prefix(message);
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor('Command List')
			.setDescription([`To view details for a command, do \`${prefix}help <command>\``, '\u200b']);

		const commands = [];
		for (const category of this.handler.categories.values()) {
			const name = {
				setup: 'Clan Management',
				activity: 'Clan Activity',
				cwl: 'CWL',
				search: 'Clash Search',
				config: 'Config',
				profile: 'Profile',
				other: 'Other',
				util: 'Util'
			};
			const title = name[category.id];

			if (title) {
				commands[Object.values(name).indexOf(title)] = { id: category.id, category, title };
			}
		}

		for (const cmd of commands) {
			embed.addField(cmd.title, [
				cmd.category.filter(cmd => cmd.aliases.length > 0)
					.map(cmd => `[${prefix}${cmd.aliases[0].replace(/-/g, '')}](https://clashperk.xyz#${cmd.id}) - ${cmd.description.content.toLowerCase().replace(/{prefix}/g, `\\${prefix}`)}`)
					.join('\n')
			]);
		}
		embed.setFooter('For more info click on the commands!');
		return message.util.send({ embed });
	}
}

module.exports = HelpCommand;
