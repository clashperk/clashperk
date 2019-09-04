const { Command } = require('discord-akairo');
const { firestore } = require('../../struct/Database');

class DeleteNoteCommand extends Command {
	constructor() {
		super('del-note', {
			aliases: ['del-note', 'delete-note'],
			category: 'other',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			description: {
				content: 'Deletes note for a player.',
				usage: '<tag>',
				examples: ['#9Q92C8R20']
			},
			args: [
				{
					id: 'data',
					type: 'player',
					prompt: {
						start: 'what tag would you like to search for?',
						retry: (msg, { failure }) => failure.value
					}
				}
			]
		});
	}

	cooldown(message) {
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { data }) {
		await firestore.collection('player_notes')
			.doc(`${message.guild.id}${data.tag}`)
			.delete();

		return message.util.send(`Note deleted for **${data.name} (${data.tag})**`);
	}
}

module.exports = DeleteNoteCommand;
