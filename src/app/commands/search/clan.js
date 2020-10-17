const { Command, Flag } = require('discord-akairo');
const { MessageEmbed, Util } = require('discord.js');
const { emoji, CWLEmoji } = require('../../util/emojis');
const Resolver = require('../../struct/Resolver');

const clanTypes = {
	'inviteOnly': 'Invite Only',
	'closed': 'Closed',
	'open': 'Anybody Can Join'
};

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
		const embed = new MessageEmbed()
			.setTitle(`${Util.escapeMarkdown(data.name)} (${data.tag})`)
			.setURL(`https://link.clashofclans.com/?action=OpenClanProfile&tag=${encodeURIComponent(data.tag)}`)
			.setColor(this.client.embed(message))
			.setThumbnail(data.badgeUrls.medium);
		if (data?.description?.length) {
			embed.setDescription(data?.description);
		}

		const location = data.location
			? data.location.isCountry
				? `:flag_${data.location.countryCode.toLowerCase()}: ${data.location.name}`
				: `:united_nations: ${data.location.name}`
			: '🏳️‍🌈 None';

		embed.addField('**General**', [
			'**Level**',
			`${emoji.clan} ${data.clanLevel}`,
			'**Members**',
			`${emoji.users_small} ${data.members}`,
			'**Clan Points**',
			`${emoji.trophy} ${data.clanPoints} ${emoji.versustrophy} ${data.clanVersusPoints}`,
			'**Location**',
			`${location}`,
			'\u200b\u2002'
		]);

		embed.addField('**Requirements**', [
			'**Trophies Required**',
			`${emoji.trophy} ${data.requiredTrophies}`,
			'**Clan Type**',
			`⚙️ ${clanTypes[data.type]}`,
			'\u200b\u2002'
		]);

		embed.addField('**War and League**', [
			'**War Log**',
			`${data.isWarLogPublic ? '🔓 Public' : '🔒 Private'}`,
			'**War Wins**',
			`${emoji.ok} ${data.warWins}`,
			'**War Losses**',
			`${emoji.wrong} ${data?.warLosses ?? 'Unknown'}`,
			'**War Ties**',
			`${emoji.empty} ${data?.warTies ?? 'Unknown'}`,
			'**War Frequency**',
			data.warFrequency.toLowerCase() === 'morethanonceperweek'
				? '🎟️ More Than Once Per Week'
				: `🎟️ ${data.warFrequency.toLowerCase().replace(/\b(\w)/g, char => char.toUpperCase())}`,
			'**War League**',
			`${CWLEmoji[data.warLeague.name] || emoji.empty} ${data.warLeague.name}`
		]);

		return message.util.send({ embed });
	}
}

module.exports = ClanCommand;
