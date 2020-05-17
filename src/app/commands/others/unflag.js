const { Command } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');

class UnflagCommand extends Command {
	constructor() {
		super('unflag', {
			aliases: ['unflag'],
			category: 'other',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			description: {
				content: 'Unflags a player from your server / clans.',
				usage: '<playerTag>',
				examples: ['#9Q92C8R20']
			},
			args: [
				{
					id: 'data',
					type: 'player',
					prompt: {
						start: 'What tag would you like unflag?',
						retry: (msg, { failure }) => failure.value
					}
				}
			]
		});
	}

	cooldown(message) {
		if (this.client.patron.isPatron(message.author, message.guild) || this.client.voteHandler.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { data }) {
		await mongodb.db('clashperk').collection('flaggedusers')
			.deleteOne({ guild: message.guild.id, tag: data.tag });

		return message.util.send(`Successfully unflagged **${data.name} (${data.tag})**`);
	}
}

module.exports = UnflagCommand;
