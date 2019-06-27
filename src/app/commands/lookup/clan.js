const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');

class ClanCommand extends Command {
	constructor() {
		super('clan', {
			aliases: ['clan'],
			category: 'lookup',
			description: {
				content: 'Clash of Clans clan lookup command.',
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
		let clan_type = '';
		if (data.type === 'inviteOnly') {
			clan_type = 'Invite Only';
		} else if (data.type === 'closed') {
			clan_type = 'Closed';
		} else if (data.type === 'open') {
			clan_type = 'Anybody Can Join';
		}

		const embed = new MessageEmbed()
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium, `https://link.clashofclans.com/?action=OpenClanProfile&tag=${data.tag}`)
			.setColor(0x5970c1)
			.setThumbnail(data.badgeUrls.medium)
			.addField('Level', data.clanLevel, true)
			.addField('Members', data.members, true)
			.addField('Required Trophies', `<:trophyc:534753357399588874> ${data.requiredTrophies}`, true)
			.addField('Clan Type', clan_type, true)
			.addField('Clan Points', `<:trophyc:534753357399588874> ${data.clanPoints} <:versustrophies:549844310858661888> ${data.clanVersusPoints}`, true)
			.addField('War Log', data.isWarLogPublic ? 'Public' : 'Private', true)
			.addField('War Wins', data.warWins, true)
			.addField('Win Streak', data.warWinStreak, true)
			.addField('War Frequency', data.warFrequency, true)
			.addField('Location', data.location ? data.location.name : 'None', true)
			.addField('Description', data.description ? data.description : '\u200b');

		return message.util.send({ embed });
	}
}

module.exports = ClanCommand;
