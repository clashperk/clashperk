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

		console.log(clans);
		const embeds = [];
		const OBJ: { [key: string]: { name: string; value: number; key: string }[] } = {
			DONATED: [],
			ATTACKS: [],
			WARS_WON: [],
			WARS_LOST: [],
			AVG_ACTIVITY: [],
			ACTIVE_MEMBERS: []
		};

		for (const clan of clans) {
			const wars = await this.getWars(clan.tag);
			const action = await this.getActivity(clan.tag);
			const season = await this.getSeason(clan.tag);

			if (!wars.length || !action || !season) continue;

			const won = wars.filter(war => war.result).length;
			const lost = wars.filter(war => !war.result).length;

			OBJ.WARS_WON.push({ name: clan.name, value: won, key: `${EMOJIS.CROSS_SWORD} Wars Won` });
			OBJ.WARS_LOST.push({ name: clan.name, value: lost, key: `${EMOJIS.EMPTY_SWORD} Wars Lost` });
			OBJ.DONATED.push({ name: clan.name, value: season.donations, key: `${EMOJIS.TROOPS_DONATE} Troops Donated` });
			OBJ.ATTACKS.push({ name: clan.name, value: season.attackWins, key: `${EMOJIS.SWORD} Attacks Won` });
			OBJ.AVG_ACTIVITY.push({ name: clan.name, value: action.avg_total, key: `${EMOJIS.ACTIVITY} Avg. Activity` });
			OBJ.ACTIVE_MEMBERS.push({ name: clan.name, value: action.avg_online, key: `${EMOJIS.USER_BLUE} Active Members` });
		}

		const fields = Object.values(OBJ);
		for (const field of Array(3).fill(0).map(() => fields.splice(0, 2))) {
			const embed = new MessageEmbed();
			for (const data of field) {
				const pad = data[0].value.toFixed().length + 1;

				embed.addField(data[0].key, [
					data.sort((a, b) => b.value - a.value).slice(0, 15)
						.map(
							(en, i) => `${BLUE_NUMBERS[++i]} \`\u200e${en.value.toFixed().padStart(pad, ' ')} \u200f\` \u200e\`${en.name.padEnd(15, ' ')}\u200f\``
						)
						.join('\n')
				], message.hasOwnProperty('token'));
			}

			embeds.push(embed);
		}

		if (!embeds.length) return message.util!.send('**No data available at this moment!**');
		const author = { name: `${message.guild!.name}\'s Clan Summary` };
		if (!message.hasOwnProperty('token')) {
			const length = embeds.reduce((prev, curr) => curr.length + prev, 0);
			if (length > 6000) {
				return embeds.map(embed => message.channel.send({ embed }));
			}
			return message.util!.send({
				embed: { author, fields: embeds.map(embed => embed.fields).flat() }
			});
		}
		embeds[0].author = author;
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
