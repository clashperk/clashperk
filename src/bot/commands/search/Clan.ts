import { APIClan } from 'clashofclans.js';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	CommandInteraction,
	EmbedBuilder,
	escapeMarkdown,
	Guild,
	Message,
	User
} from 'discord.js';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
import { CLAN_LABELS, CWL_LEAGUES, EMOJIS } from '../../util/Emojis.js';
import { Season } from '../../util/index.js';

const clanTypes: Record<string, string> = {
	inviteOnly: 'Invite Only',
	closed: 'Closed',
	open: 'Anybody Can Join'
};

export default class ClanCommand extends Command {
	public constructor() {
		super('clan', {
			category: 'search',
			channel: 'guild',
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			defer: true
		});
	}

	public async run(message: Message, { tag }: { tag: string }) {
		const { res, body: clan } = await this.client.http.getClan(tag);
		if (!res.ok) return null;
		const embed = await this.embed(message.guild!, clan);
		return message.channel.send({
			embeds: [embed],
			allowedMentions: { repliedUser: false },
			reply: { messageReference: message, failIfNotExists: false }
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; user?: User }) {
		const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
		if (!clan) return;

		const embed = await this.embed(interaction.guild, clan);

		const row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(
				new ButtonBuilder()
					.setEmoji(EMOJIS.REFRESH)
					.setStyle(ButtonStyle.Secondary)
					.setCustomId(JSON.stringify({ cmd: 'clan', tag: clan.tag }))
			)
			.addComponents(new ButtonBuilder().setLabel('Clan Badge').setStyle(ButtonStyle.Link).setURL(clan.badgeUrls.large));
		return interaction.editReply({ embeds: [embed], components: [row] });
	}

	private async embed(guild: Guild, clan: APIClan) {
		const embed = new EmbedBuilder()
			.setTitle(`${escapeMarkdown(clan.name)} (${clan.tag})`)
			.setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(clan.tag)}`)
			.setColor(this.client.embed(guild.id))
			.setThumbnail(clan.badgeUrls.medium);

		const capitalHall = clan.clanCapital.capitalHallLevel ? ` ${EMOJIS.CAPITAL_HALL} **${clan.clanCapital.capitalHallLevel}**` : '';

		embed.setDescription(
			[
				`${EMOJIS.CLAN} **${clan.clanLevel}**${capitalHall} ${EMOJIS.USERS} **${clan.members}** ${EMOJIS.TROPHY} **${clan.clanPoints}** ${EMOJIS.BB_TROPHY} **${clan.clanBuilderBasePoints}**`,
				'',
				`${clan.description}${clan.description ? '\n\n' : ''}${clan.labels
					.map((d) => `${CLAN_LABELS[d.name]} ${d.name}`)
					.join('\n')}`
			].join('\n')
		);

		const location = clan.location
			? clan.location.isCountry
				? `:flag_${clan.location.countryCode!.toLowerCase()}: ${clan.location.name}`
				: `🌐 ${clan.location.name}`
			: `${EMOJIS.WRONG} None`;

		const leader = clan.memberList.filter((m) => m.role === 'leader').map((m) => m.name);
		const rankInfo = await this.clanRank(clan.tag, clan.clanPoints);
		const rank = rankInfo
			? rankInfo.gain > 0
				? `\n**Global Rank**\n📈 #${rankInfo.rank} ${EMOJIS.UP_KEY} +${rankInfo.gain}`
				: `\n**Global Rank**\n📈 #${rankInfo.rank} ${EMOJIS.DOWN_KEY} ${rankInfo.gain}`
			: '';

		embed.addFields([
			{
				name: '\u200e',
				value: [
					'**Clan Leader**',
					`${EMOJIS.OWNER} ${leader.length ? `${escapeMarkdown(leader.join(', '))}` : 'No Leader'}`,
					'**Location**',
					`${location}${rank}`,
					'**Requirements**',
					`⚙️ ${clanTypes[clan.type]} ${EMOJIS.TROPHY} ${clan.requiredTrophies} Required ${
						clan.requiredTownhallLevel ? `${EMOJIS.TOWN_HALL} ${clan.requiredTownhallLevel}+` : ''
					}`,
					'\u200b\u2002'
				].join('\n')
			}
		]);

		const [action, season, wars] = await Promise.all([this.getActivity(clan), this.getSeason(clan), this.getWars(clan.tag)]);
		const fields = [];
		if (action) {
			fields.push(
				...[
					'**Daily Average**',
					`${EMOJIS.ACTIVITY} ${action.avg_total.toFixed()} Activities`,
					`${EMOJIS.USER_BLUE} ${action.avg_online.toFixed()} Active Members`
				]
			);
		}
		if (season) {
			fields.push(
				...[
					'**Total Attacks**',
					`${EMOJIS.SWORD} ${season.attackWins} ${EMOJIS.SHIELD} ${season.defenseWins}`,
					'**Total Donations**',
					`${EMOJIS.TROOPS_DONATE} ${season.donations} ${EMOJIS.UP_KEY} ${season.donationsReceived} ${EMOJIS.DOWN_KEY}`
				]
			);
		}
		if (wars.length) {
			const won = wars.filter((war) => war.result).length;
			const lost = wars.filter((war) => !war.result).length;
			fields.push(
				...['**Total Wars**', `${EMOJIS.CROSS_SWORD} ${wars.length} Wars ${EMOJIS.OK} ${won} Won ${EMOJIS.WRONG} ${lost} Lost`]
			);
		}
		if (fields.length) embed.addFields([{ name: `**Season Stats (${Season.previousID})**`, value: [...fields, '\u200e'].join('\n') }]);

		embed.addFields([
			{
				name: '**War and League**',
				value: [
					'**War Log**',
					`${clan.isWarLogPublic ? '🔓 Public' : '🔒 Private'}`,
					'**War Performance**',
					`${EMOJIS.OK} ${clan.warWins} Won ${
						clan.isWarLogPublic ? `${EMOJIS.WRONG} ${clan.warLosses!} Lost ${EMOJIS.EMPTY} ${clan.warTies!} Tied` : ''
					}`,
					'**Win Streak**',
					`${'🏅'} ${clan.warWinStreak}`,
					'**War Frequency**',
					clan.warFrequency.toLowerCase() === 'morethanonceperweek'
						? '🎟️ More Than Once Per Week'
						: `🎟️ ${clan.warFrequency.toLowerCase().replace(/\b(\w)/g, (char) => char.toUpperCase())}`,
					'**War League**',
					`${CWL_LEAGUES[clan.warLeague?.name ?? ''] || EMOJIS.EMPTY} ${clan.warLeague?.name ?? 'Unranked'}`
				].join('\n')
			}
		]);

		return embed;
	}

	private async clanRank(tag: string, clanPoints: number) {
		if (clanPoints >= 50000) {
			const { res, body: clanRank } = await this.client.http.getClanRanks('global');
			if (!res.ok) return null;
			const clan = clanRank.items.find((clan) => clan.tag === tag);
			if (!clan) return null;

			return {
				rank: Number(clan.rank),
				gain: Number(clan.previousRank - clan.rank)
			};
		}
		return null;
	}

	private async getActivity(clan: APIClan): Promise<{ avg_total: number; avg_online: number } | null> {
		return this.client.db
			.collection(Collections.LAST_SEEN)
			.aggregate<{ avg_total: number; avg_online: number }>([
				{
					$match: {
						'clan.tag': clan.tag
					}
				},
				{
					$sort: {
						lastSeen: -1
					}
				},
				{
					$limit: 50
				},
				{
					$unwind: {
						path: '$entries'
					}
				},
				{
					$match: {
						'entries.entry': {
							$gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
						}
					}
				},
				{
					$group: {
						_id: {
							date: {
								$dateToString: {
									date: '$entries.entry',
									format: '%Y-%m-%d'
								}
							},
							tag: '$tag'
						},
						count: {
							$sum: '$entries.count'
						}
					}
				},
				{
					$group: {
						_id: '$_id.date',
						online: {
							$sum: 1
						},
						total: {
							$sum: '$count'
						}
					}
				},
				{
					$group: {
						_id: null,
						avg_online: {
							$avg: '$online'
						},
						avg_total: {
							$avg: '$total'
						}
					}
				}
			])
			.next();
	}

	private async getSeason(clan: APIClan) {
		[
			{
				$limit: 100
			},
			{
				$match: {
					__clans: {
						$size: 3
					}
				}
			},
			{
				$project: {
					clans: {
						$objectToArray: '$clans'
					},
					name: 1,
					tag: 1,
					attackWins: 1,
					defenseWins: 1
				}
			},
			{
				$unwind: {
					path: '$clans'
				}
			},
			{
				$project: {
					name: 1,
					tag: 1,
					clanTag: '$clans.v.tag',
					donations: '$clans.v.donations.total',
					donationsReceived: '$clans.v.donationsReceived.total'
				}
			}
		];
		return this.client.db
			.collection(Collections.PLAYER_SEASONS)
			.aggregate<{ donations: number; donationsReceived: number; attackWins: number; defenseWins: number }>([
				{
					$match: {
						__clans: clan.tag,
						season: Season.previousID,
						tag: { $in: clan.memberList.map((m) => m.tag) }
					}
				},
				{
					$project: {
						attackWins: 1,
						defenseWins: 1,
						donations: `$clans.${clan.tag}.donations.total`,
						donationsReceived: `$clans.${clan.tag}.donationsReceived.total`
					}
				},
				{
					$sort: { donations: -1 }
				},
				{
					$limit: 50
				},
				{
					$group: {
						_id: null,
						donations: {
							$sum: '$donations'
						},
						donationsReceived: {
							$sum: '$donationsReceived'
						},
						attackWins: {
							$sum: '$attackWins'
						},
						defenseWins: {
							$sum: '$defenseWins'
						}
					}
				}
			])
			.next();
	}

	private async getWars(tag: string): Promise<{ result: boolean; stars: number[] }[]> {
		return this.client.db
			.collection(Collections.CLAN_WARS)
			.aggregate<{ result: boolean; stars: number[] }>([
				{
					$match: {
						$or: [{ 'clan.tag': tag }, { 'opponent.tag': tag }],
						state: 'warEnded',
						season: Season.previousID
					}
				},
				{
					$set: {
						clan: {
							$cond: [{ $eq: ['$clan.tag', tag] }, '$clan', '$opponent']
						},
						opponent: {
							$cond: [{ $eq: ['$clan.tag', tag] }, '$opponent', '$clan']
						}
					}
				},
				{
					$project: {
						result: {
							$switch: {
								branches: [
									{
										case: { $gt: ['$clan.stars', '$opponent.stars'] },
										then: true
									},
									{
										case: { $lt: ['$clan.stars', '$opponent.stars'] },
										then: false
									},
									{
										case: { $gt: ['$clan.destructionPercentage', '$opponent.destructionPercentage'] },
										then: true
									},
									{
										case: { $lt: ['$clan.destructionPercentage', '$opponent.destructionPercentage'] },
										then: false
									}
								],
								default: false
							}
						}
					}
				}
			])
			.toArray();
	}
}
