const { Command, Flag } = require('discord-akairo');
const { MessageEmbed, Util } = require('discord.js');
const { emoji, CWLEmoji, clanLabelEmoji } = require('../../util/emojis');
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

	async clanRank(tag, clanPoints) {
		if (clanPoints >= 50000) {
			const clanRank = await this.client.coc.clanRanks('global').catch(() => null);
			if (!clanRank?.ok) return null;
			const clan = clanRank.items?.find(clan => clan?.tag === tag);
			if (!clan) return null;

			return {
				rank: clan.rank,
				gain: clan.previousRank - clan.rank
			};
		}
		return null;
	}

	async exec(message, { data }) {
		const embed = new MessageEmbed()
			.setTitle(`${Util.escapeMarkdown(data.name)} (${data.tag})`)
			.setURL(`https://link.clashofclans.com/?action=OpenClanProfile&tag=${encodeURIComponent(data.tag)}`)
			.setColor(this.client.embed(message))
			.setThumbnail(data.badgeUrls.medium);

		embed.setDescription([
			data?.description ?? 'No Description Available',
			'\u200b\u2002'
		]);

		const location = data.location
			? data.location.isCountry
				? `:flag_${data.location.countryCode.toLowerCase()}: ${data.location.name}`
				: `🌐 ${data.location.name}`
			: `${emoji.wrong} None`;

		const leader = data?.memberList?.find(m => m?.role === 'leader');

		const rankInfo = await this.clanRank(data.tag, data.clanPoints);

		const rank = rankInfo
			? rankInfo.gain > 0
				? `\n**Global Rank**\n📈 #${rankInfo.rank} ${emoji.donated} ${rankInfo.gain}`
				: `\n**Global Rank**\n📈 #${rankInfo.rank} ${emoji.donated} ${rankInfo.gain}`
			: '';

		embed.addField('**General**', [
			'**Clan Level**',
			`${emoji.clan} ${data.clanLevel}`,
			'**Members**',
			`${emoji.users_small} ${data.members}`,
			'**Clan Points**',
			`${emoji.trophy} ${data.clanPoints} ${emoji.versustrophy} ${data.clanVersusPoints}`,
			'**Leader**',
			`${emoji.owner} ${leader ? `${Util.escapeMarkdown(leader.name)}` : 'No Leader'}`,
			'**Location**',
			`${location}${rank}`,
			'\u200b\u2002'
		]);

		embed.addField('**Requirements**', [
			'**Trophies Required**',
			`${emoji.trophy} ${data.requiredTrophies}`,
			'**Clan Type**',
			`⚙️ ${clanTypes[data.type]}`,
			'**Clan Labels**',
			`${data?.labels?.length ? data.labels.map(d => `${clanLabelEmoji[d.name]} ${d.name}`).join('\n') : `${emoji.wrong} None`}`,
			'\u200b\u2002'
		]);

		embed.addField('**War and League**', [
			'**War Log**',
			`${data.isWarLogPublic ? '🔓 Public' : '🔒 Private'}`,
			'**War Performance**',
			`${emoji.ok} ${data.warWins} Won ${data.isWarLogPublic ? `${emoji.wrong} ${data?.warLosses} Lost ${emoji.empty} ${data?.warTies} Tied` : ''}`,
			'**Win Streak**',
			`${'🏅'} ${data.warWinStreak}`,
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
