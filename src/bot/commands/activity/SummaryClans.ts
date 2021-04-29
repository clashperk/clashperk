import { Collections, Season } from '@clashperk/node';
import { Message, MessageEmbed } from 'discord.js';
import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';
import { BLUE_NUMBERS } from '../../util/NumEmojis';

export default class ClanSummaryCommand extends Command {
	public constructor() {
		super('clan-summary', {
			category: 'search',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {},
			optionFlags: ['--season']
		});
	}

	public *args(msg: Message): unknown {
		const SEASON_IDS = Array(3).fill('').map((_, i) => {
			const now = new Date(Season.ID);
			now.setHours(0, 0, 0, 0);
			now.setMonth(now.getMonth() - i, 0);
			return Season.generateID(now);
		});

		const season = yield {
			flag: '--season',
			type: [
				Season.ID,
				...SEASON_IDS,
				[SEASON_IDS[0], 'last']
			],
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase'
		};

		return { season };
	}

	public async exec(message: Message, { season }: { season?: string }) {
		if (!season) season = Season.ID;
		const clans: { name: string; tag: string }[] = await this.client.db.collection(Collections.CLAN_STORES)
			.find({ guild: message.guild!.id })
			.toArray();

		if (!clans.length) {
			return message.util!.send(`**No clans are linked to ${message.guild!.name}**`);
		}

		const embeds = [];
		const OBJ: { [key: string]: { name: string; value: number; key: string }[] } = {
			DONATED: [],
			ATTACKS: [],
			AVG_ACTIVITY: [],
			ACTIVE_MEMBERS: [],
			WARS_WON: [],
			WARS_LOST: []
		};

		for (const clan of clans) {
			const wars = await this.getWars(clan.tag, season);
			const action = await this.getActivity(clan.tag);
			const season_stats = await this.getSeason(clan.tag, season);

			if (!action || !season_stats) continue;

			const won = wars.filter(war => war.result).length;
			const lost = wars.filter(war => !war.result).length;

			OBJ.WARS_WON.push({ name: clan.name, value: won, key: `${EMOJIS.CROSS_SWORD} Wars Won` });
			OBJ.WARS_LOST.push({ name: clan.name, value: lost, key: `${EMOJIS.EMPTY_SWORD} Wars Lost` });
			OBJ.DONATED.push({ name: clan.name, value: season_stats.donations, key: `${EMOJIS.TROOPS_DONATE} Troops Donated` });
			OBJ.ATTACKS.push({ name: clan.name, value: season_stats.attackWins, key: `${EMOJIS.SWORD} Attacks Won` });
			OBJ.AVG_ACTIVITY.push({ name: clan.name, value: Math.floor(action.avg_total), key: `${EMOJIS.ACTIVITY} Avg. Activity` });
			OBJ.ACTIVE_MEMBERS.push({ name: clan.name, value: Math.floor(action.avg_online), key: `${EMOJIS.USER_BLUE} Active Members` });
		}

		if (!OBJ.DONATED.length) return message.util!.send('**No data available at this moment!**');

		const interaction = message.hasOwnProperty('token');
		const fields = Object.values(OBJ);
		for (const field of Array(3).fill(0).map(() => fields.splice(0, 2))) {
			const embed = new MessageEmbed();
			for (const data of field) {
				data.sort((a, b) => b.value - a.value);
				const pad = data[0].value.toLocaleString().length + 1;

				embed.addField(data[0].key, [
					data.slice(0, 15)
						.map((en, i) => {
							const num = en.value.toLocaleString().padStart(pad, ' ');
							return `${BLUE_NUMBERS[++i]} \`\u200e${num} \u200f\` \u200e\`${en.name.padEnd(15, ' ')}\u200f\``;
						})
						.join('\n')
				], interaction);
			}

			embeds.push(embed);
		}

		if (!interaction) {
			const length = embeds.reduce((prev, curr) => curr.length + prev, 0);
			if (length > 6000) {
				return embeds.map(
					(embed, num) => message.channel.send(
						num === 0 ? `**Clan Summary (Season ${season!})**` : '', { embed }
					)
				);
			}
			return message.util!.send(`**Clan Summary (Season ${season})**`, {
				embed: { fields: embeds.map(embed => embed.fields).flat() }
			});
		}
		return message.util!.send(`**Clan Summary (Season ${season})**`, embeds);
	}

	private async getWars(tag: string, season: string): Promise<{ result: boolean; stars: number[] }[]> {
		return this.client.db.collection(Collections.CLAN_WARS).aggregate(
			[
				{
					$match: {
						'clan.tag': tag,
						'groupWar': false,
						'state': 'warEnded',
						'season': season
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
						},
						stars: '$clan.members.attacks.stars'
					}
				}
			]
		).toArray();
	}

	private async getActivity(tag: string): Promise<{ avg_total: number; avg_online: number } | null> {
		return this.client.db.collection(Collections.LAST_SEEN).aggregate([
			{
				$match: {
					'clan.tag': tag
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

	private async getSeason(tag: string, season: string) {
		return this.client.db.collection(Collections.CLAN_MEMBERS).aggregate([
			{
				$match: {
					season, clanTag: tag
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
		]).next() as Promise<{ donations: number; donationsReceived: number; attackWins: number; defenseWins: number } | null>;
	}
}
