const { Command } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');
const { redNum } = require('../../util/emojis');
const Excel = require('exceljs');

class FlagsCommand extends Command {
	constructor() {
		super('flags', {
			aliases: ['flags'],
			category: 'other',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			description: {
				content: 'Shows the list of all flagged players.',
				usage: '[page] [--download/-dl]',
				examples: ['', '2', '-dl', '2 --download']
			},
			args: [
				{
					id: 'page',
					type: 'integer',
					default: 1
				},
				{
					id: 'download',
					match: 'flag',
					flag: ['--download', '-dl']
				}
			]
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { page, download }) {
		const embed = this.client.util.embed()
			.setColor(this.client.embed(message));
		const data = await mongodb.db('clashperk')
			.collection('flaggedusers')
			.find({ guild: message.guild.id })
			.toArray();

		let buffer = null;
		if (data && data.length) {
			buffer = await this.excel(data);
			const paginated = this.paginate(data, page);
			let index = (paginated.page - 1) * 25;
			embed.setAuthor(message.guild.name, message.guild.iconURL())
				.setTitle('Flags')
				.setDescription([
					paginated.items.map(x => `${redNum[++index]} ${x.name} ${x.tag}`).join('\n')
				])
				.setFooter(`Page ${paginated.page}/${paginated.maxPage}`);
		} else {
			embed.setDescription(`${message.guild.name} does not have any flagged players. Why not add some?`);
		}

		return message.util.send({
			embed,
			files: buffer && download
				? [{ attachment: Buffer.from(buffer), name: `${message.guild.name.toLowerCase()}_flag_list.xlsx` }]
				: null
		});
	}

	paginate(items, page = 1, pageLength = 25) {
		const maxPage = Math.ceil(items.length / pageLength);
		if (page < 1) page = 1;
		if (page > maxPage) page = maxPage;
		const startIndex = (page - 1) * pageLength;

		return {
			items: items.length > pageLength ? items.slice(startIndex, startIndex + pageLength) : items,
			page, maxPage, pageLength
		};
	}

	async excel(members) {
		const workbook = new Excel.Workbook();
		workbook.creator = 'ClashPerk';
		workbook.lastModifiedBy = 'ClashPerk';
		workbook.created = new Date(2020, 1, 1);
		workbook.modified = new Date();
		workbook.lastPrinted = new Date();
		workbook.views = [
			{
				x: 0, y: 0, width: 10000, height: 20000,
				firstSheet: 0, activeTab: 1, visibility: 'visible'
			}
		];
		const sheet = workbook.addWorksheet('Flag List');
		sheet.columns = [
			{ header: 'NAME', key: 'name', width: 16 },
			{ header: 'TAG', key: 'tag', width: 16 },
			{ header: 'AUTHOR', key: 'author', width: 20 },
			{ header: 'DATE', key: 'date', width: 20 },
			{ header: 'REASON', key: 'reason', width: 40 }
		];
		sheet.getRow(1).font = { bold: true, size: 10 };
		sheet.addRows(members.map(m => [m.name, m.tag, m.user, new Date(m.createdAt).toUTCString(), m.reason]));

		return workbook.xlsx.writeBuffer();
	}
}

module.exports = FlagsCommand;
