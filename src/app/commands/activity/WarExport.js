const { Command, Argument } = require('discord-akairo');
const { Excel } = require('../../struct/ExcelHandler');

class WarExport extends Command {
	constructor() {
		super('export-wars', {
			aliases: ['export'],
			category: 'activity',
			clientPermissions: ['ATTACH_FILES', 'EMBED_LINKS'],
			description: {
				content: 'Export wars or missed attacks to excel for all clans.',
				usage: '<days|missed>',
				examples: ['20', 'missed']
			}
		});
	}

	*args() {
		const limit = yield {
			type: Argument.range('integer', 1, 30),
			default: 30
		};

		return { limit };
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { limit }) {
		const clans = await this.client.mongodb.collection('clanwarlogs')
			.find({ guild: message.guild.id })
			.toArray();

		const chunks = [];
		for (const { tag, name } of clans) {
			const wars = await this.client.mongodb.collection('clanwarstores')
				.find({
					// $not: { isFreindly: true },
					$or: [{ 'clan.tag': tag }, { 'opponent.tag': tag }],
					state: { $in: ['inWar', 'warEnded'] }
				})
				.sort({ preparationStartTime: -1 })
				.limit(message.guild.patron() ? 0 : limit)
				.toArray();

			const members = {};
			for (const war of wars) {
				const clan = war.clan.tag === tag ? war.clan : war.opponent;
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
					member.of += war.groupWar ? 1 : 2;

					if (m.attacks) {
						member.attacks += m.attacks.length;
						member.stars += m.attacks.reduce((prev, atk) => prev + atk.stars, 0);
						member.dest += m.attacks.reduce((prev, atk) => prev + atk.destructionPercentage, 0);
						member.starTypes.push(...m.attacks.map(atk => atk.stars));
					}

					if (m.bestOpponentAttack) {
						member.defStars += m.bestOpponentAttack.stars;
						member.defDestruction += m.bestOpponentAttack.destructionPercentage;
						member.defCount += 1;
					}
				}
			}

			chunks.push({
				name,
				members: Object.values(members)
					.sort((a, b) => b.dest - a.dest)
					.sort((a, b) => b.stars - a.stars)
			});
		}

		if (!chunks.length) return message.util.send('No data available at this moment!');

		const workbook = Excel();
		for (const { name, members } of chunks) {
			const sheet = workbook.addWorksheet(name);
			sheet.columns = [
				{ header: 'Name', width: 20 },
				{ header: 'Tag', width: 16 },
				{ header: 'Total Attacks', width: 10 },
				{ header: 'Total Stars', width: 10 },
				{ header: 'Avg Stars', width: 10 },
				{ header: 'Total Dest', width: 10 },
				{ header: 'Avg Dest', width: 10 },
				{ header: 'Three Stars', width: 10 },
				{ header: 'Two Stars', width: 10 },
				{ header: 'One Stars', width: 10 },
				{ header: 'Zero Stars', width: 10 },
				{ header: 'Missed', width: 10 },
				{ header: 'Def Stars', width: 10 },
				{ header: 'Avg Def Stars', width: 10 },
				{ header: 'Total Def Dest', width: 10 },
				{ header: 'Avg Def Dest', width: 10 }
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
					(m.stars / m.of || 0).toFixed(2),
					m.dest.toFixed(2),
					(m.dest / m.of || 0).toFixed(2),
					this.starCount(m.starTypes, 3),
					this.starCount(m.starTypes, 2),
					this.starCount(m.starTypes, 1),
					this.starCount(m.starTypes, 0),
					m.of - m.attacks,
					m.defStars,
					(m.defStars / m.defCount || 0).toFixed(),
					m.defDestruction.toFixed(2),
					(m.defDestruction / m.defCount || 0).toFixed(2)
				]));
		}

		const buffer = await workbook.xlsx.writeBuffer();
		return message.util.send(`**War Export ${!message.guild.patron() ? `(${limit} day${limit === 1 ? '' : 's'})` : ''}**`, {
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

module.exports = WarExport;
