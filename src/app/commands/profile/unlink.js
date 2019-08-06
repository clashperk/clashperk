const { Command } = require('discord-akairo');
const Profile = require('../../models/Profile');

class UnlinkCommand extends Command {
	constructor() {
		super('unlink', {
			aliases: ['unlink'],
			category: 'profile',
			channel: 'guild',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'EMBED_LINKS'],
			description: {
				content: 'Unlinks your profile or clan.',
				usage: '<profile/clan>',
				examples: ['profile', 'clan']
			},
			args: [
				{
					id: 'type',
					type: ['profile', 'clan'],
					prompt: {
						start: 'what would you like to unlnk? (`profile` or `clan`)',
						retry: 'please provide a valid input (`profile` or `clan`).'
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

	async exec(message, { type, member }) {
		const profile = await Profile.destroy(message.guild.id, member.id, type);

		if (type === 'profile') {
			if (!profile || (profile && !profile.tag)) return message.util.reply(`couldn\'t find a player linked to ${member.user.tag}`);
		}

		if (type === 'clan') {
			if (!profile || (profile && !profile.clan_tag)) return message.util.reply(`couldn\'t find a clan linked to ${member.user.tag}`);
		}

		return message.util.reply(`successfully unlinked your ${type}`);
	}
}
module.exports = UnlinkCommand;
