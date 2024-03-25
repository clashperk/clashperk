import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, escapeMarkdown } from 'discord.js';
import { Command } from '../../lib/index.js';
import { PlayerSeasonModel } from '../../types/index.js';
import { Collections } from '../../util/Constants.js';
import { EMOJIS } from '../../util/Emojis.js';
import { Season, Util } from '../../util/index.js';

export default class SummaryTrophiesCommand extends Command {
	public constructor() {
		super('summary-trophies', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: { limit?: number; clans?: string; clans_only?: boolean; builder_base?: boolean }
	) {
		let limit = 99;
		if (args.limit) limit = Math.max(5, Math.min(99, args.limit));

		const { clans, resolvedArgs } = await this.client.storage.handleSearch(interaction, { args: args.clans });
		if (!clans) return;

		const __clans = await this.client.redis.getClans(clans.map((clan) => clan.tag));
		const members = __clans
			.map((clan) => clan.memberList.map((mem) => ({ clan: clan.name, name: mem.name, tag: mem.tag, trophies: mem.trophies })))
			.flat();

		if (!members.length) {
			return interaction.editReply({ content: 'No players found in your clans. Try again later!' });
		}

		const grouped = Object.values(
			__clans.reduce<Record<string, ClansGroup>>((acc, clan) => {
				acc[clan.tag] = {
					name: clan.name,
					tag: clan.tag,
					clanPoints: args.builder_base ? clan.clanBuilderBasePoints : clan.clanPoints,
					preLegends: clan.memberList.filter((mem) => [29000021, 29000020, 29000019].includes(mem.league.id)).length,
					totalTrophies: clan.memberList.reduce((prev, mem) => prev + mem.trophies, 0),
					legends: clan.memberList.filter((mem) => mem.league.id === 29000022).length
				};
				return acc;
			}, {})
		);

		grouped.sort((a, b) => b.clanPoints - a.clanPoints);
		const memberTags = members.map((member) => member.tag);

		const embed = new EmbedBuilder().setColor(this.client.embed(interaction)).setTimestamp();
		if (args.clans_only) {
			embed.setDescription(
				[
					'```',
					`\u200e # >4K >5K ${'POINTS'.padStart(6, ' ')} NAME`,
					grouped
						.map((clan, index) => {
							const preLegends = `${clan.preLegends.toString().padStart(3, ' ')}`;
							const legends = `${clan.legends.toString().padStart(3, ' ')}`;
							const clanPoints = `${clan.clanPoints.toString().padStart(6, ' ')}`;
							return `${(index + 1)
								.toString()
								.padStart(2, ' ')} ${preLegends} ${legends} ${clanPoints} \u200e${escapeMarkdown(clan.name)}`;
						})
						.join('\n'),
					'```'
				].join('\n')
			);

			if (args.builder_base) {
				embed.setAuthor({ name: `${interaction.guild.name} Best Builder Base Trophies` });
				embed.setDescription(
					[
						'```',
						`\u200e # ${'POINTS'.padStart(6, ' ')} NAME`,
						grouped
							.map((clan, index) => {
								const clanPoints = `${clan.clanPoints.toString().padStart(6, ' ')}`;
								return `${(index + 1).toString().padStart(2, ' ')} ${clanPoints} \u200e${escapeMarkdown(clan.name)}`;
							})
							.join('\n'),
						'```'
					].join('\n')
				);
			}
		} else if (args.builder_base) {
			const result = await this.client.db
				.collection<PlayerSeasonModel>(Collections.PLAYER_SEASONS)
				.find({ tag: { $in: memberTags }, season: Season.ID })
				.toArray();
			const players = result
				.sort((a, b) => b.versusTrophies.current - a.versusTrophies.current)
				.map((player) => ({
					name: player.name,
					tag: player.tag,
					trophies: player.versusTrophies.current,
					attackWins: Math.max(
						player.versusBattleWins.initial - player.versusBattleWins.current,
						player.builderBaseAttacksWon ?? 0
					)
				}));

			embed.setAuthor({ name: 'Best Builder Base Trophies', iconURL: interaction.guild.iconURL()! });
			embed.setDescription(
				[
					'```',
					`\u200e # TROPHY WON  NAME`,
					...players.slice(0, limit).map((player, n) => {
						const trophies = this.pad(player.trophies, 4);
						const attacks = this.pad(player.attackWins, 3);
						const name = Util.escapeBackTick(player.name);
						return `\u200e${this.pad(n + 1)}  ${trophies}  ${attacks}  ${name}`;
					}),
					'```'
				].join('\n')
			);
		} else {
			const result = await this.client.redis.getPlayers(memberTags);
			const players = result; // .filter((player) => player.trophies >= 5000 || player.league?.id === LEGEND_LEAGUE_ID);
			players.sort((a, b) => b.trophies - a.trophies);

			embed.setAuthor({ name: 'Best Trophies', iconURL: interaction.guild.iconURL()! });
			embed.setDescription(
				[
					'```',
					`\u200e # TROPHY WON  NAME`,
					...players.slice(0, limit).map((player, n) => {
						const trophies = this.pad(player.trophies, 4);
						const attacks = this.pad(player.attackWins, 3);
						const name = Util.escapeBackTick(player.name);
						return `\u200e${this.pad(n + 1)}  ${trophies}  ${attacks}  ${name}`;
					}),
					'```'
				].join('\n')
			);
		}

		const payload = {
			cmd: this.id,
			clans: resolvedArgs,
			limit: args.limit,
			clans_only: args.clans_only,
			builder_base: args.builder_base
		};

		const customIds = {
			refresh: this.createId(payload),
			toggle: this.createId({ ...payload, clans_only: !args.clans_only }),
			village: this.createId({ ...payload, builder_base: !args.builder_base })
		};

		const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
			new ButtonBuilder().setEmoji(EMOJIS.REFRESH).setStyle(ButtonStyle.Secondary).setCustomId(customIds.refresh),
			new ButtonBuilder()
				.setLabel(args.clans_only ? 'Players Summary' : 'Clans Summary')
				.setStyle(ButtonStyle.Primary)
				.setCustomId(customIds.toggle),
			new ButtonBuilder()
				.setLabel(args.builder_base ? 'Home Village' : 'Builder Base')
				.setStyle(ButtonStyle.Primary)
				.setCustomId(customIds.village)
		);

		return interaction.editReply({ embeds: [embed], components: [row] });
	}

	private pad(num: string | number, padding = 2) {
		return String(num).padStart(padding, ' ');
	}
}

interface ClansGroup {
	clanPoints: number;
	totalTrophies: number;
	legends: number;
	name: string;
	tag: string;
	preLegends: number;
}
