import { CommandInteraction, EmbedBuilder } from 'discord.js';
import moment from 'moment';
import { Collections } from '../../util/Constants.js';
import { RED_NUMBERS } from '../../util/Emojis.js';
import { Args, Command } from '../../lib/index.js';
import Excel from '../../struct/Excel.js';

// TODO: Fix TS
export default class FlagListCommand extends Command {
	public constructor() {
		super('flag-list', {
			category: 'none',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			description: {
				content: ['Shows the list of all flagged players.']
			},
			defer: true
		});
	}

	public args(): Args {
		return {
			export: {
				match: 'BOOLEAN'
			}
		};
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { export?: boolean }) {
		const page = 1;
		const embed = new EmbedBuilder().setColor(this.client.embed(interaction));
		const data = await this.client.db.collection(Collections.FLAGS).find({ guild: interaction.guild.id }).toArray();

		let buffer = null;
		if (data.length) {
			if (args.export) buffer = await this.excel(data);
			const paginated = this.paginate(data, page);
			let index = (paginated.page - 1) * 25;
			embed
				.setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL()! })
				.setTitle('Flags')
				.setDescription(paginated.items.map((x) => `${RED_NUMBERS[++index]} ${x.name as string} ${x.tag as string}`).join('\n'))
				.setFooter({ text: `Page ${paginated.page}/${paginated.maxPage}` });
		} else {
			embed.setDescription(this.i18n('command.flag.list.no_flags', { lng: interaction.locale }));
		}

		return interaction.editReply({
			embeds: [embed],
			files:
				buffer && args.export
					? [{ attachment: Buffer.from(buffer), name: `${interaction.guild.name.toLowerCase()}_flag_list.xlsx` }]
					: undefined
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
		];

		sheet.getRow(1).font = { bold: true, size: 10 };
		sheet.addRows([
			...members.map((m) => ({
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
			page,
			maxPage,
			pageLength
		};
	}
}
