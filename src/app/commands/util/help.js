const { Command, Argument } = require('discord-akairo');

class HelpCommand extends Command {
	constructor() {
		super('help', {
			aliases: ['help', 'commands'],
			category: 'util',
			clientPermissions: ['EMBED_LINKS'],
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
		if (message.channel.type === 'dm' || !message.channel.permissionsFor(message.guild.me).has(['ADD_REACTIONS', 'MANAGE_MESSAGES'], false)) {
			const option = {
				setup: 'Clan Management',
				activity: 'Clan Activity',
				cwl: 'CWL',
				search: 'Clash Search',
				profile: 'Profile',
				other: 'Other',
				config: 'Config',
				util: 'Util'
			};
			const embed = await this.execHelpList(message, option);
			return message.util.send({ embed });
		}

		const option = {
			setup: 'Clan Management',
			activity: 'Clan Activity',
			cwl: 'War and CWL',
			search: 'Clash Search',
			profile: 'Profile'
		};

		const embed = await this.execHelpList(message, option);
		const msg = await message.util.send({ embed });
		await msg.react('➕');
		const collector = await msg.awaitReactions(
			(reaction, user) => reaction.emoji.name === '➕' && user.id === message.author.id,
			{ max: 1, time: 90000, errors: ['time'] }
		).catch(() => null);
		if (!msg.deleted) await msg.reactions.removeAll().catch(() => null);
		if (!collector || !collector.size) return;

		return message.channel.send({
			embed: await this.execHelpList(message, {
				other: 'Other',
				config: 'Config',
				util: 'Util'
			})
		});
	}

	async execHelpList(message, option) {
		const prefix = this.handler.prefix(message);
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor('Command List')
			.setDescription([`To view more details for a command, do \`${prefix}help <command>\``]);

		const commands = [];
		for (const category of this.handler.categories.values()) {
			const title = option[category.id];

			if (title) {
				commands[Object.values(option).indexOf(title)] = { id: category.id, category, title };
			}
		}

		for (const cmd of commands) {
			embed.addField(`**__${cmd.title}__**`, [
				cmd.category.filter(cmd => cmd.aliases.length > 0)
					.map(cmd => {
						const description = Array.isArray(cmd.description.content)
							? cmd.description.content[0]
							: cmd.description.content;
						return `\`${prefix}${cmd.aliases[0].replace(/-/g, '')}\` \n${description.replace(/{prefix}/g, `\\${prefix}`)}`;
					})
					.join('\n')
			]);
		}
		return embed;
	}
}

module.exports = HelpCommand;
