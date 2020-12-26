const { Command } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');
const { RED_EMOJI } = require('../../util/Emojis');
const Excel = require('../../struct/ExcelHandler');

class FlagsCommand extends Command {
	constructor() {
		super('flags', {
			aliases: ['flags'],
			category: 'flag',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			description: {
				content: [
					'Shows the list of all flagged players.',
					'',
					'**Flags**',
					'`--download` or `-dl` to export as excel.'
				],
				usage: '[page] [--download/-dl]',
				examples: ['', '2', '-dl', '--download']
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
			if (download) buffer = await Excel.flagList(data);
			const paginated = this.paginate(data, page);
			let index = (paginated.page - 1) * 25;
			embed.setAuthor(message.guild.name, message.guild.iconURL())
				.setTitle('Flags')
				.setDescription([
					paginated.items.map(x => `${RED_EMOJI[++index]} ${x.name} ${x.tag}`).join('\n')
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
}

module.exports = FlagsCommand;
