import { Season } from '../../util/Util';
import { Collections } from '../../util/Constants';
import { Command } from 'discord-akairo';
import Workbook from '../../struct/Excel';
import { Message } from 'discord.js';

export default class ExportClansCommand extends Command {
	public constructor() {
		super('export-clans', {
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

		const collection = [];
		for (const clan of clans) {
			const wars = await this.getWars(clan.tag);
			const action = await this.getActivity(clan.tag);
			const season = await this.getSeason(clan.tag);

			const won = wars.filter(war => war.result).length;
			const lost = wars.filter(war => !war.result).length;

			collection.push({
				won, lost, avg_online: action?.avg_online, avg_total: action?.avg_total,
				name: clan.name, attackWins: season?.attackWins, tag: clan.tag, wars: wars.length,
				donations: season?.donations, donationsReceived: season?.donationsReceived, defenseWins: season?.defenseWins
			});
		}

		const workbook = new Workbook();
		const sheet = workbook.addWorksheet('Clan Stats');
		sheet.columns = [
			{ header: 'Name', width: 16 },
			{ header: 'Tag', width: 16 },
			{ header: 'Wars', width: 10 },
			{ header: 'Won', width: 10 },
			{ header: 'Lost', width: 10 },
			{ header: 'Donations', width: 10 },
			{ header: 'Receives', width: 10 },
			{ header: 'Attacks', width: 10 },
			{ header: 'Defenses', width: 10 },
			{ header: 'Avg. Activity', width: 10 },
			{ header: 'Avg. Active Members', width: 16 }
		] as any; // TODO: Fix Later

		sheet.getRow(1).font = { bold: true, size: 10 };
		sheet.getRow(1).height = 40;

		for (let i = 1; i <= sheet.columns.length; i++) {
			sheet.getColumn(i).alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
		}

		sheet.addRows(
			collection.map(m => [
				m.name, m.tag, m.wars, m.won, m.lost, m.donations, m.donationsReceived,
				m.attackWins, m.defenseWins, Math.floor(m.avg_total ?? 0), Math.floor(m.avg_online ?? 0)
			])
		);

		const buffer = await workbook.xlsx.writeBuffer();
		return message.util!.send({
			files: [{
				attachment: Buffer.from(buffer),
				name: 'clan_stats.xlsx'
			}],
			content: `**Clan Stats (Season ${Season.previousID})**`
		});
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
