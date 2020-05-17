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
			},
			args: [
				{
					id: 'data',
					type: 'player',
					prompt: {
						start: 'What tag would you like to flag?',
						retry: (msg, { failure }) => failure.value
					}
				},
				{
					id: 'reason',
					match: 'rest',
					prompt: {
						start: 'What is the reason?'
					}
				}
			]
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
			embed.setDescription([
				data.map((x, i) => `${++i}. ${x.name} ${x.tag}`).join('\n')
			]);
		} else {
			embed.setDescription(`${message.guild.name} does not have any flags..`);
		}

		return message.util.send({ embed });
	}
}

module.exports = FlagsCommand;
