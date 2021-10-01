import { EMOJIS, CWL_LEAGUES, CLAN_LABELS } from '../../util/Emojis';
import { MessageEmbed, Util, Message, MessageButton, MessageActionRow } from 'discord.js';
import { Command } from 'discord-akairo';
import { Clan } from 'clashofclans.js';
import { Season } from '../../util/Util';
import { Collections } from '../../util/Constants';

const clanTypes: { [key: string]: string } = {
	inviteOnly: 'Invite Only',
	closed: 'Closed',
	open: 'Anybody Can Join'
};

export default class ClanCommand extends Command {
	public constructor() {
		super('clan', {
			aliases: ['clan', 'myclan', 'c'],
			category: 'search',
			description: {
				content: 'Shows some basic info about your clan.',
				usage: '<clanTag>',
				examples: ['#8QU8J9LP', '8QU8J9LP']
			},
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			optionFlags: ['--tag']
		});
	}

	public *args(msg: Message): unknown {
		const data = yield {
			flag: '--tag',
			match: msg.interaction ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolveClan(msg, tag)
		};

		return { data };
	}

	private async clanRank(tag: string, clanPoints: number) {
		if (clanPoints >= 50000) {
			const clanRank = await this.client.http.clanRanks('global').catch(() => null);
			if (!clanRank?.ok) return null;
			const clan = clanRank.items.find((clan: any) => clan?.tag === tag);
			if (!clan) return null;

			return {
				rank: Number(clan.rank),
				gain: Number(clan.previousRank - clan.rank)
			};
		}
		return null;
	}

	public async exec(message: Message, { data }: { data: Clan }) {
		const embed = new MessageEmbed()
			.setTitle(`${Util.escapeMarkdown(data.name)} (${data.tag})`)
			.setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(data.tag)}`)
			.setColor(this.client.embed(message))
			.setThumbnail(data.badgeUrls.medium);

		embed.setDescription([
			`${EMOJIS.CLAN} **${data.clanLevel}** ${EMOJIS.USERS} **${data.members}** ${EMOJIS.TROPHY} **${data.clanPoints}** ${EMOJIS.VERSUS_TROPHY} **${data.clanVersusPoints}**`,
			'',
			`${data.description}\n\n${data.labels.map(d => `${CLAN_LABELS[d.name]} ${d.name}`).join('\n')}`
		].join('\n'));

		const location = data.location
			? data.location.isCountry
				? `:flag_${data.location.countryCode.toLowerCase()}: ${data.location.name}`
				: `🌐 ${data.location.name}`
			: `${EMOJIS.WRONG} None`;

		const leader = data.memberList.filter(m => m.role === 'leader').map(m => m.name);
		const rankInfo = await this.clanRank(data.tag, data.clanPoints);
		const rank = rankInfo
			? rankInfo.gain > 0
				? `\n**Global Rank**\n📈 #${rankInfo.rank} ${EMOJIS.UP_KEY} +${rankInfo.gain}`
				: `\n**Global Rank**\n📈 #${rankInfo.rank} ${EMOJIS.DOWN_KEY} ${rankInfo.gain}`
			: '';

		embed.addField('\u200e', [
			'**Clan Leader**',
			`${EMOJIS.OWNER} ${leader.length ? `${Util.escapeMarkdown(leader.join(', '))}` : 'No Leader'}`,
			'**Location**',
			`${location}${rank}`,
			'**Requirements**',
			`⚙️ ${clanTypes[data.type]} ${EMOJIS.TROPHY} ${data.requiredTrophies} Required`,
			'\u200b\u2002'
		].join('\n'));

		const [action, season, wars] = await Promise.all([this.getActivity(data), this.getSeason(data), this.getWars(data.tag)]);
		const fields = [];
		if (action) {
			fields.push(...[
				'**Daily Average**',
				`${EMOJIS.ACTIVITY} ${action.avg_total.toFixed()} Activities`,
				`${EMOJIS.USER_BLUE} ${action.avg_online.toFixed()} Active Members`
			]);
		}
		if (season) {
			fields.push(...[
				'**Total Attacks**',
				`${EMOJIS.SWORD} ${season.attackWins} ${EMOJIS.SHIELD} ${season.defenseWins}`,
				'**Total Donations**',
				`${EMOJIS.TROOPS_DONATE} ${season.donations} ${EMOJIS.UP_KEY} ${season.donationsReceived} ${EMOJIS.DOWN_KEY}`
			]);
		}
		if (wars.length) {
			const won = wars.filter(war => war.result).length;
			const lost = wars.filter(war => !war.result).length;
			fields.push(...[
				'**Total Wars**',
				`${EMOJIS.CROSS_SWORD} ${wars.length} Wars ${EMOJIS.OK} ${won} Won ${EMOJIS.WRONG} ${lost} Lost`
			]);
		}
		if (fields.length) embed.addField(`**Season Stats (${Season.previousID})**`, [...fields, '\u200e'].join('\n'));

		embed.addField('**War and League**', [
			'**War Log**',
			`${data.isWarLogPublic ? '🔓 Public' : '🔒 Private'}`,
			'**War Performance**',
			`${EMOJIS.OK} ${data.warWins} Won ${data.isWarLogPublic ? `${EMOJIS.WRONG} ${data.warLosses!} Lost ${EMOJIS.EMPTY} ${data.warTies!} Tied` : ''}`,
			'**Win Streak**',
			`${'🏅'} ${data.warWinStreak}`,
			'**War Frequency**',
			data.warFrequency.toLowerCase() === 'morethanonceperweek'
				? '🎟️ More Than Once Per Week'
				: `🎟️ ${data.warFrequency.toLowerCase().replace(/\b(\w)/g, char => char.toUpperCase())}`,
			'**War League**',
			`${CWL_LEAGUES[data.warLeague?.name ?? ''] || EMOJIS.EMPTY} ${data.warLeague?.name ?? 'Unranked'}`
		].join('\n'));

		const customId = this.client.uuid(message.author.id);
		const button = new MessageButton()
			.setLabel('Clan Badge')
			.setStyle('SECONDARY')
			.setCustomId(customId);
		const msg = await message.util!.send({ embeds: [embed], components: [new MessageActionRow({ components: [button] })] });

		const interaction = await msg.awaitMessageComponent({
			filter: action => action.customId === customId && action.user.id === message.author.id,
			time: 5 * 60 * 1000
		}).catch(() => null);

		this.client.components.delete(customId);
		return interaction?.reply({
			embeds: [{
				color: this.client.embed(message),
				image: { url: data.badgeUrls.large },
				author: { name: `${data.name} (${data.tag})` }
			}]
		});
	}

	private async getActivity(clan: Clan): Promise<{ avg_total: number; avg_online: number } | null> {
		return this.client.db.collection(Collections.LAST_SEEN).aggregate([
			{
				$match: {
					'clan.tag': clan.tag,
					'tag': { $in: clan.memberList.map(m => m.tag) }
				}
			}, {
				$sort: {
					lastSeen: -1
				}
			}, {
				$limit: 50
			}, {
				$unwind: {
					path: '$entries'
				}
			}, {
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
			}, {
				$group: {
					_id: '$_id.date',
					online: {
						$sum: 1
					},
					total: {
						$sum: '$count'
					}
				}
			}, {
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
		]).next();
	}

	private async getSeason(clan: Clan) {
		return this.client.db.collection(Collections.CLAN_MEMBERS).aggregate([
			{
				$match: {
					clanTag: clan.tag,
					season: Season.previousID,
					tag: { $in: clan.memberList.map(m => m.tag) }
				}
			}, {
				$sort: {
					'donations.gained': -1
				}
			}, {
				$limit: 50
			}, {
				$group: {
					_id: null,
					donations: {
						$sum: '$donations.gained'
					},
					donationsReceived: {
						$sum: '$donationsReceived.gained'
					},
					attackWins: {
						$sum: '$attackWins'
					},
					defenseWins: {
						$sum: '$defenseWins'
					}
				}
			}
		]).next<{ donations: number; donationsReceived: number; attackWins: number; defenseWins: number }>();
	}

	private async getWars(tag: string): Promise<{ result: boolean; stars: number[] }[]> {
		return this.client.db.collection(Collections.CLAN_WARS).aggregate(
			[
				{
					$match: {
						$or: [
							{ 'clan.tag': tag },
							{ 'opponent.tag': tag }
						],
						state: 'warEnded',
						season: Season.previousID
					}
				}, {
					$project: {
						result: {
							$switch: {
								'branches': [
									{
										'case': { $gt: ['$clan.stars', '$opponent.stars'] },
										'then': true
									},
									{
										'case': { $gt: ['$clan.destructionPercentage', '$opponent.destructionPercentage'] },
										'then': true
									}
								],
								'default': false
							}
						}
					}
				}
			]
		).toArray();
	}
}
