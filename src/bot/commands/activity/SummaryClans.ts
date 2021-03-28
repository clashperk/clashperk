import { Collections, Season } from '@clashperk/node';
import { Message, MessageEmbed } from 'discord.js';
// import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';

export default class ClanSummaryCommand extends Command {
	public constructor() {
		super('clan-summary', {
			category: 'search',
			channel: 'guild',
			ownerOnly: true,
			clientPermissions: ['EMBED_LINKS'],
			description: {}
		});
	}

	public async exec(message: Message) {
		const clans: { name: string; tag: string }[] = await this.client.db.collection(Collections.CLAN_STORES)
			.find({ guild: message.guild!.id })
			.limit(10)
			.toArray();

		const embed = new MessageEmbed()
			.setDescription(`**Clan Summary ${Season.previousID}**`);

		const collection = [];
		for (const clan of clans) {
			const wars = await this.getWars(clan.tag);
			const action = await this.activity(clan.tag);
			const member = await this.getMember(clan.tag);

			const won = wars.filter(war => war.result).length;
			const lost = wars.filter(war => !war.result).length;

			collection.push({ won, lost, avg_online: action.avg_online, avg_total: action.avg_total, name: clan.name, attackWins: member.attackWins });
		}

		return message.util!.send({ embed });
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

	private async activity(tag: string): Promise<{ avg_total: number; avg_online: number }> {
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

	private async getMember(tag: string) {
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
		]).next() as Promise<{ donations: number; donationsReceived: number; attackWins: number; defenseWins: number }>;
	}
}
