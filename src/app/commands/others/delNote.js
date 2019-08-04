const { Command } = require('discord-akairo');
const Notes = require('../../models/Notes');
const { firebaseApp } = require('../../struct/Database');

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

	async exec(message, { data }) {
		const object = await firebaseApp.database()
			.ref('profiles')
			.child(message.guild.id)
			.child(data.tag.replace(/#/g, '@'));
		const note = await object.once('value').then(snap => snap.val());
		if (!note) {
			return message.util.send(`Could not find any note for ${data.name} (${data.tag})`);
		}
		await object.remove();
		return message.util.send(`Note deleted for **${data.name} (${data.tag})**`);
	}
}

module.exports = DeleteNoteCommand;
