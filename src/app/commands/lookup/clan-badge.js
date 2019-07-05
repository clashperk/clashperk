const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

class ClanBadgeCommand extends Command {
	constructor() {
		super('clan-badge', {
			aliases: ['clan-badge', 'badge'],
			category: 'lookup',
			description: {
				content: 'Clash of Clans clan badge lookup command.',
				usage: '<tag>',
				examples: ['#2Q98URCGY', '2Q98URCGY']
			},
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			args: [
				{
					id: 'data',
					type: 'clan',
					prompt: {
						start: 'what would you like to search for?',
						retry: (msg, { failure }) => failure.value
					}
				}
			]
		});
	}

	async exec(message, { data }) {
		const embed = new MessageEmbed()
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium, `https://link.clashofclans.com/?action=OpenClanProfile&tag=${data.tag}`)
			.setColor(0x5970c1)
			.setImage(data.badgeUrls.large);
		if (data.clanLevel >= 21) {
			embed.setDescription([
				'*Clash of Clans API does not provide actual image for level 21+ clans. #Blame_Supercell*'
			]);
		}
		return message.util.send({ embed });
	}
}

module.exports = ClanBadgeCommand;
