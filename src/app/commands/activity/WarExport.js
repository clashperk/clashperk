/* eslint-disable no-unused-vars */
const { Command, Flag } = require('discord-akairo');
const fetch = require('node-fetch');
// const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// const CWL = require('../../core/CWLWarTags');
const { Excel } = require('../../struct/ExcelHandler');
const Resolver = require('../../struct/Resolver');

class CWLExport extends Command {
	constructor() {
		super('war-export', {
			aliases: ['war-export'],
			category: 'activity',
			clientPermissions: ['ATTACH_FILES', 'EMBED_LINKS'],
			args: [
				{
					id: 'method',
					type: ['clans', 'all', 'members'],
					default: 'clans'
				}
			],
			description: {
				content: 'Export war stats to excel for all clans.',
				examples: ['']
			}
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	/* *args() {
		const data = yield {
			type: async (message, args) => {
				const resolved = await Resolver.resolve(message, args);
				if (resolved.status !== 200) {
					await message.channel.send({ embed: resolved.embed });
					return Flag.cancel();
				}
				return resolved;
			}
		};

		return { data };
	}*/

	async exec(message, { }) {
		const patron = this.client.patron.check(message.author, message.guild);
		if (!patron) {
			return message.channel.send({
				embed: {
					description: '[Become a Patron](https://www.patreon.com/clashperk) to export CWL data to Excel.'
				}
			});
		}

		const clans = await this.client.mongodb.collection('clanwarlogs').find({ guild: message.guild.id }).toArray();
		const chunks = [];

		for (const { tag } of clans) {
			const wars = await this.client.mongodb.collection('clanmembers')
				.find({
					$or: [
						{ 'clan.tag': tag },
						{ 'opponent.tag': tag }
					],
					state: { $in: ['inWar', 'warEnded'] }
				}).toArray();

			const members = {};
			for (const war of wars) {
				const clan = war.clan.tag === tag ? war.clan : war.opponent.clan;
				for (const m of clan.members) {
					const member = members[m.tag]
						? members[m.tag]
						: members[m.tag] = {
							name: m.name,
							tag: m.tag,
							of: 0,
							attacks: 0,
							stars: 0,
							dest: 0,
							defStars: 0,
							defDestruction: 0,
							starTypes: [],
							defCount: 0
						};
					member.of += 1;

					if (m.attacks) {
						member.attacks += 1;
						member.stars += m.attacks[0].stars;
						member.dest += m.attacks[0].destructionPercentage;
						member.starTypes.push(m.attacks[0].stars);
					}

					if (m.bestOpponentAttack) {
						member.defStars += m.bestOpponentAttack.stars;
						member.defDestruction += m.bestOpponentAttack.destructionPercentage;
						member.defCount += 1;
					}
				}

				chunks.push({ name: clan.name, members: Object.values(members) });
			}
		}

		if (!chunks.length) return message.util.send('No data available at this moment!');

		const workbook = Excel();
		for (const { name, members } of chunks) {
			const sheet = workbook.addWorksheet(name);
			sheet.columns = [
				{ header: 'Name', width: 16 },
				{ header: 'Tag', width: 16 },
				{ header: 'Total Attacks', width: 8 },
				{ header: 'Total Stars', width: 8 },
				{ header: 'Avg Stars', width: 8 },
				{ header: 'Total Dest', width: 8 },
				{ header: 'Avg Dest', width: 8 },
				{ header: 'Three Stars', width: 8 },
				{ header: 'Two Stars', width: 8 },
				{ header: 'One Stars', width: 8 },
				{ header: 'Zero Stars', width: 8 },
				{ header: 'Missed', width: 8 },
				{ header: 'Def Stars', width: 8 },
				{ header: 'Avg Def Stars', width: 8 },
				{ header: 'Total Def Dest', width: 8 },
				{ header: 'Avg Def Dest', width: 8 }
			];

			sheet.getRow(1).font = { bold: true, size: 10 };
			sheet.getRow(1).height = 40;

			for (let i = 1; i <= sheet.columns.length; i++) {
				sheet.getColumn(i).alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
			}

			sheet.addRows(members.filter(m => m.of > 0)
				.map(m => [
					m.name,
					m.tag,
					m.of,
					m.stars,
					(m.stars / m.of).toFixed(2),
					m.dest.toFixed(2),
					(m.dest / m.of).toFixed(2),
					this.starCount(m.starTypes, 3),
					this.starCount(m.starTypes, 2),
					this.starCount(m.starTypes, 1),
					this.starCount(m.starTypes, 0),
					m.of - m.attacks,
					m.defStars,
					(m.defStars / m.defCount).toFixed(),
					m.defDestruction.toFixed(2),
					(m.defDestruction / m.defCount).toFixed(2)
				]));
		}

		const buffer = await workbook.xlsx.writeBuffer();
		return message.util.send({
			files: [{
				attachment: Buffer.from(buffer),
				name: 'clan_war_stats.xlsx'
			}]
		});
	}

	starCount(stars = [], count) {
		return stars.filter(star => star === count).length;
	}
}

module.exports = CWLExport;
