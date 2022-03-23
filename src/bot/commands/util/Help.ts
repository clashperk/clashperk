import { Command } from '../../lib';
import { CommandInteraction, MessageEmbed } from 'discord.js';
import { URLS } from '../../util/Constants';

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

const categories = {
	setup: 'Clan Management',
	activity: 'Clan Activity',
	war: 'War and CWL',
	search: 'Clash Search',
	profile: 'Profile',
	config: 'Config'
};

export default class HelpCommand extends Command {
	public constructor() {
		super('help', {
			category: 'none',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Get all commands or info about a command'
			},
			defer: true,
			ephemeral: true
		});
	}

	public exec(interaction: CommandInteraction<'cached'>, args: { command?: string }) {
		const command = this.handler.modules.get(args.command!);
		if (!command) return this.execCommandList(interaction);

		const description: Description = Object.assign(
			{
				content: 'No description available.',
				usage: '',
				image: '',
				fields: [],
				examples: []
			},
			command.description
		);

		const embed = new MessageEmbed()
			.setColor(this.client.embed(interaction))
			.setDescription(
				[
					`\`/${command.name ?? command.id} ${description.usage}\``,
					'',
					Array.isArray(description.content) ? description.content.join('\n') : description.content
				].join('\n')
			);

		if (description.examples.length) {
			const cmd = `/${command.name ?? command.id}`;
			embed.setDescription(
				[embed.description, '', '**Examples**', `\`${cmd} ${description.examples.join(`\`\n\`${cmd} `)}\``].join('\n')
			);
		}

		if (command.userPermissions) {
			embed.setDescription(
				[
					embed.description,
					'',
					`**Permission${command.userPermissions.length === 1 ? '' : 's'} Required**`,
					command.userPermissions
						.join('\n')
						.replace(/_/g, ' ')
						.toLowerCase()
						.replace(/\b(\w)/g, (char) => char.toUpperCase())
				].join('\n')
			);
		}

		if (description.image) {
			embed.setDescription(
				[
					embed.description,
					'',
					Array.isArray(description.image.text) ? description.image.text.join('\n') : description.image.text
				].join('\n')
			);
			embed.setImage(description.image.url);
		}

		return interaction.editReply({ embeds: [embed] });
	}

	private execCommandList(interaction: CommandInteraction<'cached'>) {
		return interaction.editReply({ embeds: [this.execHelpList(interaction, categories)] });
	}

	private execHelpList(interaction: CommandInteraction<'cached'>, option: typeof categories) {
		const embed = new MessageEmbed()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: 'Command List', iconURL: this.client.user!.displayAvatarURL({ format: 'png' }) })
			.setDescription(`To view more details for a command, do \`/help command: query\``);

		const categories = Object.values(
			this.handler.modules.reduce<Record<string, { category: string; commands: Command[] }>>((commands, command) => {
				if (command.category in option) {
					// eslint-disable-next-line
					if (!commands[command.category]) {
						commands[command.category] = {
							commands: [],
							category: option[command.category as keyof typeof option]
						};
					}
					commands[command.category].commands.push(command);
				}
				return commands;
			}, {})
		);

		const fields = Object.values(option);
		categories.sort((a, b) => fields.indexOf(a.category) - fields.indexOf(b.category));
		for (const { commands, category } of categories) {
			embed.addField(
				`**__${category}__**`,
				commands
					.map((cmd) => {
						const description = Array.isArray(cmd.description?.content)
							? cmd.description?.content[0] ?? ''
							: cmd.description?.content ?? '';
						return `**\`/${cmd.name ?? cmd.id}\`**\n${description}`;
					})
					.join('\n')
			);
		}

		embed.addField('\u200b', `**[Join Support Discord](${URLS.SUPPORT_SERVER})** | **[Support us on Patreon](${URLS.PATREON})**`);
		return embed;
	}
}
