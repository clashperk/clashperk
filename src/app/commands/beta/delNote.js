const { Command } = require('discord-akairo');
const Notes = require('../../models/Notes');

class DeleteNoteCommand extends Command {
	constructor() {
		super('del-note', {
			aliases: ['del-note', 'delete-note'],
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
				}
			]
		});
	}

	async exec(message, { data }) {
		const note = await Notes.findOne({ where: { guild: message.guild.id, tag: data.tag } });
		if (!note) {
			return message.util.send(`Could not find any note for ${data.name} (${data.tag})`);
		}
		await note.destroy();
		return message.util.send(`Note deleted for **${data.name} (${data.tag})**`);
	}
}

module.exports = DeleteNoteCommand;
