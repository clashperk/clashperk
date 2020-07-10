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
				examples: ['']
			}
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message) {
		const embed = this.client.util.embed()
			.setColor(this.client.embed(message));
		const data = await mongodb.db('clashperk')
			.collection('flaggedusers')
			.find({ guild: message.guild.id })
			.toArray();

		if (data && data.length) {
			embed.setAuthor('Flagged Players')
				.setDescription([
					data.slice(0, 100)
						.map((x, i) => `${redNum[++i]} ${x.name} (${x.tag})`)
						.join('\n')
				]);
		} else {
			embed.setDescription(`${message.guild.name} does not have any flagged players. Why not add some?`);
		}

		return message.util.send({ embed });
	}
}

module.exports = FlagsCommand;
