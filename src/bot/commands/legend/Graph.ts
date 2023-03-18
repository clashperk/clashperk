import { AttachmentBuilder, CommandInteraction, User } from 'discord.js';
import moment from 'moment';
import fetch from 'node-fetch';
import { Args, Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
import { Season } from '../../util/index.js';

export default class LegendGraphCommand extends Command {
	public constructor() {
		super('legend-graph', {
			category: 'search',
			channel: 'guild',
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			defer: true
		});
	}

	public args(): Args {
		return {
			player_tag: {
				id: 'tag',
				match: 'STRING'
			}
		};
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; user?: User }) {
		const data = await this.client.resolver.resolvePlayer(interaction, args.tag ?? args.user?.id);
		if (!data) return;

		const seasonIds = Array.from({ length: 4 }, (_, i) => i)
			.map((i) => moment().startOf('month').subtract(i, 'months').toDate())
			.map((date) => Season.getSeasonIdAgainstDate(date))
			.reverse()
			.slice(0, 3);

		const result = await this.client.db
			.collection(Collections.LEGEND_ATTACKS)
			.aggregate<{
				_id: string;
				logs: {
					timestamp: Date;
					trophies: string | null;
				}[];
				avgGain: number;
				avgOffense: number;
				avgDefense: number;
			}>([
				{
					$match: {
						tag: data.tag,
						seasonId: {
							$in: seasonIds.map((id) => Season.generateID(id))
						}
					}
				},
				{
					$unwind: {
						path: '$logs'
					}
				},
				{
					$set: {
						ts: {
							$toDate: '$logs.timestamp'
						}
					}
				},
				{
					$set: {
						ts: {
							$dateTrunc: {
								date: '$ts',
								unit: 'day'
							}
						}
					}
				},
				{
					$sort: {
						ts: 1
					}
				},
				{
					$addFields: {
						gain: {
							$subtract: ['$logs.end', '$logs.start']
						},
						offense: {
							$cond: {
								if: {
									$gt: ['$logs.inc', 0]
								},
								then: '$logs.inc',
								else: 0
							}
						},
						defense: {
							$cond: {
								if: {
									$lte: ['$logs.inc', 0]
								},
								then: '$logs.inc',
								else: 0
							}
						}
					}
				},
				{
					$group: {
						_id: '$ts',
						seasonId: {
							$first: '$seasonId'
						},
						trophies: {
							$last: '$logs.end'
						},
						gain: {
							$sum: '$gain'
						},
						offense: {
							$sum: '$offense'
						},
						defense: {
							$sum: '$defense'
						}
					}
				},
				{
					$sort: {
						_id: 1
					}
				},
				{
					$group: {
						_id: '$seasonId',
						logs: {
							$push: {
								timestamp: '$_id',
								trophies: '$trophies'
							}
						},
						avgGain: {
							$avg: '$gain'
						},
						avgDefense: {
							$avg: '$defense'
						},
						avgOffense: {
							$avg: '$offense'
						}
					}
				},
				{
					$sort: {
						_id: -1
					}
				}
			])
			.toArray();

		if (!result.length) {
			return interaction.followUp({ content: this.i18n('common.no_data', { lng: interaction.locale }), ephemeral: true });
		}
		const season = result.at(0)!;

		const dates = season.logs.map((log) => moment(log.timestamp));
		const minDate = moment.min(dates).startOf('day');
		const maxDate = moment.max(dates).endOf('day');
		const labels = Array.from({ length: maxDate.diff(minDate, 'days') + 1 }, (_, i) => moment(minDate).add(i, 'days').toDate());

		const currentDate = new Date(maxDate.toDate());
		const currentYear = currentDate.getFullYear();
		const currentMonth = currentDate.getMonth();
		const daysInPreviousMonth = new Date(currentYear, currentMonth, 0).getDate();

		result.forEach(({ logs, _id }) => {
			if (_id !== season._id) {
				logs.forEach((log) => {
					const daysToSubtract = daysInPreviousMonth - log.timestamp.getDate();
					const newDate = new Date(currentYear, currentMonth, currentDate.getDate() - daysToSubtract);
					log.timestamp = newDate;
				});
			}
		});

		for (const label of labels) {
			result.forEach(({ logs }) => {
				const log = logs.find((log) => moment(log.timestamp).isSame(label, 'day'));
				if (!log) logs.push({ timestamp: label, trophies: null });
			});

			for (const season of result) {
				season.logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
			}
		}

		const buffer = await fetch(`${process.env.ASSET_API_BACKEND!}/legends/graph`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				datasets: result.slice(0, 2),
				labels,
				name: data.name,
				avgNetGain: this.formatNumber(season.avgGain),
				avgOffense: this.formatNumber(season.avgOffense),
				avgDefense: this.formatNumber(season.avgDefense),
				currentTrophies: data.trophies.toFixed(0),
				clanName: data.clan?.name,
				clanBadgeURL: data.clan?.badgeUrls.large,
				season: `${moment(season._id).format('MMMM YYYY')} (${minDate.format('DD MMM')} - ${maxDate.format('DD MMM')})`
			})
		}).then((res) => res.arrayBuffer());

		await interaction.followUp({ files: [new AttachmentBuilder(Buffer.from(buffer), { name: 'profile-image.png' })] });
	}

	private formatNumber(num: number) {
		return `${num > 0 ? '+' : ''}${num.toFixed(0)}`;
	}
}
