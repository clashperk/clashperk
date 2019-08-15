const { Command } = require('discord-akairo');
const Profile = require('../../models/Profile');

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

	cooldown(message) {
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { data, member }) {
		const profile = await Profile.findOne({
			where: {
				guild: member.guild.id,
				user: member.id
			}
		});

		if (profile) {
			await profile.update({ clan_tag: data.tag, clan_name: data.name });
			return message.util.send(`Successfully linked **${member.user.tag}** to *${data.name} (${data.tag})*`);
		}

		await Profile.create({
			guild: message.guild.id,
			user: member.id,
			clan_tag: data.tag,
			clan_name: data.name
		});

		return message.util.send(`Successfully linked **${member.user.tag}** to *${data.name} (${data.tag})*`);
	}
}

module.exports = LinkClanCommand;
