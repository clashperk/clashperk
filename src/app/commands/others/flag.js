const { Command } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');

class FlagCommand extends Command {
	constructor() {
		super('flag', {
			aliases: ['flag'],
			category: 'other',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			description: {
				content: 'Flags a player in your server / clans.',
				usage: '<playerTag> <reason>',
				examples: ['#9Q92C8R20 Hopper']
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

	async exec(message, { data, reason }) {
		if (reason.length > 900) return message.util.send('It has a limit of 1000 characters!');
		await mongodb.db('clashperk').collection('flaggedusers')
			.findOneAndUpdate({ guild: message.guild.id, tag: data.tag }, {
				$set: {
					guild: message.guild.id,
					user: message.author.id,
					tag: data.tag,
					name: data.name,
					reason,
					createdAt: new Date()
				}
			}, { upsert: true });

		return message.util.send(`Successfully flagged **${data.name} (${data.tag})**`);
	}
}

module.exports = FlagCommand;
