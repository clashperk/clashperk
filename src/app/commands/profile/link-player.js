const { Command } = require('discord-akairo');
const Profile = require('../../models/Profile');

class LinkPlayerCommand extends Command {
	constructor() {
		super('link-player', {
			aliases: ['link-profile', 'save-profile', 'link-player'],
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
		const profile = await Profile.findOne({
			where: {
				guild: member.guild.id,
				user: member.id
			}
		});

		if (profile) {
			await profile.update({ tag: data.tag, name: data.name });
			return message.util.send(`Successfully linked **${member.user.tag}** to *${data.name} (${data.tag})*`);
		}

		await Profile.create({
			guild: message.guild.id,
			user: member.id,
			tag: data.tag,
			name: data.name
		});

		return message.util.send(`Successfully linked **${member.user.tag}** to *${data.name} (${data.tag})*`);
	}
}

module.exports = LinkPlayerCommand;
