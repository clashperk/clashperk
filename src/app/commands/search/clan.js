const { Command, Flag } = require('discord-akairo');
const { MessageEmbed, Util } = require('discord.js');
const { emoji, CWLEmoji } = require('../../util/emojis');
const Resolver = require('../../struct/Resolver');

class ClanCommand extends Command {
	constructor() {
		super('clan', {
			aliases: ['clan', 'myclan', 'c'],
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
					await message.channel.send({ embed: resolved.embed });
					return Flag.cancel();
				}
				return resolved;
			}
		};

		return { data };
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
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
			.setTitle(`${Util.escapeMarkdown(data.name)} (${data.tag})`)
			.setURL(`https://link.clashofclans.com/?action=OpenClanProfile&tag=${encodeURIComponent(data.tag)}`)
			.setColor(this.client.embed(message))
			.setThumbnail(data.badgeUrls.medium);
		if (data.description && data.description.length) {
			embed.setDescription(data.description);
		}
		embed.addField('Level', data.clanLevel)
			.addField('Members', data.members)
			.addField('Leader', `${emoji.owner} ${data.memberList.length ? data.memberList.find(m => m.role === 'leader').name : 'No Leader'}`)
			.addField('Required Trophies', `${emoji.trophy} ${data.requiredTrophies}`)
			.addField('Clan Type', clan_type)
			.addField('Clan Points', `${emoji.trophy} ${data.clanPoints} ${emoji.versustrophy} ${data.clanVersusPoints}`)
			.addField('War League', `${CWLEmoji[data.warLeague.name] || ''} ${data.warLeague.name}`)
			.addField('War Log', data.isWarLogPublic ? 'Public' : 'Private')
			.addField('War Wins', data.warWins)
			.addField('Win Streak', data.warWinStreak)
			.addField('War Frequency', [
				data.warFrequency.toLowerCase() === 'morethanonceperweek'
					? 'More Than Once Per Week'
					: data.warFrequency.toLowerCase().replace(/\b(\w)/g, char => char.toUpperCase())
			])
			.addField('Location', [
				data.location
					? data.location.isCountry
						? `:flag_${data.location.countryCode.toLowerCase()}: ${data.location.name}`
						: `:united_nations: ${data.location.name}`
					: 'None'
			]);

		return message.util.send({ embed });
	}
}

module.exports = ClanCommand;
