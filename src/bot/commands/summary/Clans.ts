import { Clan } from 'clashofclans.js';
import { CommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../lib/index.js';
import { Season } from '../../util/index.js';

export default class SummaryClansCommand extends Command {
	public constructor() {
		super('summary-clans', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>) {
		const clans = await this.client.storage.find(interaction.guild.id);
		if (!clans.length) {
			return interaction.editReply(this.i18n('common.no_clans_linked', { lng: interaction.locale }));
		}

		const clanList = (await Promise.all(clans.map((clan) => this.client.http.clan(clan.tag)))).filter((res) => res.ok);
		clanList.sort((a, b) => a.name.localeCompare(b.name));
		const joinLeaves = await this.getJoinLeave(clanList);

		joinLeaves.sort((a, b) => a.leave - b.leave);
		joinLeaves.sort((a, b) => b.join - a.join);

		const nameLen = Math.max(...clanList.map((clan) => clan.name.length)) + 1;
		const tagLen = Math.max(...clanList.map((clan) => clan.tag.length)) + 1;

		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `${interaction.guild.name} Clans`, iconURL: interaction.guild.iconURL()! });
		embed.setDescription(
			[
				clanList
					.map(
						(clan) =>
							`\`\u200e${clan.name.padEnd(nameLen, ' ')} ${clan.tag.padStart(tagLen, ' ')}  ${clan.members
								.toString()
								.padStart(2, ' ')}/50 \u200f\``
					)
					.join('\n'),
				'',
				`\`${'JOINED'.padStart(5, ' ')} ${'LEFT'.padStart(5, ' ')}  ${'CLAN'.padEnd(nameLen, ' ')} \``,
				joinLeaves
					.map((clan) => {
						return `\`\u200e ${this.fmtNum(clan.join)} ${this.fmtNum(clan.leave)}  ${clan.name.padEnd(nameLen, ' ')} \u200f\``;
					})
					.join('\n')
			].join('\n')
		);
		embed.setFooter({ text: `Season ${Season.ID}` });

		return interaction.editReply({ embeds: [embed] });
	}

	private async getJoinLeave(clans: Clan[]) {
		const { aggregations } = await this.client.elastic.search({
			index: 'join_leave_events',
			query: {
				bool: {
					filter: [{ terms: { clan_tag: clans.map((clan) => clan.tag) } }]
				}
			},
			size: 0,
			sort: [{ created_at: { order: 'desc' } }],
			aggs: {
				clans: {
					terms: {
						field: 'clan_tag',
						size: Math.min(10_000, clans.length * 60)
					},
					aggs: {
						events: {
							terms: {
								field: 'op'
							}
						}
					}
				}
			}
		});

		const { buckets } = (aggregations?.clans ?? []) as { buckets: AggsBucket[] };
		const clanMap = buckets
			.flatMap((bucket) => bucket.events.buckets.map(({ doc_count, key }) => ({ bucket, doc_count, key })))
			.reduce<Record<string, Record<string, number>>>((acc, { bucket, doc_count, key }) => {
				acc[bucket.key] ??= {};
				acc[bucket.key][key] = doc_count;
				return acc;
			}, {});

		return clans.map((clan) => {
			const join = clanMap[clan.tag]?.JOINED ?? 0; // eslint-disable-line
			const leave = clanMap[clan.tag]?.LEFT ?? 0; // eslint-disable-line
			return { name: clan.name, tag: clan.tag, join, leave };
		});
	}

	private fmtNum(num: number) {
		const numString = num > 999 ? `${(num / 1000).toFixed(1)}K` : num.toString();
		return numString.padStart(5, ' ');
	}
}

interface AggsBucket {
	key: string;
	doc_count: number;
	events: {
		buckets: {
			key: string;
			doc_count: number;
		}[];
	};
}
