const { Command } = require('discord-akairo');
const { firestore } = require('../../struct/Database');

class AddNoteCommand extends Command {
	constructor() {
		super('add-note', {
			aliases: ['add-note', 'note'],
			category: 'other',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			description: {
				content: 'Adds a short note for a player.',
				usage: '<#tag> <note>',
				examples: ['#9Q92C8R20 Hopper']
			},
			args: [
				{
					id: 'data',
					type: 'player',
					prompt: {
						start: 'what tag would you like to search for?',
						retry: (msg, { failure }) => failure.value
					}
				},
				{
					id: 'text',
					match: 'rest',
					prompt: {
						start: 'what would you like add?'
					}
				}
			]
		});
	}

	cooldown(message) {
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { data, text }) {
		if (text.length > 900) return message.util.send('note has limit of 1000 characters!');
		await firestore.collection('player_notes')
			.doc(`${message.guild.id}${data.tag}`)
			.update({
				guild: message.guild.id,
				user: message.author.id,
				tag: data.tag,
				note: text,
				createdAt: new Date()
			});

		return message.util.send(`Note created for **${data.name} (${data.tag})**`);
	}
}

module.exports = AddNoteCommand;
