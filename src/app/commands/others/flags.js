const { Command } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');
const { redNum } = require('../../util/emojis');

class FlagsCommand extends Command {
	constructor() {
		super('flags', {
			aliases: ['flags'],
			category: 'other',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			description: {
				content: 'Shows the list of all flagged players.',
				usage: '[page]',
				examples: ['', '2']
			},
			args: [
				{
					id: 'page',
					type: 'integer',
					default: 1
				}
			]
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { page }) {
		const embed = this.client.util.embed()
			.setColor(this.client.embed(message));
		const data = await mongodb.db('clashperk')
			.collection('flaggedusers')
			.find({ guild: message.guild.id })
			.toArray();

		if (data && data.length) {
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

		return message.util.send({ embed });
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
