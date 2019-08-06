const { Command } = require('discord-akairo');
const Notes = require('../../models/Notes');

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
					id: 'note',
					match: 'rest',
					prompt: {
						start: 'what would you like add?'
					}
				}
			]
		});
	}

	async exec(message, { data, note }) {
		if (note.length > 900) return message.util.send('note has limit of 1000 characters!');
		await Notes.create(message.guild.id, message.author.id, data.tag, note);
		return message.util.send(`Note created for **${data.name} (${data.tag})**`);
	}
}

module.exports = AddNoteCommand;
