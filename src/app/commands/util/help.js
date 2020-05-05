const { Command } = require('discord-akairo');
const { emoji } = require('../../util/emojis');

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
					type: 'commandAlias'
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
			.addField('Description', description.content);

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
			.setDescription(`To view details for a command, do \`${prefix}help <command>\``);

		const commands = [];
		for (const category of this.handler.categories.values()) {
			const title = {
				util: 'Util',
				cwl: 'CWL',
				activity: 'Clan Activity',
				search: 'Clash Search',
				profile: 'Profile',
				other: 'Other',
				config: 'Config'
			}[category.id];

			if (title) {
				commands.push({ id: category.id, category, title });
			}
		}

		for (const cmd of commands.filter(cmd => !['util', 'other'].includes(cmd.id)).concat(commands.filter(cmd => ['util', 'other'].includes(cmd.id)))) {
			embed.addField(cmd.title, [
				cmd.category.id === 'util' || cmd.category.id === 'other'
					? cmd.category.filter(cmd => cmd.aliases.length > 0)
						.map(cmd => `[${prefix}${cmd.aliases[0].replace(/-/g, '')}](https://clashperk.xyz) - ${cmd.description.content.toLowerCase()}`)
						.join('\n')
					: cmd.category.filter(cmd => cmd.aliases.length > 0)
						.map(cmd => `[${prefix}${cmd.aliases[0].replace(/-/g, '')}](https://clashperk.xyz) - ${cmd.description.content.toLowerCase()}`)
						.join('\n'),
				'\u200b'
			]);
		}

		embed.addField('Need more help?', [
			'What do you think about the bot?',
			'Do you have any suggestion?',
			`Please let me know [here](https://discord.gg/ppuppun) ${emoji.discord}`,
			'\n'
		].join(' '));
		embed.addField('Developer', [emoji.botdev, '[Suvajit](https://suvajit.me/)'].join(' '), true)
			.addField('Invite Link', [emoji.discord, `[${prefix}invite](https://discordapp.com/api/oauth2/authorize?client_id=526971716711350273&permissions=537259073&scope=bot)`].join(' '), true)
			.addField('Our Server', [emoji.clashperk, '[ClashPerk](https://discord.gg/ppuppun)'].join(' '), true)
			.setFooter('\u2002', this.client.user.defaultAvatarURL());


		return message.util.send({ embed });
	}
}

module.exports = HelpCommand;
