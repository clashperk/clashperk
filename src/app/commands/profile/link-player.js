const { Command } = require('discord-akairo');
const { firebaseApp } = require('../../struct/Database');

class LinkPlayerCommand extends Command {
	constructor() {
		super('link-player', {
			aliases: ['link-player', 'link-profile', 'save-profile'],
			category: 'profile',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS'],
			description: {
				content: 'Saves a player to your discord account.',
				usage: '<tag> [member]',
				examples: ['#9Q92C8R20', '#9Q92C8R20 Suvajit']
			},
			args: [
				{
					id: 'data',
					type: 'player',
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
				tag: data.tag,
				name: data.name,
				clan_tag: data.clan ? data.clan.tag : null,
				clan_name: data.clan ? data.clan.name : null
			});

		return message.util.send(`Successfully linked **${member.user.tag}** to *${data.name} (${data.tag})*`);
	}
}

module.exports = LinkPlayerCommand;
