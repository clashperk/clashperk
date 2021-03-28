import { Collections, Season } from '@clashperk/node';
import { Command } from 'discord-akairo';
import { Message } from 'discord.js';
import { EMOJIS } from '../../util/Emojis';
import { BLUE_NUMBERS, RED_NUMBERS } from '../../util/NumEmojis';

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
		const clans = await this.client.db.collection(Collections.CLAN_STORES)
			.find({ guild: message.guild!.id })
			.toArray();

		const collection = [];
		for (const clan of clans) {
			const wars = await this.getWars(clan.tag);
			const action = await this.activity(clan.tag);
			const won = wars.filter(war => war.result).length;
			const lost = wars.filter(war => !war.result).length;
			collection.push({ wars: wars.length, won, lost, total: action.total, name: clan.name as string });
		}

		const chunks = [
			`**Clan Summary ${Season.previousID}**`,
			`${EMOJIS.CROSS_SWORD} ${EMOJIS.OK} ${EMOJIS.WRONG} \`SCORE\`  ${'**Clan**'}`
		];
		collection.sort((a, b) => b.won - a.won).sort((a, b) => b.total - a.total);
		for (const { wars, won, lost, total, name } of collection) {
			chunks.push(`${BLUE_NUMBERS[wars]} ${BLUE_NUMBERS[won]} ${RED_NUMBERS[lost]} \`${total.toString().padStart(5, ' ')}\`  ${name}`);
		}

		return message.util!.send(chunks, { split: true });
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

	private async activity(tag: string): Promise<{ total: number; avg: number }> {
		return this.client.db.collection(Collections.LAST_SEEN).aggregate([
			{
				$match: { 'clan.tag': tag }
			},
			{
				$sort: { lastSeen: -1 }
			},
			{
				$limit: 50
			},
			{
				$project: {
					entries: {
						$filter: {
							input: '$entries',
							as: 'en',
							cond: {
								$gte: [
									'$$en.entry', new Date(Season.previousID)
								]
							}
						}
					}
				}
			},
			{
				$project: {
					count: {
						$sum: '$entries.count'
					}
				}
			},
			{
				$group: {
					_id: null,
					total: {
						$addToSet: '$count'
					}
				}
			},
			{
				$project: {
					avg: {
						$avg: '$total'
					},
					total: {
						$sum: '$total'
					}
				}
			}
		]).next();
	}
}
