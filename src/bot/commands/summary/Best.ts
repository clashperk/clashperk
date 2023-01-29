import { CommandInteraction, EmbedBuilder, embedLength } from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
import { BLUE_NUMBERS, EMOJIS } from '../../util/Emojis.js';
import { ClanGames, Season, Util } from '../../util/index.js';

interface Aggregated {
	tag: string;
	name: string;
	_elixirLoot: number;
	_goldLoot: number;
	_darkLoot: number;
	_troops: number;
	_spells: number;
	_sieges: number;
	_warStars: number;
	_cwlStars: number;
	_clanGamesPoints: number;
	_clanGamesCompletedAt: Date;
	_clanGamesCompletionTime: number;
	_trophiesGained: number;
	_trophies: number;
	_versusTrophies: number;
	_versusAttackWins: number;
	_capitalLoot: number;
	_capitalDonations: number;
	_attackWins: number;
	_defenseWins: number;
	_score: number;
	_donations: number;
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
		super('family-best', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, { season, top }: { season?: string; top?: number }) {
		if (!season) season = Season.ID;
		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `${interaction.guild.name} Best Players`, iconURL: interaction.guild.iconURL({ forceStatic: false })! });

		const clans = await this.client.storage.find(interaction.guild.id);
		if (!clans.length) {
			return interaction.editReply(this.i18n('common.no_clans_linked', { lng: interaction.locale }));
		}

		const aggregated = await this.client.db
			.collection(Collections.PLAYER_SEASONS)
			.aggregate<Aggregated>([
				{
					$match: {
						__clans: { $in: clans.map((c) => c.tag) },
						season: season
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
							$subtract: ['$siegeMachinesDonations.current', '$siegeMachinesDonations.initial']
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
						_defenseWins: '$defenseWins'
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
									count: `$seasons.${season}`
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
						pipeline: [{ $match: { season } }, { $project: { current: 1, initial: 1, completedAt: 1 } }]
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
								unit: 'hour'
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
					$sort: { _score: -1 }
				},
				{
					$limit: 50 * clans.length
				}
			])
			.toArray();
		if (!aggregated.length) {
			return interaction.editReply(this.i18n('common.no_data', { lng: interaction.locale }));
		}

		const _timestamp = ClanGames.startTimestamp.getTime();
		const _fields = Object.keys(fields);
		_fields.map((field) => {
			const key = field as keyof typeof fields;
			aggregated.sort((a, b) => b[key] - a[key]);
			const members = aggregated.filter((n) => !isNaN(n[key])).slice(0, Number(top ?? 5));

			if (!members.length) {
				return embed.addFields({
					name: fields[key],
					value: 'No data available at this moment!'
				});
			}

			return embed.addFields({
				name: fields[key],
				value: members
					.map((member, n) => {
						moment.duration();
						const num =
							key === '_clanGamesCompletionTime'
								? this._formatTime(member._clanGamesCompletedAt.getTime() - _timestamp).padStart(7, ' ')
								: Util.formatNumber(member[key]).padStart(7, ' ');
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
			embed.setFooter({ text: `Season ${season}` });
			return interaction.followUp({ embeds: [embed] });
		}

		embed.setFooter({ text: `Season ${season}` });
		await interaction.followUp({ embeds: [embed] });
	}

	private _formatTime(diff: number) {
		if (diff >= 24 * 60 * 60 * 1000) {
			return moment.duration(diff).format('d[d] h[h]', { trim: 'both mid' });
		}
		return moment.duration(diff).format('h[h] m[m]', { trim: 'both mid' });
	}
}
