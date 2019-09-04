const { Command } = require('discord-akairo');
const { firestore } = require('../../struct/Database');

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

	cooldown(message) {
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { data, member }) {
		await firestore.collection('linked_players')
			.doc(member.id)
			.update({
				[message.guild.id]: {
					guild: message.guild.id,
					user: member.id,
					tag: data.tag,
					name: data.name,
					createdAt: new Date()
				}
			}, { merge: true });

		return message.util.send(`Successfully linked **${member.user.tag}** to *${data.name} (${data.tag})*`);
	}
}

module.exports = LinkPlayerCommand;
