const { Command } = require('discord-akairo');
const Notes = require('../../models/Notes');

class AddNoteCommand extends Command {
	constructor() {
		super('add-note', {
			aliases: ['add-note', 'note'],
			category: 'beta',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
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
