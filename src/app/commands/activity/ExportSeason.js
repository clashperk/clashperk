const { Command } = require('discord-akairo');
const { Excel } = require('../../struct/ExcelHandler');

class WarExport extends Command {
	constructor() {
		super('export-season', {
			aliases: ['export-season'],
			category: 'activity_',
			clientPermissions: ['ATTACH_FILES', 'EMBED_LINKS'],
			description: {
				content: 'Export wars or missed attacks to excel for all clans.',
				usage: '<days|missed>',
				examples: ['20', 'missed']
			}
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message) {
		const clans = await this.client.mongodb.collection('clanstores')
			.find({ guild: message.guild.id })
			.toArray();

		const workbook = Excel();
		for (const { tag, name } of clans) {
			const clan = await this.client.coc.clan(tag).catch(() => null);
			if (!clan?.ok) continue;
			if (clan.members === 0) continue;

			const members = await this.client.mongodb.collection('clanmembers')
				.find({ tag: { $in: clan.memberList.map(m => m.tag) }, clanTag: clan.tag })
				.sort({ createdAt: -1 })
				.limit(1)
				.toArray();
			const sheet = workbook.addWorksheet(name);
			sheet.columns = [
				{ header: 'Name', width: 20 },
				{ header: 'Tag', width: 16 },
				{ header: 'Town Hall', width: 10 },
				{ header: 'Total Donated', width: 10 },
				{ header: 'Total Received', width: 10 },
				{ header: 'Total Attacks', width: 10 },
				{ header: 'Versus Attacks', width: 10 },
				{ header: 'Trophies Gained', width: 10 },
				{ header: 'Versus Trophies', width: 10 },
				{ header: 'WarStars Gained', width: 10 },
				{ header: 'CWL Stars Gained', width: 10 },
				{ header: 'Gold Grab', width: 10 },
				{ header: 'Elixir Escapade', width: 10 },
				{ header: 'Heroic Heist', width: 10 }
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
					m.townHallLevel,
					m.donations,
					m.donationsReceived,
					m.attackWins,
					m.versusBattleWins.gained,
					m.trophies.gained,
					m.versusTrophies.gained,
					m.warStars.gained,
					...['War League Legend', 'Gold Grab', 'Elixir Escapade', 'Heroic Heist', 'Games Champion']
						.map(ac => m.achievements.find(a => a.name === ac).gained)
				]));
		}

		const buffer = await workbook.xlsx.writeBuffer();
		return message.util.send('**Season Export**', {
			files: [{
				attachment: Buffer.from(buffer),
				name: 'season_export.xlsx'
			}]
		});
	}

	starCount(stars = [], count) {
		return stars.filter(star => star === count).length;
	}
}

module.exports = WarExport;
