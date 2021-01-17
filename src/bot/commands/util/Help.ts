import { Message, PermissionString, TextChannel } from 'discord.js';
import { Command, PrefixSupplier } from 'discord-akairo';

interface Description {
	content: string;
	usage: string;
	image?: {
		text: string;
		url: string;
	};
	fields: string[];
	examples: string[];
}

export default class HelpCommand extends Command {
	public constructor() {
		super('help', {
			aliases: ['help', 'commands'],
			category: 'hidden',
			clientPermissions: ['EMBED_LINKS', 'MANAGE_MESSAGES'],
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

	public exec(message: Message, { command }: { command: Command | null }) {
		if (!command) return this.execCommandList(message);

		const prefix = (this.handler.prefix as PrefixSupplier)(message) as string;
		const description: Description = Object.assign({
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

		if (command.userPermissions) {
			embed.setDescription([
				embed.description,
				'',
				`**Required Permission${(command.userPermissions as PermissionString[]).length === 1 ? '' : 's'}**`,
				(command.userPermissions as PermissionString[]).join('\n')
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

		return message.util!.send({ embed });
	}

	private async execCommandList(message: Message) {
		const pages = [
			{
				setup: 'Clan Management',
				activity: 'Clan Activity',
				cwl: 'War and CWL',
				search: 'Clash Search'
			},
			{
				profile: 'Profile',
				flag: 'Flags',
				other: 'Other',
				config: 'Config',
				util: 'Util'
			}
		];

		if (!(message.channel as TextChannel).permissionsFor(message.guild!.me!)!.has(['ADD_REACTIONS', 'MANAGE_MESSAGES'], false)) {
			return pages.map(async (_, page) => message.util!.send({ embed: this.execHelpList(message, pages[page]) }));
		}

		let page = 0;
		const embed = this.execHelpList(message, pages[page]);
		const msg = await message.util!.send({ embed });

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

				collector.stop();
				return message.channel.send({
					embed: this.execHelpList(message, pages[page])
				});
			}
		});

		collector.on('end', () => msg.reactions.removeAll().catch(() => null));
	}

	private async delay(ms: number) {
		return new Promise(res => setTimeout(res, ms));
	}

	private execHelpList(message: Message, option: any) {
		const prefix = (this.handler.prefix as PrefixSupplier)(message) as string;
		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor('Command List', this.client.user!.displayAvatarURL())
			.setDescription([`To view more details for a command, do \`${prefix}help <command>\``]);

		const commands = [];
		for (const category of this.handler.categories.values()) {
			const title = option[category.id];

			if (title) {
				commands[Object.values(option).indexOf(title)] = { id: category.id, category, title };
			}
		}

		for (const cmd of commands) {
			embed.addField(`**__${cmd.title as string}__**`, [
				cmd.category.filter(cmd => cmd.aliases.length > 0)
					.map(cmd => {
						const description = Array.isArray(cmd.description.content)
							? cmd.description.content[0]
							: cmd.description.content;
						return `**\`${prefix}${cmd.aliases[0].replace(/-/g, '')}\`**\n${description.replace(/{prefix}/g, `\\${prefix}`) as string}`;
					})
					.join('\n')
			]);
		}

		embed.addField('\u200b', [
			'**[Join Support Discord](https://discord.gg/ppuppun)** | **[Support us on Patreon](https://www.patreon.com/clashperk)**'
		]);
		return embed;
	}
}
