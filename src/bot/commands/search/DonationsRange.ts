import { CommandInteraction, EmbedBuilder, escapeMarkdown, time } from 'discord.js';
import moment from 'moment';
import { Args, Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
import { padStart } from '../../util/Helper.js';
import { Season, Util } from '../../util/index.js';

export default class DonationsCommand extends Command {
	public constructor() {
		super('donations_range', {
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public args(): Args {
		return {
			season: {
				match: 'ENUM',
				enums: [...Util.getSeasonIds(), [Util.getLastSeasonId(), 'last']],
				default: Season.ID
			}
		};
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: {
			tag?: string;
			gte?: string;
			lte?: string;
		}
	) {
		const clan = await this.client.resolver.resolveClan(interaction, args.tag);
		if (!clan) return;
		const now = moment('2023-04-03').toDate();
		const lte = moment(now).weekday(1).startOf('day').toISOString();
		const gte = moment(lte).subtract(7, 'days').toISOString();

		const { aggregations } = await this.client.elastic.search({
			index: 'donation_events',
			size: 0,
			from: 0,
			query: {
				bool: {
					filter: [
						{
							term: {
								clan_tag: clan.tag
							}
						},
						{
							range: {
								created_at: {
									gte,
									lte
								}
							}
						}
					]
				}
			},
			aggs: {
				players: {
					terms: {
						field: 'tag',
						size: 10000
					},
					aggs: {
						donated: {
							filter: { term: { op: 'DONATED' } },
							aggs: {
								total: {
									sum: {
										field: 'value'
									}
								}
							}
						},
						received: {
							filter: { term: { op: 'RECEIVED' } },
							aggs: {
								total: {
									sum: {
										field: 'value'
									}
								}
							}
						}
					}
				}
			}
		});

		const { buckets } = (aggregations?.players ?? []) as { buckets: AggsBucket[] };
		const playersMap = buckets.reduce<Record<string, { donated: number; received: number }>>((acc, cur) => {
			acc[cur.key] = {
				donated: cur.donated.total.value,
				received: cur.received.total.value
			};
			return acc;
		}, {});

		const playerTags = Object.keys(playersMap);
		const currentMemberTags = clan.memberList.map((member) => member.tag);
		const oldMemberTags = playerTags.filter((tag) => !currentMemberTags.includes(tag));

		const players = await this.client.db
			.collection(Collections.LAST_SEEN)
			.find({ tag: { $in: oldMemberTags } }, { projection: { name: 1, tag: 1 } })
			.toArray();

		const result = [...clan.memberList, ...players].map((player) => ({
			name: player.name,
			tag: player.tag,
			donated: playersMap[player.tag]?.donated ?? 0, // eslint-disable-line
			received: playersMap[player.tag]?.received ?? 0 // eslint-disable-line
		}));

		result.sort((a, b) => b.received - a.received);
		result.sort((a, b) => b.donated - a.donated);

		const embed = new EmbedBuilder()
			.setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.large })
			.setColor(this.client.embed(interaction))
			.setDescription(
				[
					'**Daily Donations**',
					`${time(moment(gte).toDate())} - ${time(moment(lte).toDate())}`,
					'',
					...result.map((player) => {
						const don = padStart(player.donated, 5);
						const rec = padStart(player.received, 5);
						const name = escapeMarkdown(player.name);
						return `\` ${don} ${rec} \` ${name}`;
					})
				].join('\n')
			);
		const donated = result.reduce((acc, cur) => acc + cur.donated, 0);
		const received = result.reduce((acc, cur) => acc + cur.received, 0);
		embed.setFooter({ text: `[${donated} DON | ${received} REC]` });
		embed.setTimestamp();

		return interaction.editReply({ embeds: [embed] });
	}
}

interface AggsBucket {
	key: string;
	doc_count: number;
	donated: {
		total: {
			value: number;
		};
	};
	received: {
		total: {
			value: number;
		};
	};
}
