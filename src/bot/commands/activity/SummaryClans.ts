import { Collections, Season } from '@clashperk/node';
import { Message, MessageEmbed } from 'discord.js';
import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';

export default class ClanSummaryCommand extends Command {
	public constructor() {
		super('clan-summary', {
			category: 'search',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {}
		});
	}

	public async exec(message: Message) {
		const clans: { name: string; tag: string }[] = await this.client.db.collection(Collections.CLAN_STORES)
			.find({ guild: message.guild!.id })
			.toArray();

		if (!clans.length) {
			return message.util!.send(`**No clans are linked to ${message.guild!.name}**`);
		}

		if (clans.length > 4) {
			return this.handler.runCommand(message, this.handler.modules.get('export-clans')!, {});
		}

		const embeds = [];
		for (const clan of clans) {
			const wars = await this.getWars(clan.tag);
			const action = await this.getActivity(clan.tag);
			const season = await this.getSeason(clan.tag);

			if (!wars.length || !action || !season) break;

			const won = wars.filter(war => war.result).length;
			const lost = wars.filter(war => !war.result).length;

			const embed = new MessageEmbed()
				.setAuthor(`${clan.name} (${clan.tag})`)
				.setDescription([
					'**Total Wars**',
					`${EMOJIS.CROSS_SWORD} ${wars.length} Wars ${EMOJIS.OK} ${won} Won ${EMOJIS.WRONG} ${lost} Lost`,
					'',
					'**Total Donation**',
					`${EMOJIS.TROOPS_DONATE} ${season.donations} ${EMOJIS.UP_KEY} ${season.donationsReceived} ${EMOJIS.DOWN_KEY}`,
					'',
					'**Total Attacks**',
					`${EMOJIS.SWORD} ${season.attackWins} ${EMOJIS.SHIELD} ${season.defenseWins}`,
					'',
					'**Avg. Activity**',
					`${EMOJIS.ACTIVITY} ${action.avg_total.toFixed()}`,
					'',
					'**Active Members**',
					`${EMOJIS.USER_BLUE} ${action.avg_online.toFixed()}`
				]);

			if (!message.hasOwnProperty('token')) {
				embed.setFooter(`Season ${Season.previousID}`);
			}

			embeds.push(embed);
		}
		if (!embeds.length) return message.util!.send('**No data available at this moment!**');

		if (!message.hasOwnProperty('token')) {
			return embeds.map(embed => message.channel.send({ embed }));
		}
		return message.util!.send(`**Clan Summary (Season ${Season.previousID})**`, embeds);
	}

	private async getWars(tag: string): Promise<{ result: boolean; stars: number[] }[]> {
		return this.client.db.collection(Collections.CLAN_WARS).aggregate(
			[
				{
					$match: {
						'clan.tag': tag,
						'groupWar': false,
						'state': 'warEnded',
						'season': Season.previousID
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

	private async getSeason(tag: string) {
		return this.client.db.collection(Collections.CLAN_MEMBERS).aggregate([
			{
				$match: {
					season: Season.previousID,
					clanTag: tag
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
