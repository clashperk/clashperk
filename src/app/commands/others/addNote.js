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

	cooldown(message) {
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { data, note }) {
		if (note.length > 900) return message.util.send('note has limit of 1000 characters!');
		const previous = await Notes.findOne({ where: { guild: message.guild.id, tag: data.tag } });
		if (previous) {
			await previous.update({ user: message.author.id, tag: data.tag });
			return message.util.send(`Note updated for ${data.name} (${data.tag})`);
		}
		await Notes.create({
			guild: message.guild.id,
			user: message.author.id,
			tag: data.tag,
			note
		});
		return message.util.send(`Note created for **${data.name} (${data.tag})**`);
	}
}

module.exports = AddNoteCommand;
