import { Command, PrefixSupplier } from 'discord-akairo';
import { Message, PermissionString } from 'discord.js';

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
			category: '_hidden',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Get all commands or info about a command',
				usage: '[command]',
				examples: ['', 'clan', 'compo']
			},
			optionFlags: ['--command']
		});
	}

	public *args(msg: Message) {
		const command = yield {
			flag: '--command',
			type: 'commandAlias',
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase'
		};

		return { command };
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
				`**Permission${(command.userPermissions as PermissionString[]).length === 1 ? '' : 's'} Required**`,
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
				war: 'War and CWL',
				search: 'Clash Search',
				profile: 'Profile',
				config: 'Config'
			}
		];

		return message.util!.send({ embed: this.execHelpList(message, pages[0]) });
	}

	private execHelpList(message: Message, option: any) {
		const prefix = (this.handler.prefix as PrefixSupplier)(message) as string;
		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor('Command List', this.client.user!.displayAvatarURL())
			.setDescription([`To view more details for a command, do \`${prefix}help <command>\``]);

		const categories = [];
		for (const category of this.handler.categories.values()) {
			const title = option[category.id];

			if (title) {
				categories[Object.values(option).indexOf(title)] = { id: category.id, category, title };
			}
		}

		for (const { category, title } of categories) {
			embed.addField(`**__${title as string}__**`, [
				category.filter(cmd => cmd.aliases.length > 0)
					.sort((a, b) => a.aliases[0].length - b.aliases[0].length)
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
