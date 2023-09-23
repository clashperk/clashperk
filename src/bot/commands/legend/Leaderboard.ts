import { APIPlayer } from 'clashofclans.js';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	CommandInteraction,
	EmbedBuilder,
	StringSelectMenuBuilder
} from 'discord.js';
import { Command } from '../../lib/index.js';
import { CreateGoogleSheet, createGoogleSheet } from '../../struct/Google.js';
import { LEGEND_LEAGUE_ID } from '../../util/Constants.js';
import { EMOJIS } from '../../util/Emojis.js';
import { getExportComponents } from '../../util/Helper.js';
import { Util } from '../../util/index.js';

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
		args: { clans?: string; season?: string; sort_by?: string; export?: boolean; export_disabled?: boolean }
	) {
		const tags = await this.client.resolver.resolveArgs(args.clans);
		const clans = tags.length
			? await this.client.storage.search(interaction.guildId, tags)
			: await this.client.storage.find(interaction.guildId);

		if (!clans.length && tags.length)
			return interaction.editReply(
				this.i18n('common.no_clans_found', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE })
			);
		if (!clans.length) {
			return interaction.editReply(
				this.i18n('common.no_clans_linked', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE })
			);
		}

		const cachedClans = await this.client.redis.getClans(clans.map((clan) => clan.tag));
		const memberTags = cachedClans.map((clan) => clan.memberList.map((member) => member.tag)).flat();
		const players = await this.client.redis.getPlayers(memberTags);

		const legends = players.filter((player) => player.trophies >= 5000 || player.league?.id === LEGEND_LEAGUE_ID);

		if (args.sort_by === 'town_hall_asc') {
			legends.sort((a, b) => b.trophies - a.trophies);
			legends.sort((a, b) => a.townHallLevel - b.townHallLevel);
		} else if (args.sort_by === 'town_hall_desc') {
			legends.sort((a, b) => b.trophies - a.trophies);
			legends.sort((a, b) => b.townHallLevel - a.townHallLevel);
		} else {
			legends.sort((a, b) => b.trophies - a.trophies);
		}

		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: 'Legend Leaderboard', iconURL: interaction.guild.iconURL()! })
			.setTimestamp();
		embed.setDescription(
			[
				'```',
				`\u200e #  TH TROPHY  WON  NAME`,
				...legends.slice(0, 99).map((player, n) => {
					const trophies = this.pad(player.trophies, 4);
					const attacks = this.pad(player.attackWins, 3);
					const name = Util.escapeBackTick(player.name);
					const townHall = this.pad(player.townHallLevel, 2);
					return `\u200e${this.pad(n + 1)}  ${townHall}  ${trophies}  ${attacks}  ${name}`;
				}),
				'```'
			].join('\n')
		);

		if (args.sort_by === 'group_by_town_hall') {
			legends.reduce<Record<string, APIPlayer[]>>((prev, curr) => {
				prev[curr.townHallLevel] ??= []; // eslint-disable-line
				prev[curr.townHallLevel].push(curr);
				return prev;
			}, {});
		}

		const payload = {
			cmd: this.id,
			uuid: interaction.id,
			clans: tags.join(','),
			sort_by: args.sort_by,
			export_disabled: args.export_disabled
		};
		const customIds = {
			refresh: this.createId(payload),
			sortBy: this.createId({ ...payload, string_key: 'sort_by' }),
			export: this.createId({ ...payload, defer: false, export: true, export_disabled: true })
		};

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setEmoji(EMOJIS.REFRESH).setStyle(ButtonStyle.Secondary).setCustomId(customIds.refresh),
			new ButtonBuilder()
				.setEmoji(EMOJIS.EXPORT)
				.setStyle(ButtonStyle.Secondary)
				.setCustomId(customIds.export)
				.setDisabled(args.export_disabled)
		);

		const sortingRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder()
				.setCustomId(customIds.sortBy)
				.setPlaceholder('Sort by')
				.addOptions([
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
					// {
					// 	label: 'Group By Town Hall',
					// 	description: 'Group by Town Hall and Highest Trophies',
					// 	value: 'group_by_town_hall',
					// 	default: args.sort_by === 'group_by_town_hall'
					// }
				])
		);

		if (args.export && interaction.isButton()) {
			await interaction.editReply({ embeds: [embed], components: [row, sortingRow], message: interaction.message.id });
			await this.export(interaction, legends, clans);
		} else {
			await interaction.editReply({ embeds: [embed], components: [row, sortingRow] });
		}

		return this.clearId(interaction);
	}

	private pad(num: string | number, padding = 2) {
		return String(num).padStart(padding, ' ');
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

		const spreadsheet = await createGoogleSheet(`${interaction.guild.name} [Legend Leaderboard]`, sheets);
		return interaction.followUp({
			content: `**Legend Leaderboard** (${clans.map((clan) => clan.name).join(', ')})`,
			components: getExportComponents(spreadsheet)
		});
	}
}
