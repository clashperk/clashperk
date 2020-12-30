import { RED_EMOJI } from '../../util/Emojis';
import { Command } from 'discord-akairo';
import Excel from '../../struct/Excel';
import { Message } from 'discord.js';
import moment from 'moment';

// TODO: Fix TS
export default class FlagsCommand extends Command {
	public constructor() {
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
					'id': 'page',
					'type': 'integer',
					'default': 1
				},
				{
					id: 'download',
					match: 'flag',
					flag: ['--download', '-dl']
				}
			]
		});
	}

	public async exec(message: Message, { page, download }: { page: number; download: boolean }) {
		const embed = this.client.util.embed()
			.setColor(this.client.embed(message));
		const data = await this.client.db.collection('flaggedusers')
			.find({ guild: message.guild!.id })
			.toArray();

		let buffer = null;
		if (data.length) {
			if (download) buffer = await this.excel(data);
			const paginated = this.paginate(data, page);
			let index = (paginated.page - 1) * 25;
			embed.setAuthor(message.guild!.name, message.guild!.iconURL()!)
				.setTitle('Flags')
				.setDescription([
					paginated.items.map(x => `${RED_EMOJI[++index]} ${x.name as string} ${x.tag as string}`).join('\n')
				])
				.setFooter(`Page ${paginated.page}/${paginated.maxPage}`);
		} else {
			embed.setDescription(`${message.guild!.name} does not have any flagged players. Why not add some?`);
		}

		return message.util!.send({
			embed,
			files: buffer && download
				? [{ attachment: Buffer.from(buffer), name: `${message.guild!.name.toLowerCase()}_flag_list.xlsx` }]
				: null
		});
	}

	private excel(members: any[]) {
		const workbook = new Excel();
		const sheet = workbook.addWorksheet('Flag List');

		sheet.columns = [
			{ header: 'NAME', key: 'name', width: 16 },
			{ header: 'TAG', key: 'tag', width: 16 },
			{ header: 'AUTHOR', key: 'author', width: 20 },
			{ header: 'DATE (UTC)', key: 'date', width: 30 },
			{ header: 'REASON', key: 'reason', width: 50 }
		] as any;

		sheet.getRow(1).font = { bold: true, size: 10 };
		sheet.addRows([
			...members.map(m => ({
				name: m.name,
				tag: m.tag,
				author: m.user_tag,
				date: moment(new Date(m.createdAt)).format('DD MMMM YYYY kk:mm:ss'),
				reason: m.reason
			}))
		]);

		return workbook.xlsx.writeBuffer();
	}

	private paginate(items: any[], page = 1, pageLength = 25) {
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
