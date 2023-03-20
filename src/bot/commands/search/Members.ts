import { CommandInteraction, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType, User, time } from 'discord.js';
import { Clan, Player, PlayerItem } from 'clashofclans.js';
import ms from 'ms';
import { HERO_PETS, ORANGE_NUMBERS } from '../../util/Emojis.js';
import { Command } from '../../lib/index.js';
import { Util } from '../../util/index.js';

const roleIds: { [key: string]: number } = {
	member: 1,
	admin: 2,
	coLeader: 3,
	leader: 4
};

const roleNames: Record<string, string> = {
	member: 'Mem',
	admin: 'Eld',
	coLeader: 'Co',
	leader: 'Lead'
};

const PETS = Object.keys(HERO_PETS).reduce<Record<string, number>>((prev, curr, i) => {
	prev[curr] = i + 1;
	return prev;
}, {});

export default class MembersCommand extends Command {
	public constructor() {
		super('members', {
			category: 'search',
			channel: 'guild',
			clientPermissions: ['EmbedLinks', 'AttachFiles'],
			description: {
				content: 'Clan members with Town Halls and Heroes.'
			},
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; option: string; user?: User }) {
		const command = {
			discord: this.handler.modules.get('link-list')!,
			trophies: this.handler.modules.get('trophies')!,
			attacks: this.handler.modules.get('attacks')!
		}[args.option];
		if (command) return this.handler.exec(interaction, command, { tag: args.tag });

		const data = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
		if (!data) return;
		if (!data.members) return interaction.editReply(this.i18n('common.no_clan_members', { lng: interaction.locale, clan: data.name }));

		const fetched = (await this.client.http.detailedClanMembers(data.memberList)).filter((res) => res.ok);
		const members = fetched
			.filter((res) => res.ok)
			.map((m) => ({
				name: m.name,
				tag: m.tag,
				warPreference: m.warPreference === 'in',
				role: {
					id: roleIds[m.role ?? data.memberList.find((mem) => mem.tag === m.tag)!.role],
					name: roleNames[m.role ?? data.memberList.find((mem) => mem.tag === m.tag)!.role]
				},
				townHallLevel: m.townHallLevel,
				heroes: m.heroes.length ? m.heroes.filter((a) => a.village === 'home') : [],
				pets: m.troops.filter((troop) => troop.name in PETS).sort((a, b) => PETS[a.name] - PETS[b.name])
			}));

		members
			.sort((a, b) => b.heroes.reduce((x, y) => x + y.level, 0) - a.heroes.reduce((x, y) => x + y.level, 0))
			.sort((a, b) => b.townHallLevel - a.townHallLevel);

		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setFooter({
				text: `Total ${fetched.length === data.members ? data.members : `${fetched.length}/${data.members}`}/50`
			})
			.setAuthor({ name: `${data.name} (${data.tag})`, iconURL: data.badgeUrls.medium })
			.setDescription(
				[
					'```',
					`TH BK AQ GW RC  ${'NAME'}`,
					members
						.map((mem) => {
							const heroes = this.heroes(mem.heroes)
								.map((hero) => this.padStart(hero.level))
								.join(' ');
							return `${mem.townHallLevel.toString().padStart(2, ' ')} ${heroes}  \u200e${mem.name}`;
						})
						.join('\n'),
					'```'
				].join('\n')
			);

		if (args.option === 'tags') {
			embed.setDescription(
				[
					'```',
					`\u200e${'TAG'.padStart(10, ' ')}  ${'NAME'}`,
					members.map((mem) => `\u200e${mem.tag.padStart(10, ' ')}  ${mem.name}`).join('\n'),
					'```'
				].join('\n')
			);
		}

		if (args.option === 'roles') {
			const _members = [...members].sort((a, b) => b.role.id - a.role.id);
			embed.setDescription(
				[
					'```',
					`\u200e ${'ROLE'.padEnd(4, ' ')}  ${'NAME'}`,
					_members.map((mem) => `\u200e ${mem.role.name.padEnd(4, ' ')}  ${mem.name}`).join('\n'),
					'```'
				].join('\n')
			);
		}

		const trackingDate = new Date('2023-02-27').getTime();
		if (args.option === 'warPref') {
			const members = await this.getWarPref(data, fetched);
			const optedIn = members.filter((m) => m.warPreference === 'in');
			const optedOut = members.filter((m) => m.warPreference !== 'in');
			optedIn.sort((a, b) => {
				if (a.inTime && b.inTime) return b.inTime.getTime() - a.inTime.getTime();
				if (a.inTime) return -1;
				if (b.inTime) return 1;
				return 0;
			});
			optedOut.sort((a, b) => {
				if (a.outTime && b.outTime) return b.outTime.getTime() - a.outTime.getTime();
				if (a.outTime) return -1;
				if (b.outTime) return 1;
				return 0;
			});
			embed.setDescription(
				[
					`**Opted in ~ ${optedIn.length}**`,
					optedIn
						.map((m) => {
							const inTime = m.inTime ? ms(Date.now() - m.inTime.getTime()) : `~${ms(Date.now() - trackingDate)}`;
							return `**✓** ${ORANGE_NUMBERS[m.townHallLevel]} \u200e\` ${Util.escapeBackTick(m.name).padEnd(
								15,
								' '
							)} ${inTime.padStart(6, ' ')}\u200f\``;
						})
						.join('\n'),
					'',
					`**Opted out ~ ${optedOut.length}**`,
					optedOut
						.map((m) => {
							const outTime = m.outTime ? ms(Date.now() - m.outTime.getTime()) : `~${ms(Date.now() - trackingDate)}`;
							return `**✘** ${ORANGE_NUMBERS[m.townHallLevel]} \u200e\` ${Util.escapeBackTick(m.name).padEnd(
								15,
								' '
							)} ${outTime.padStart(6, ' ')}\u200f\``;
						})
						.join('\n')
				].join('\n')
			);
			embed.setFooter({ text: `War Preference (${optedIn.length}/${members.length})` });
		}

		if (args.option === 'joinLeave') {
			const members = await this.clanReputation(data, fetched);
			members.sort((a, b) => {
				if (a.inTime && b.inTime) return b.inTime.getTime() - a.inTime.getTime();
				if (a.inTime) return -1;
				if (b.inTime) return 1;
				return 0;
			});
			embed.setDescription(
				members
					.map((m) => {
						const inTime = m.inTime ? time(m.inTime, 'R') : '';
						const hall = m.townHallLevel.toString().padStart(2, ' ');
						return `\u200e\`${hall}  ${Util.escapeBackTick(m.name).padEnd(15, ' ')}\u200f\`\u200e ${inTime}`;
					})
					.join('\n')
			);
			embed.setFooter({ text: `Last Join Dates` });
		}

		const customId = this.client.uuid(interaction.user.id);
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setEmoji('📥').setLabel('Download').setCustomId(customId).setStyle(ButtonStyle.Secondary)
		);

		const msg = await interaction.editReply({ embeds: [embed], components: [row] });
		const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
			filter: (action) => [customId].includes(action.customId) && action.user.id === interaction.user.id,
			time: 10 * 60 * 1000,
			max: 1
		});

		collector.on('collect', async (action) => {
			if (action.customId === customId) {
				return this.handler.exec(action, this.handler.modules.get('export-members')!, { clans: data.tag });
			}
		});

		collector.on('end', async (_, reason) => {
			this.client.components.delete(customId);
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
	}

	private heroes(items: PlayerItem[]) {
		return Object.assign([{ level: '  ' }, { level: '  ' }, { level: '  ' }, { level: '  ' }], items);
	}

	private padStart(num: number | string) {
		return num.toString().padStart(2, ' ');
	}

	private async getWarPref(clan: Clan, players: Player[]) {
		const { aggregations } = await this.client.elastic.search({
			index: 'clan_member_events',
			query: {
				bool: {
					filter: [
						{ match: { op: 'WAR_PREF_CHANGE' } },
						{ match: { clan_tag: clan.tag } },
						{ terms: { tag: players.map((p) => p.tag) } }
					]
				}
			},
			size: 0,
			from: 0,
			sort: [{ created_at: 'desc' }],
			aggs: {
				players: {
					terms: {
						field: 'tag',
						size: 50
					},
					aggs: {
						in_stats: {
							filter: { term: { value: 'in' } },
							aggs: {
								aggregated: {
									stats: { field: 'created_at' }
								}
							}
						},
						out_stats: {
							filter: { term: { value: 'out' } },
							aggs: {
								aggregated: {
									stats: { field: 'created_at' }
								}
							}
						}
					}
				}
			}
		});

		const { buckets } = (aggregations?.players ?? []) as { buckets: AggsBucket[] };
		const playersMap = buckets.reduce<Record<string, AggsBucket>>((acc, cur) => {
			acc[cur.key] = cur;
			return acc;
		}, {});

		const warPref = players.map((player) => {
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (!playersMap[player.tag])
				return {
					warPreference: player.warPreference,
					townHallLevel: player.townHallLevel,
					name: player.name,
					inTime: null,
					outTime: null
				};

			const { in_stats, out_stats } = playersMap[player.tag];
			const inTime = in_stats.aggregated.max;
			const outTime = out_stats.aggregated.max;

			return {
				name: player.name,
				townHallLevel: player.townHallLevel,
				warPreference: player.warPreference,
				inTime: inTime ? new Date(inTime) : null,
				outTime: outTime ? new Date(outTime) : null
			};
		});

		return warPref;
	}

	private async clanReputation(clan: Clan, players: Player[]) {
		const { aggregations } = await this.client.elastic.search({
			index: 'join_leave_events',
			query: {
				bool: {
					filter: [
						{ terms: { op: ['JOINED', 'LEFT'] } },
						{ match: { clan_tag: clan.tag } },
						{ terms: { tag: players.map((p) => p.tag) } }
					]
				}
			},
			size: 0,
			from: 0,
			sort: [{ created_at: 'desc' }],
			aggs: {
				players: {
					terms: {
						field: 'tag',
						size: 50
					},
					aggs: {
						in_stats: {
							filter: { term: { op: 'JOINED' } },
							aggs: {
								aggregated: {
									stats: { field: 'created_at' }
								}
							}
						},
						out_stats: {
							filter: { term: { op: 'LEFT' } },
							aggs: {
								aggregated: {
									stats: { field: 'created_at' }
								}
							}
						}
					}
				}
			}
		});

		const { buckets } = (aggregations?.players ?? []) as { buckets: AggsBucket[] };
		const playersMap = buckets.reduce<Record<string, AggsBucket>>((acc, cur) => {
			acc[cur.key] = cur;
			return acc;
		}, {});

		const warPref = players.map((player) => {
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (!playersMap[player.tag])
				return {
					townHallLevel: player.townHallLevel,
					name: player.name,
					inTime: null,
					outTime: null
				};

			const { in_stats, out_stats } = playersMap[player.tag];
			const inTime = in_stats.aggregated.max;
			const outTime = out_stats.aggregated.max;

			return {
				name: player.name,
				townHallLevel: player.townHallLevel,
				inTime: inTime ? new Date(inTime) : null,
				outTime: outTime ? new Date(outTime) : null
			};
		});

		return warPref;
	}
}

interface AggsBucket {
	key: string;
	doc_count: number;
	in_stats: {
		doc_count: number;
		aggregated: { max: number | null; min: number | null };
	};
	out_stats: {
		doc_count: number;
		aggregated: { max: number | null; min: number | null };
	};
}
