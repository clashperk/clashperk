import {
	ActionRowBuilder,
	BaseInteraction,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	CommandInteraction,
	ComponentType,
	EmbedBuilder
} from 'discord.js';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
import { ClanGames } from '../../util/index.js';

export default class FamilyClanGamesCommand extends Command {
	public constructor() {
		super('family-clan-games', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			defer: true
		});
	}

	public async exec(
		interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>,
		args: { tag?: string; max: boolean; filter: boolean; season?: string }
	) {
		const clans = await this.client.storage.find(interaction.guildId);
		if (!clans.length) {
			return interaction.editReply(this.i18n('common.no_clans_linked', { lng: interaction.locale }));
		}
		const seasonId = this.getSeasonId(args.season);

		const queried = await this.query(
			clans.map((clan) => clan.tag),
			seasonId
		)!;
		const embed = this.clanScoreboard(interaction, {
			members: queried?.members ?? [],
			clans: queried?.clans ?? [],
			max: args.max,
			filter: args.filter,
			seasonId
		});
		const customIds = {
			action: this.client.uuid(),
			active: this.client.uuid()
		};

		const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
			new ButtonBuilder().setLabel('Show Top Members').setStyle(ButtonStyle.Primary).setCustomId(customIds.action)
		);

		const msg = await interaction.editReply({ embeds: [embed], components: [row] });
		const collector = msg.createMessageComponentCollector<ComponentType.Button>({
			filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === customIds.action) {
				const embed = this.playerScoreboard(interaction, {
					members: queried?.members ?? [],
					clans: queried?.clans ?? [],
					max: args.max,
					filter: args.filter,
					seasonId
				});

				await action.update({ embeds: [embed], components: [] });
			}
		});

		collector.on('end', async (_, reason) => {
			for (const id of Object.values(customIds)) this.client.components.delete(id);
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
	}

	private clanScoreboard(
		interaction: BaseInteraction,
		{
			clans,
			seasonId
		}: {
			members: { name: string; tag: string; points: number }[];
			clans: { name: string; tag: string; points: number }[];
			max?: boolean;
			filter?: boolean;
			seasonId: string;
		}
	) {
		const embed = new EmbedBuilder()
			.setAuthor({ name: `Family Clan Games Scoreboard`, iconURL: interaction.guild!.iconURL()! })
			.setDescription(
				[
					'```',
					` # POINTS  CLANS`,
					clans
						.slice(0, 99)
						.map((c, i) => {
							const points = this.padStart(c.points);
							return `\u200e${(++i).toString().padStart(2, ' ')} ${points}  ${c.name}`;
						})
						.join('\n'),
					'```'
				].join('\n')
			);

		embed.setFooter({ text: `Season ${seasonId}` });

		return embed;
	}

	private playerScoreboard(
		interaction: BaseInteraction,
		{
			members,
			max = false,
			filter = false,
			seasonId
		}: {
			members: { name: string; tag: string; points: number }[];
			clans: { name: string; tag: string; points: number }[];
			max?: boolean;
			filter?: boolean;
			seasonId: string;
		}
	) {
		const total = members.reduce((prev, mem) => prev + (max ? mem.points : Math.min(mem.points, this.MAX)), 0);
		const embed = new EmbedBuilder()
			.setAuthor({ name: 'Family Clan Games Scoreboard', iconURL: interaction.guild!.iconURL()! })
			.setDescription(
				[
					`**[${this.i18n('command.clan_games.title', { lng: interaction.locale })} (${seasonId})](https://clashperk.com/faq)**`,
					`\`\`\`\n\u200e\u2002# POINTS \u2002 ${'NAME'.padEnd(20, ' ')}`,
					members
						.slice(0, 99)
						.filter((d) => (filter ? d.points > 0 : d.points >= 0))
						.map((m, i) => {
							const points = this.padStart(max ? m.points : Math.min(this.MAX, m.points));
							return `\u200e${(++i).toString().padStart(2, '\u2002')} ${points} \u2002 ${m.name}`;
						})
						.join('\n'),
					'```'
				].join('\n')
			);

		embed.setFooter({ text: `Points: ${total} [Avg: ${(total / members.length).toFixed(2)}]` });
		embed.setTimestamp();

		return embed;
	}

	private get MAX() {
		const now = new Date();
		return now.getDate() >= 22 && ClanGames.isSpecial ? 5000 : 4000;
	}

	private padStart(num: number) {
		return num.toString().padStart(6, ' ');
	}

	private getSeasonId(seasonId?: string) {
		if (seasonId) return seasonId;
		return this.latestSeason;
	}

	private get latestSeason() {
		const now = new Date();
		if (now.getDate() < 20) now.setMonth(now.getMonth() - 1);
		return now.toISOString().substring(0, 7);
	}

	private query(clanTags: string[], seasonId: string) {
		const cursor = this.client.db.collection(Collections.CLAN_GAMES_POINTS).aggregate<{
			clans: { name: string; tag: string; points: number }[];
			members: { name: string; tag: string; points: number }[];
		}>([
			{
				$match: { __clans: { $in: clanTags }, season: seasonId }
			},
			{
				$set: {
					clan: {
						$arrayElemAt: ['$clans', 0]
					}
				}
			},
			{
				$project: {
					points: {
						$subtract: ['$current', '$initial']
					},
					name: 1,
					tag: 1,
					clan: {
						name: 1,
						tag: 1
					}
				}
			},
			{
				$facet: {
					clans: [
						{
							$group: {
								_id: '$clan.tag',
								name: {
									$first: '$clan.name'
								},
								tag: {
									$first: '$clan.tag'
								},
								points: {
									$sum: {
										$min: ['$points', this.MAX]
									}
								}
							}
						},
						{
							$match: {
								_id: { $in: clanTags }
							}
						},
						{
							$sort: {
								points: -1
							}
						}
					],
					members: [
						{
							$sort: {
								points: -1
							}
						},
						{
							$limit: 100
						}
					]
				}
			}
		]);

		return cursor.next()!;
	}
}
