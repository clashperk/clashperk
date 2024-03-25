import { APIPlayer } from 'clashofclans.js';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	CommandInteraction,
	MessageType,
	StringSelectMenuBuilder
} from 'discord.js';
import { Command } from '../../lib/index.js';
import { CreateGoogleSheet, createGoogleSheet } from '../../struct/Google.js';
import { EMOJIS } from '../../util/Emojis.js';
import { getExportComponents, getLegendLeaderboardEmbedMaker } from '../../util/Helper.js';

export default class LegendLeaderboardCommand extends Command {
	public constructor() {
		super('legend-leaderboard', {
			category: 'search',
			channel: 'guild',
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			defer: true
		});
	}

	public async exec(
		interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>,
		args: {
			clans?: string;
			season?: string;
			sort_by?: string;
			export?: boolean;
			export_disabled?: boolean;
			enable_auto_updating?: boolean;
		}
	) {
		const { clans, resolvedArgs } = await this.client.storage.handleSearch(interaction, { args: args.clans });
		if (!clans) return;

		if (interaction.isButton() && interaction.message.type === MessageType.Default) {
			const seasonEndTime = this.client.http.util.getSeasonEnd(new Date()).getTime();
			const messageSentSeasonTime = this.client.http.util.getSeasonEnd(interaction.message.createdAt).getTime();
			if (seasonEndTime !== messageSentSeasonTime) return interaction.editReply({ components: [] });
		}

		const { embed, legends } = await getLegendLeaderboardEmbedMaker({
			guild: interaction.guild,
			sort_by: args.sort_by,
			clanTags: clans.map((clan) => clan.tag)
		});

		if (!legends.length) {
			embed.setDescription('No players are in the Legend League');
		}

		if (legends.length && args.enable_auto_updating && this.client.util.isManager(interaction.member)) {
			await this.client.storage.makeAutoBoard({ channelId: interaction.channel!.id, boardType: this.id, guild: interaction.guild });
			return interaction.editReply('Successfully enabled auto updating Legend Leaderboard.');
		}

		const payload = {
			cmd: this.id,
			clans: resolvedArgs,
			sort_by: args.sort_by,
			export_disabled: args.export_disabled
		};

		const customIds = {
			refresh: this.createId({ ...payload, export_disabled: false }),
			sortBy: this.createId({ ...payload, string_key: 'sort_by' }),
			export: this.createId({ ...payload, defer: false, export: true, export_disabled: true })
		};

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setEmoji(EMOJIS.REFRESH).setStyle(ButtonStyle.Secondary).setCustomId(customIds.refresh),
			new ButtonBuilder()
				.setEmoji(EMOJIS.EXPORT)
				.setStyle(ButtonStyle.Secondary)
				.setCustomId(customIds.export)
				.setDisabled(Boolean(args.export_disabled))
		);

		const sortingRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder()
				.setCustomId(customIds.sortBy)
				.setPlaceholder('Sort by')
				.addOptions(
					{
						label: 'Town Hall Ascending',
						description: 'Lowest Town Hall with highest Trophies',
						value: 'town_hall_asc',
						default: args.sort_by === 'town_hall_asc'
					},
					{
						label: 'Town Hall Descending',
						description: 'Highest Town Hall with highest Trophies',
						value: 'town_hall_desc',
						default: args.sort_by === 'town_hall_desc'
					},
					{
						label: 'Trophies Only',
						description: 'Highest Trophies Only',
						value: 'trophies_only',
						default: args.sort_by === 'trophies_only'
					}
				)
		);

		if (args.export && interaction.isButton()) {
			await interaction.editReply({ embeds: [embed], components: [row, sortingRow], message: interaction.message.id });
			await this.export(interaction, legends, clans);
		} else {
			await interaction.editReply({ embeds: [embed], components: [row, sortingRow] });
		}
	}

	private async export(
		interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>,
		players: APIPlayer[],
		clans: { name: string }[]
	) {
		const sheets: CreateGoogleSheet[] = [
			{
				title: `Leaderboard`,
				columns: [
					{ name: 'NAME', align: 'LEFT', width: 160 },
					{ name: 'TAG', align: 'LEFT', width: 160 },
					{ name: 'CLAN', align: 'LEFT', width: 160 },
					{ name: 'CLAN TAG', align: 'LEFT', width: 160 },
					{ name: 'TOWN HALL', align: 'RIGHT', width: 100 },
					{ name: 'TROPHIES', align: 'RIGHT', width: 100 },
					{ name: 'ATTACKS WON', align: 'RIGHT', width: 100 }
				],
				rows: players.map((player) => [
					player.name,
					player.tag,
					player.clan?.name,
					player.clan?.tag,
					player.townHallLevel,
					player.trophies,
					player.attackWins
				])
			}
		];

		const spreadsheet = await createGoogleSheet(`${interaction.guild.name} [Legend Ranking]`, sheets);
		return interaction.followUp({
			ephemeral: this.muted,
			content: `**Legend Leaderboard** (${clans.map((clan) => clan.name).join(', ')})`,
			components: getExportComponents(spreadsheet)
		});
	}
}
