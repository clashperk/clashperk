const { Command } = require('discord-akairo');
const Profile = require('../../models/Profile');
const { firebaseApp } = require('../../struct/Database');

class LinkClanCommand extends Command {
	constructor() {
		super('link-clan', {
			aliases: ['link-clan', 'save-clan'],
			category: 'profile',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS'],
			description: {
				content: 'Saves a clan to your discord account.',
				usage: '<tag> [member]',
				examples: ['#9Q92C8R20', '#9Q92C8R20 Suvajit']
			},
			args: [
				{
					id: 'data',
					type: 'clan',
					prompt: {
						start: 'what would you like to search for?',
						retry: (msg, { failure }) => failure.value
					}
				},
				{
					id: 'member',
					type: 'member',
					default: message => message.member
				}
			]
		});
	}

	async exec(message, { data, member }) {
		await firebaseApp.database()
			.ref('profiles')
			.child(message.guild.id)
			.child(member.id)
			.update({
				guild: message.guild.id,
				user: member.id,
				clan_tag: data.tag,
				clan_name: data.name
			});

		return message.util.send(`Successfully linked **${member.user.tag}** to *${data.name} (${data.tag})*`);
	}
}

module.exports = LinkClanCommand;
