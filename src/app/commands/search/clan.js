const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const { emoji, CWLEmoji } = require('../../util/emojis');
const Resolver = require('../../struct/Resolver');

class ClanCommand extends Command {
	constructor() {
		super('clan', {
			aliases: ['clan', 'myclan'],
			category: 'search',
			description: {
				content: 'Shows some basic info about your clan.',
				usage: '<clanTag>',
				examples: ['#8QU8J9LP', '8QU8J9LP']
			},
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS']
		});
	}

	*args() {
		const data = yield {
			type: async (message, args) => {
				const resolved = await Resolver.resolve(message, args);
				if (resolved.status !== 200) {
					await message.util.send({ embed: resolved.embed });
					return Flag.cancel();
				}
				return resolved;
			}
		};

		return { data };
	}

	cooldown(message) {
		if (this.client.patron.isPatron(message.author, message.guild) || this.client.voteHandler.isVoter(message.author.id)) return 1000;
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
			.setTitle(`${data.name} (${data.tag})`)
			.setURL(`https://link.clashofclans.com/?action=OpenClanProfile&tag=${encodeURIComponent(data.tag)}`)
			.setColor(0x5970c1)
			.setThumbnail(data.badgeUrls.medium);
		if (data.description && data.description.length) {
			embed.setDescription(data.description);
		}
		embed.addField('Level', data.clanLevel, true)
			.addField('Members', data.members, true)
			.addField('Leader', `${emoji.owner} ${data.memberList.length ? data.memberList.find(m => m.role === 'leader').name : 'No Leader'}`, true)
			.addField('Required Trophies', `${emoji.trophy} ${data.requiredTrophies}`, true)
			.addField('Clan Type', clan_type, true)
			.addField('Clan Points', `${emoji.trophy} ${data.clanPoints} ${emoji.versustrophy} ${data.clanVersusPoints}`, true)
			.addField('War League', `${CWLEmoji[data.warLeague.name] || ''} ${data.warLeague.name}`, true)
			.addField('War Log', data.isWarLogPublic ? 'Public' : 'Private', true)
			.addField('War Wins', data.warWins, true)
			.addField('Win Streak', data.warWinStreak, true)
			.addField('War Frequency', [
				data.warFrequency.toLowerCase() === 'morethanonceperweek'
					? 'More Than Once Per Week'
					: data.warFrequency.toLowerCase().replace(/\b(\w)/g, char => char.toUpperCase())
			], true)
			.addField('Location', [
				data.location
					? data.location.isCountry
						? `:flag_${data.location.countryCode.toLowerCase()}: ${data.location.name}`
						: data.location.name
					: 'None'
			], true);

		return message.util.send({ embed });
	}
}

module.exports = ClanCommand;
