const { Command } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');

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
		if (this.client.patron.isPatron(message.author, message.guild) || this.client.voteHandler.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message) {
		const embed = this.client.util.embed()
			.setColor(0x5970c1);
		const data = await mongodb.db('clashperk')
			.collection('flaggedusers')
			.find({ guild: message.guild.id })
			.toArray();

		if (data && data.length) {
			embed.addField('Flagged Players')
				.setDescription([
					data.map((x, i) => `**${(++i).toString().padStart(2, '0')}.** ${x.name} ${x.tag}`).join('\n')
				])
				.setFooter(`Total: ${data.length}`);
		} else {
			embed.setDescription(`${message.guild.name} does not have any flagged players.`);
		}

		return message.util.send({ embed });
	}
}

module.exports = FlagsCommand;
