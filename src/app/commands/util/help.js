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
			.setDescription([
				`\`${prefix}${command.aliases[0].replace(/-/g, '')} ${description.usage}\``,
				'',
				Array.isArray(description.content)
					? description.content.join('\n')
						.replace(/{prefix}/g, `\\${prefix}`)
					: description.content.replace(/{prefix}/g, `\\${prefix}`)
			]);

		if (description.image) embed.setImage(description.image);

		const fields = [];
		for (const field of description.fields) fields.push(...[`**${field.name}**`, field.value, '']);

		embed.setDescription([embed.description, '', ...fields]);

		if (command.aliases.length > 1) {
			embed.setDescription([
				embed.description,
				'**Aliases**',
				`\`${command.aliases.join('`, `')}\``
			]);
		}

		if (description.examples.length) {
			const cmd = `${prefix}${command.aliases[0].replace(/-/g, '')}`;
			embed.setDescription([
				embed.description,
				'',
				'**Examples**',
				`\`${cmd} ${description.examples.join(`\`\n\`${cmd} `)}\``
			]);
		}

		if (command.userPermissions && command.userPermissions[0]) {
			embed.setDescription([
				embed.description,
				'',
				`**Required Permission${command.userPermissions.length === 1 ? '' : 's'}**`,
				command.userPermissions.join('\n')
					.replace(/_/g, ' ')
					.toLowerCase()
					.replace(/\b(\w)/g, char => char.toUpperCase())
			]);
		}

		return message.util.send({ embed });
	}

	async execCommandList(message) {
		const prefix = this.handler.prefix(message);
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor('Command List')
			.setDescription([`To view more details for a command, do \`${prefix}help <command>\``]);

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
					.map(cmd => {
						const description = Array.isArray(cmd.description.content)
							? cmd.description.content[0]
							: cmd.description.content;
						return `[${prefix}${cmd.aliases[0].replace(/-/g, '')}](https://clashperk.xyz#${cmd.id}) - ${description.toLowerCase().replace(/{prefix}/g, `\\${prefix}`)}`;
					})
					.join('\n')
			]);
		}
		embed.setFooter('For more info click on the commands!');
		return message.util.send({ embed });
	}
}

module.exports = HelpCommand;
