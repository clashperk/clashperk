const { Command } = require('discord-akairo');

class HelpCommand extends Command {
	constructor() {
		super('help', {
			aliases: ['help', 'commands'],
			category: 'hidden',
			clientPermissions: ['EMBED_LINKS'],
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
				examples: ['', 'clan', 'compo']
			}
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
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
			.setColor(this.client.embed(message))
			.setDescription([
				`\`${prefix}${command.aliases[0].replace(/-/g, '')} ${description.usage}\``,
				'',
				Array.isArray(description.content)
					? description.content.join('\n')
						.replace(/{prefix}/g, `\\${prefix}`)
					: description.content.replace(/{prefix}/g, `\\${prefix}`)
			]);

		if (command.aliases.length > 1) {
			embed.setDescription([
				embed.description,
				'',
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

		if (description.image) {
			embed.setDescription([
				embed.description,
				'',
				Array.isArray(description.image.text)
					? description.image.text.join('\n')
					: description.image.text
			]);
			embed.setImage(description.image.url);
		}

		return message.util.send({ embed });
	}

	async execCommandList(message) {
		const pages = [
			{
				setup: 'Clan Management',
				activity: 'Clan Activity',
				cwl: 'War and CWL',
				search: 'Clash Search'
			},
			{
				profile: 'Profile',
				other: 'Other',
				config: 'Config',
				util: 'Util'
			}
		];

		let page = 0;
		const embed = this.execHelpList(message, pages[page]);
		const msg = await message.util.send({ embed });

		for (const emoji of ['⬅️', '➡️', '➕']) {
			await msg.react(emoji);
			await this.delay(250);
		}

		// .setFooter(`Page ${page + 1}/2`, this.client.user.displayAvatarURL())
		const collector = msg.createReactionCollector(
			(reaction, user) => ['➕', '⬅️', '➡️'].includes(reaction.emoji.name) && user.id === message.author.id,
			{ time: 90000, max: 10 }
		);

		collector.on('collect', async reaction => {
			if (reaction.emoji.name === '➡️') {
				page += 1;
				if (page < 0) page = 1;
				if (page > 1) page = 0;

				await msg.edit({ embed: this.execHelpList(message, pages[page]) });
				await this.delay(250);
				return reaction.users.remove(message.author.id);
			}

			if (reaction.emoji.name === '⬅️') {
				page -= 1;
				if (page < 0) page = 1;
				if (page > 1) page = 0;

				await msg.edit({ embed: this.execHelpList(message, pages[page]) });
				await this.delay(250);
				return reaction.users.remove(message.author.id);
			}

			if (reaction.emoji.name === '➕') {
				if (page === 0) page = 1;
				else if (page === 1) page = 0;

				await collector.stop();
				return message.channel.send({
					embed: this.execHelpList(message, pages[page])
				});
			}
		});

		collector.on('end', () => msg.reactions.removeAll().catch(() => null));
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	execHelpList(message, option) {
		const prefix = this.handler.prefix(message);
		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor('Command List', this.client.user.displayAvatarURL())
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
						return `**\`${prefix}${cmd.aliases[0].replace(/-/g, '')}\`**\n${description.replace(/{prefix}/g, `\\${prefix}`)}`;
					})
					.join('\n')
			]);
		}

		embed.addField('\u200b', [
			'**[Join Support Discord](https://discord.gg/ppuppun)** | **[Support us on Patreon](https://www.patreon.com/join/clashperk)**'
		]);
		return embed;
	}
}

module.exports = HelpCommand;
