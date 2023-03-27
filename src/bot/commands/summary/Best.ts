import { CommandInteraction, EmbedBuilder, embedLength } from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
import { BLUE_NUMBERS, EMOJIS } from '../../util/Emojis.js';
import { Season, Util } from '../../util/index.js';

interface AggregatedValue {
	name: string;
	tag: string;
	value: number;
}

interface AggregatedResult {
	_elixirLoot: AggregatedValue[];
	_goldLoot: AggregatedValue[];
	_darkLoot: AggregatedValue[];
	_troops: AggregatedValue[];
	_spells: AggregatedValue[];
	_sieges: AggregatedValue[];
	_warStars: AggregatedValue[];
	_cwlStars: AggregatedValue[];
	_clanGamesPoints: AggregatedValue[];
	_clanGamesCompletionTime: AggregatedValue[];
	_trophiesGained: AggregatedValue[];
	_trophies: AggregatedValue[];
	_versusTrophies: AggregatedValue[];
	_versusAttackWins: AggregatedValue[];
	_capitalLoot: AggregatedValue[];
	_capitalDonations: AggregatedValue[];
	_attackWins: AggregatedValue[];
	_defenseWins: AggregatedValue[];
	_score: AggregatedValue[];
	_donations: AggregatedValue[];
}

const fields = {
	_goldLoot: `${EMOJIS.GOLD} Gold Loot`,
	_elixirLoot: `${EMOJIS.ELIXIR} Elixir Loot`,
	_darkLoot: `${EMOJIS.DARK_ELIXIR} Dark Elixir Loot`,
	_score: `${EMOJIS.ACTIVITY} Activity Score`,

	_donations: `${EMOJIS.TROOPS_DONATE} Donations`,
	_attackWins: `${EMOJIS.SWORD} Attack Wins`,
	// _defenseWins: `${EMOJIS.SHIELD} Defense Wins`,
	_versusAttackWins: `${EMOJIS.CROSS_SWORD} Versus Attack Wins`,

	_trophiesGained: `${EMOJIS.TROPHY} Trophies Gained`,
	_trophies: `${EMOJIS.TROPHY} Current Trophies`,
	// _versusTrophies: `${EMOJIS.VERSUS_TROPHY} Versus Trophies`,
	_warStars: `${EMOJIS.WAR_STAR} War Stars`,
	// _cwlStars: `${EMOJIS.STAR} CWL Stars`,

	// _troops: "",
	// _spells: "",
	// _sieges: "",

	_capitalLoot: `${EMOJIS.CAPITAL_GOLD} Capital Gold Loot`,
	_capitalDonations: `${EMOJIS.CAPITAL_GOLD} Capital Gold Contribution`,
	_clanGamesPoints: `${EMOJIS.CLAN_GAMES} Clan Games Points`,
	_clanGamesCompletionTime: `${EMOJIS.CLAN_GAMES} Fastest Clan Games Completion`
};

export default class SummaryBestCommand extends Command {
	public constructor() {
		super('summary-best', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { season?: string; limit?: number; clans?: string }) {
		const seasonId = args.season ?? Season.ID;
		const tags = await this.client.resolver.resolveArgs(args.clans);
		const clans = tags.length
			? await this.client.storage.search(interaction.guildId, tags)
			: await this.client.storage.find(interaction.guildId);

		if (!clans.length && tags.length) return interaction.editReply(this.i18n('common.no_clans_found', { lng: interaction.locale }));
		if (!clans.length) {
			return interaction.editReply(this.i18n('common.no_clans_linked', { lng: interaction.locale }));
		}

		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `${interaction.guild.name} Best Players`, iconURL: interaction.guild.iconURL({ forceStatic: false })! });

		const _clanGamesStartTimestamp = moment(seasonId).add(21, 'days').hour(8).toDate().getTime();
		const aggregated = await this.client.db
			.collection(Collections.PLAYER_SEASONS)
			.aggregate<AggregatedResult>([
				{
					$match: {
						__clans: { $in: clans.map((c) => c.tag) },
						season: seasonId
					}
				},
				{
					$project: {
						name: 1,
						tag: 1,
						_elixirLoot: {
							$subtract: ['$elixirLoots.current', '$elixirLoots.initial']
						},
						_goldLoot: {
							$subtract: ['$goldLoots.current', '$goldLoots.initial']
						},
						_darkLoot: {
							$subtract: ['$darkElixirLoots.current', '$darkElixirLoots.initial']
						},
						_troops: {
							$subtract: ['$troopsDonations.current', '$troopsDonations.initial']
						},
						_spells: {
							$subtract: ['$spellsDonations.current', '$spellsDonations.initial']
						},
						_sieges: {
							$multiply: [{ $subtract: ['$siegeMachinesDonations.current', '$siegeMachinesDonations.initial'] }, 30]
						},
						_warStars: {
							$subtract: ['$clanWarStars.current', '$clanWarStars.initial']
						},
						_cwlStars: {
							$subtract: ['$clanWarLeagueStars.current', '$clanWarLeagueStars.initial']
						},
						_clanGamesPoints: {
							$subtract: ['$clanGamesPoints.current', '$clanGamesPoints.initial']
						},
						_trophiesGained: {
							$subtract: ['$trophies.current', '$trophies.initial']
						},
						_trophies: '$trophies.current',
						_versusTrophies: {
							$subtract: ['$versusTrophies.current', '$versusTrophies.initial']
						},
						_versusAttackWins: {
							$subtract: ['$versusBattleWins.current', '$versusBattleWins.initial']
						},
						_capitalLoot: {
							$subtract: ['$clanCapitalRaids.current', '$clanCapitalRaids.initial']
						},
						_capitalDonations: {
							$subtract: ['$capitalGoldContributions.current', '$capitalGoldContributions.initial']
						},
						_attackWins: '$attackWins',
						_defenseWins: '$defenseWins',
						clans: {
							$objectToArray: '$clans'
						}
					}
				},
				{
					$lookup: {
						from: Collections.LAST_SEEN,
						localField: 'tag',
						foreignField: 'tag',
						as: '_score',
						pipeline: [
							{
								$project: {
									_id: 0,
									count: `$seasons.${seasonId}`
								}
							}
						]
					}
				},
				{
					$lookup: {
						from: Collections.CLAN_GAMES_POINTS,
						localField: 'tag',
						foreignField: 'tag',
						as: '_clanGames',
						pipeline: [
							{ $match: { season: seasonId } },
							{ $set: { clan: { $arrayElemAt: ['$__clans', 0] } } },
							{ $match: { clan: { $in: clans.map((c) => c.tag) } } },
							{ $project: { current: 1, initial: 1, completedAt: 1 } }
						]
					}
				},
				{
					$unwind: {
						path: '$_score',
						preserveNullAndEmptyArrays: true
					}
				},
				{
					$unwind: {
						path: '$_clanGames',
						preserveNullAndEmptyArrays: true
					}
				},
				{
					$set: {
						_clanGamesPoints: {
							$max: [{ $subtract: ['$_clanGames.current', '$_clanGames.initial'] }, 0]
						},
						_clanGamesCompletionTime: {
							$dateDiff: {
								startDate: '$_clanGames.completedAt',
								endDate: '$$NOW',
								unit: 'millisecond'
							}
						},
						_clanGamesCompletedAt: '$_clanGames.completedAt',
						_donations: {
							$sum: ['$_troops', '$_spells', '$_sieges']
						},
						_score: {
							$max: ['$_score.count', 0]
						}
					}
				},
				{
					$facet: {
						_elixirLoot: [
							{
								$project: {
									name: 1,
									tag: 1,
									value: '$_elixirLoot'
								}
							},
							{
								$sort: {
									value: 1
								}
							},
							{
								$limit: 10
							}
						],
						_goldLoot: [
							{
								$project: {
									name: 1,
									tag: 1,
									value: '$_goldLoot'
								}
							},
							{
								$sort: {
									value: 1
								}
							},
							{
								$limit: 10
							}
						],
						_darkLoot: [
							{
								$project: {
									name: 1,
									tag: 1,
									value: '$_darkLoot'
								}
							},
							{
								$sort: {
									value: 1
								}
							},
							{
								$limit: 10
							}
						],
						_warStars: [
							{
								$project: {
									name: 1,
									tag: 1,
									value: '$_warStars'
								}
							},
							{
								$sort: {
									value: 1
								}
							},
							{
								$limit: 10
							}
						],
						_cwlStars: [
							{
								$project: {
									name: 1,
									tag: 1,
									value: '$_cwlStars'
								}
							},
							{
								$sort: {
									value: 1
								}
							},
							{
								$limit: 10
							}
						],
						_clanGamesPoints: [
							{
								$project: {
									name: 1,
									tag: 1,
									value: '$_clanGamesPoints'
								}
							},
							{
								$sort: {
									value: 1
								}
							},
							{
								$limit: 10
							}
						],
						_trophiesGained: [
							{
								$project: {
									name: 1,
									tag: 1,
									value: '$_trophiesGained'
								}
							},
							{
								$sort: {
									value: 1
								}
							},
							{
								$limit: 10
							}
						],
						_trophies: [
							{
								$project: {
									name: 1,
									tag: 1,
									value: '$_trophies'
								}
							},
							{
								$sort: {
									value: 1
								}
							},
							{
								$limit: 10
							}
						],
						_versusTrophies: [
							{
								$project: {
									name: 1,
									tag: 1,
									value: '$_versusTrophies'
								}
							},
							{
								$sort: {
									value: 1
								}
							},
							{
								$limit: 10
							}
						],
						_versusAttackWins: [
							{
								$project: {
									name: 1,
									tag: 1,
									value: '$_versusAttackWins'
								}
							},
							{
								$sort: {
									value: 1
								}
							},
							{
								$limit: 10
							}
						],
						_capitalLoot: [
							{
								$project: {
									name: 1,
									tag: 1,
									value: '$_capitalLoot'
								}
							},
							{
								$sort: {
									value: 1
								}
							},
							{
								$limit: 10
							}
						],
						_capitalDonations: [
							{
								$project: {
									name: 1,
									tag: 1,
									value: '$_capitalDonations'
								}
							},
							{
								$sort: {
									value: 1
								}
							},
							{
								$limit: 10
							}
						],
						_defenseWins: [
							{
								$project: {
									name: 1,
									tag: 1,
									value: '$_defenseWins'
								}
							},
							{
								$sort: {
									value: 1
								}
							},
							{
								$limit: 10
							}
						],
						_attackWins: [
							{
								$project: {
									name: 1,
									tag: 1,
									value: '$_attackWins'
								}
							},
							{
								$sort: {
									value: 1
								}
							},
							{
								$limit: 10
							}
						],
						_score: [
							{
								$project: {
									name: 1,
									tag: 1,
									value: '$_score'
								}
							},
							{
								$sort: {
									value: 1
								}
							},
							{
								$limit: 10
							}
						],
						_clanGamesCompletionTime: [
							{
								$match: {
									_clanGamesCompletedAt: {
										$exists: true
									}
								}
							},
							{
								$sort: {
									_clanGamesCompletionTime: 1
								}
							},
							{
								$limit: 10
							},
							{
								$project: {
									name: 1,
									tag: 1,
									value: {
										$dateDiff: {
											startDate: new Date(_clanGamesStartTimestamp),
											endDate: '$_clanGamesCompletedAt',
											unit: 'millisecond'
										}
									}
								}
							}
						],
						_donations: [
							{
								$unwind: '$clans'
							},
							{
								$project: {
									name: 1,
									tag: 1,
									clan: '$clans.v'
								}
							},
							{
								$match: {
									'clan.tag': {
										$in: clans.map((clan) => clan.tag)
									}
								}
							},
							{
								$group: {
									_id: '$tag',
									name: { $first: '$name' },
									tag: { $first: '$tag' },
									value: {
										$sum: '$clan.donations.total'
									}
								}
							},
							{
								$sort: {
									value: 1
								}
							},
							{
								$limit: 10
							}
						]
					}
				}
			])
			.next();
		if (!aggregated) {
			return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));
		}

		const _fields = Object.keys(fields);
		_fields.map((field) => {
			const key = field as keyof typeof fields;
			const members = aggregated[key].filter((n) => !isNaN(n.value)).slice(0, Number(args.limit ?? 5));

			if (!members.length) {
				return embed.addFields({
					name: fields[key],
					value: 'No data available.'
				});
			}

			return embed.addFields({
				name: fields[key],
				value: members
					.map((member, n) => {
						const num =
							key === '_clanGamesCompletionTime'
								? this._formatTime(member.value).padStart(7, ' ')
								: Util.formatNumber(member.value).padStart(7, ' ');
						return `${BLUE_NUMBERS[n + 1]} \`${num} \` \u200e${Util.escapeBackTick(member.name)}`;
					})
					.join('\n')
			});
		});

		if (embedLength(embed.toJSON()) > 6000) {
			const fields = [...embed.data.fields!];
			embed.setFields(fields.slice(0, 7));
			await interaction.followUp({ embeds: [embed] });

			embed.setFields(fields.slice(7));
			embed.setFooter({ text: `Season ${seasonId}` });
			return interaction.followUp({ embeds: [embed] });
		}

		embed.setFooter({ text: `Season ${seasonId}` });
		await interaction.followUp({ embeds: [embed] });
	}

	private _formatTime(diff: number) {
		if (diff >= 24 * 60 * 60 * 1000) {
			return moment.duration(diff).format('d[d] h[h]', { trim: 'both mid' });
		}
		return moment.duration(diff).format('h[h] m[m]', { trim: 'both mid' });
	}
}
