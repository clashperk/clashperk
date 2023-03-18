import { ApplicationCommandOptionType, ApplicationCommandType, CommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../lib/index.js';
import { URLS } from '../../util/Constants.js';
import { command as commandMap } from '../../../../locales/en.js';

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

interface CommandInfo {
	id: string;
	name: string;
	description: string;
	category: string;
	translation_key: string;
	description_long: string | null;
}

export default class HelpCommand extends Command {
	public constructor() {
		super('help', {
			category: 'none',
			clientPermissions: ['EmbedLinks'],
			description: {
				content: 'Get all commands or info about a command'
			},
			defer: true,
			ephemeral: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>) {
		const getTranslation = (key: string): string | null => {
			const keys = key.split('.');
			const cmd = keys.shift()!;

			let result = (commandMap as unknown as any)[cmd];
			if (!result) return null;

			for (const k of keys) {
				if (!result[k]) return null;
				result = result[k];
			}

			return result;
		};

		const categories: Record<string, string> = {
			search: 'PLAYER AND CLAN',
			activity: 'PLAYER AND CLAN',

			war: 'WAR AND CWL',

			summary: 'EXPORTS, FAMILY SUMMARY AND TOP STATS',
			export: 'EXPORTS, FAMILY SUMMARY AND TOP STATS',

			link: 'LINKING AND FLAGGING',
			flag: 'LINKING AND FLAGGING',
			profile: 'LINKING AND FLAGGING',

			reminders: 'SERVER SETUPS, CONFIGURATIONS AND OTHER UTILITIES',
			config: 'SERVER SETUPS, CONFIGURATIONS AND OTHER UTILITIES',
			setup: 'SERVER SETUPS, CONFIGURATIONS AND OTHER UTILITIES'
		};

		const __commands__ = (await this.client.application?.commands.fetch())!;
		console.log(__commands__.map((c) => c.name));
		const commands = __commands__
			.filter((command) => command.type === ApplicationCommandType.ChatInput)
			.map((command) => {
				const subCommands = command.options
					.filter((option) => option.type === ApplicationCommandOptionType.Subcommand)
					.map((option) => {
						const translation_key = `${command.name} ${option.name}.description_long`.replace(/ /g, '.').replace(/-/g, '_');
						const cmd = this.client.commandHandler.getCommand(command.name);

						return {
							id: command.id,
							name: `${command.name} ${option.name}`,
							description: option.description,
							category: cmd?.category ?? 'general',
							translation_key: `command.${translation_key}`,
							description_long: getTranslation(translation_key)
						};
					});
				if (subCommands.length) return [...subCommands];

				const cmd = this.client.commandHandler.getCommand(command.name);
				const translation_key = `${command.name.replace(/ /g, '_').replace(/-/g, '_')}.description_long`;
				return [
					{
						id: command.id,
						name: command.name,
						category: cmd?.category ?? 'search',
						description: command.description,
						translation_key: `command.${translation_key}`,
						description_long: getTranslation(translation_key)
					}
				];
			});

		const grouped = commands.flat().reduce<Record<string, CommandInfo[]>>((acc, cur) => {
			if (cur.category in categories) {
				acc[categories[cur.category]] ??= [];
				acc[categories[cur.category]].push(cur);
			}
			return acc;
		}, {});

		const commandCategories = Object.entries(grouped).map(([category, commands]) => ({
			category,
			commands
		}));

		const fields = Object.values(categories);
		commandCategories.sort((a, b) => fields.indexOf(a.category) - fields.indexOf(b.category));

		const embeds: EmbedBuilder[] = [];
		for (const { category, commands } of commandCategories) {
			const embed = new EmbedBuilder();
			embed.setColor(this.client.embed(interaction));
			embed.setDescription(
				[
					`**${category}**`,
					'',
					...commands.map((command) => {
						const description = command.description_long ?? command.description;
						return `</${command.name}:${command.id}>\n${description}`;
					})
				].join('\n')
			);
			embeds.push(embed);
		}
		embeds.at(0)?.setTitle('Commands');

		for (const embed of embeds) await interaction.followUp({ embeds: [embed], ephemeral: true });
	}

	public async _exec(interaction: CommandInteraction<'cached'>, args: { command?: string }) {
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

		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setDescription(
				[
					`\`/${command.aliases?.[0] ?? command.id} ${description.usage}\``,
					'',
					Array.isArray(description.content) ? description.content.join('\n') : description.content
				].join('\n')
			);

		if (description.examples.length) {
			const cmd = `/${command.aliases?.[0] ?? command.id}`;
			embed.setDescription(
				[embed.data.description, '', '**Examples**', `\`${cmd} ${description.examples.join(`\`\n\`${cmd} `)}\``].join('\n')
			);
		}

		if (command.userPermissions) {
			embed.setDescription(
				[
					embed.data.description,
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
					embed.data.description,
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
		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: 'Command List', iconURL: this.client.user!.displayAvatarURL({ extension: 'png' }) })
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
			embed.addFields([
				{
					name: `**__${category}__**`,
					value: commands
						.map((cmd) => {
							const description = Array.isArray(cmd.description?.content)
								? cmd.description?.content[0] ?? ''
								: cmd.description?.content ?? '';
							return `**\`/${cmd.aliases?.[0] ?? cmd.id}\`**\n${description}`;
						})
						.join('\n')
				}
			]);
		}

		embed.addFields([
			{
				name: '\u200b',
				value: `**[Join Support Discord](${URLS.SUPPORT_SERVER})** | **[Support us on Patreon](${URLS.PATREON})**`
			}
		]);
		return embed;
	}
}
