import {
	ActionRowBuilder,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	CommandInteraction,
	EmbedBuilder,
	StringSelectMenuBuilder
} from 'discord.js';
import { command as commandMap } from '../../../../locales/en.js';
import { Command } from '../../lib/index.js';

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
	search: 'Player and Clan',
	activity: 'Player and Clan',

	war: 'War, CWL and Rosters',
	roster: 'War, CWL and Rosters',

	summary: 'Exports, Summary, History',
	export: 'Exports, Summary, History',

	link: 'Player Links and Flags',
	flag: 'Player Links and Flags',
	profile: 'Player Links and Flags',

	reminders: 'Server Settings',
	config: 'Server Settings',
	setup: 'Server Settings'
};

interface CommandInfo {
	id: string;
	name: string;
	rootName: string;
	description: string;
	category: string;
	translation_key: string;
	description_long: string | null;
}

export default class HelpCommand extends Command {
	public constructor() {
		super('help', {
			category: 'none',
			channel: 'dm',
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { command?: string; category?: string; selected?: string }) {
		const commands = await this.getCommands(interaction);

		const command = commands.find((command) => command.rootName === args.command || command.name === args.command);
		if (!command) return this.commandMenu(interaction, commands, args);

		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setDescription(
				[`## </${command.name}:${command.id}>`, '\u200b', `${command.description_long ?? command.description}`].join('\n')
			);

		return interaction.editReply({ embeds: [embed] });
	}

	public async commandMenu(interaction: CommandInteraction<'cached'>, commands: CommandInfo[], args: { category?: string }) {
		const grouped = commands.reduce<Record<string, CommandInfo[]>>((acc, cur) => {
			if (cur.category in categories) {
				acc[categories[cur.category]] ??= []; // eslint-disable-line
				acc[categories[cur.category]].push(cur);
			}
			return acc;
		}, {});

		const commandCategories = Object.entries(grouped).map(([category, commands]) => ({
			category,
			commandGroups: Object.values(
				commands.reduce<Record<string, CommandInfo[]>>((acc, cur) => {
					acc[cur.rootName] ??= []; // eslint-disable-line
					acc[cur.rootName].push(cur);
					return acc;
				}, {})
			)
		}));

		const fields = Object.values(categories);
		commandCategories.sort((a, b) => fields.indexOf(a.category) - fields.indexOf(b.category));

		const embeds: EmbedBuilder[] = [];
		args.category ??= categories.search;
		for (const { category, commandGroups } of commandCategories) {
			if (args.category && args.category !== category) continue;

			const embed = new EmbedBuilder();
			embed.setColor(this.client.embed(interaction));
			embed.setDescription(
				[
					`## ${category}`,
					'',
					commandGroups
						.map((commands) => {
							const _commands = commands.map((command) => {
								const description = command.description_long ?? command.description;
								return `### </${command.name}:${command.id}>\n${description}`;
							});
							return _commands.join('\n');
						})
						.join('\n\n')
				].join('\n')
			);
			embeds.push(embed);
		}

		const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder()
				.setPlaceholder('Select a command category')
				.setCustomId(JSON.stringify({ cmd: this.id, category: args.category, string_key: 'category' }))
				.addOptions(
					Array.from(new Set(Object.values(categories))).map((key) => ({
						label: key,
						value: key,
						default: key === args.category
					}))
				)
		);

		if (embeds.length === 1) {
			return interaction.editReply({ embeds, components: [row] });
		}

		for (const embed of embeds) await interaction.followUp({ embeds: [embed], ephemeral: this.muted });
	}

	private async getCommands(interaction: CommandInteraction<'cached'>) {
		const applicationCommands =
			this.client.isCustom() && interaction.inCachedGuild()
				? (await this.client.application?.commands.fetch({ guildId: interaction.guildId }))!
				: (await this.client.application?.commands.fetch())!;

		const commands = applicationCommands
			.filter((command) => command.type === ApplicationCommandType.ChatInput)
			.map((command) => {
				const subCommandGroups = command.options
					.filter((option) =>
						[ApplicationCommandOptionType.SubcommandGroup, ApplicationCommandOptionType.Subcommand].includes(option.type)
					)
					.flatMap((option) => {
						if (option.type === ApplicationCommandOptionType.SubcommandGroup && option.options?.length) {
							return option.options.map((subOption) => {
								const translation_key = `${command.name} ${option.name} ${subOption.name}.description_long`
									.replace(/ /g, '.')
									.replace(/-/g, '_');
								const cmd = this.client.commandHandler.getCommand(command.name);
								return {
									id: command.id,
									name: `${command.name} ${option.name} ${subOption.name}`,
									rootName: command.name,
									description: subOption.description,
									category: cmd?.category ?? 'search',
									translation_key: `command.${translation_key}`,
									description_long: getTranslation(translation_key)
								};
							});
						}
						const translation_key = `${command.name} ${option.name}.description_long`.replace(/ /g, '.').replace(/-/g, '_');
						const cmd = this.client.commandHandler.getCommand(command.name);
						return {
							id: command.id,
							name: `${command.name} ${option.name}`,
							rootName: command.name,
							description: option.description,
							category: cmd?.category ?? 'search',
							translation_key: `command.${translation_key}`,
							description_long: getTranslation(translation_key)
						};
					});
				if (subCommandGroups.length) return [...subCommandGroups];

				const cmd = this.client.commandHandler.getCommand(command.name);
				const translation_key = `${command.name.replace(/ /g, '_').replace(/-/g, '_')}.description_long`;
				return [
					{
						id: command.id,
						name: command.name,
						rootName: command.name,
						category: cmd?.category ?? 'search',
						description: command.description,
						translation_key: `command.${translation_key}`,
						description_long: getTranslation(translation_key)
					}
				];
			});

		return commands.flat();
	}
}
