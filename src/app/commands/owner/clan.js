const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const { emoji } = require('../../util/emojis');
const Resolver = require('../../struct/Resolver');

class ClanCommand extends Command {
	constructor() {
		super('cla_n', {
			aliases: ['clan_'],
			category: 'lookup',
			description: {
				content: 'Clash of Clans clan lookup command.',
				usage: '<tag>',
				examples: ['#8QU8J9LP', '8QU8J9LP']
			},
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS']
		});
	}

	*args() {
		const data = yield {
			type: async (message, args) => {
				const resolved = await Resolver.resolve(message, args, 0);
				if (resolved.status !== 200) {
					await message.util.send(resolved.embed);
					return Flag.cancel();
				}
				return resolved;
			}
		};

		return { data };
	}

	cooldown(message) {
		if (this.client.patron.get(message.guild.id, 'guild', false) || this.client.patron.get(message.author.id, 'user', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
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
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium)
			.setTitle('Open In-Game')
			.setURL(`https://link.clashofclans.com/?action=OpenClanProfile&tag=${data.tag}`)
			.setColor(0x5970c1)
			.setThumbnail(data.badgeUrls.medium)
			.addField('Level', data.clanLevel, true)
			.addField('Members', data.members, true)
			.addField('Required Trophies', `${emoji.trophy} ${data.requiredTrophies}`, true)
			.addField('Clan Type', clan_type, true)
			.addField('Clan Points', `${emoji.trophy} ${data.clanPoints} ${emoji.versustrophy} ${data.clanVersusPoints}`, true)
			.addField('War League', data.warLeague.name, true)
			.addField('War Log', data.isWarLogPublic ? 'Public' : 'Private', true)
			.addField('War Wins', data.warWins, true)
			.addField('Win Streak', data.warWinStreak, true)
			.addField('War Frequency', data.warFrequency.toLowerCase().replace(/\b(\w)/g, char => char.toUpperCase()), true)
			.addField('Location', data.location ? data.location.name : 'None', true)
			.addField('Description', data.description ? data.description : '\u200b');

		return message.util.send({ embed });
	}
}

module.exports = ClanCommand;
