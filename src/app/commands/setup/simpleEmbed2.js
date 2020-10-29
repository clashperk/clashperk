const { Command, Flag } = require('discord-akairo');
const { emoji, CWLEmoji, BLUE_EMOJI, townHallEmoji } = require('../../util/emojis');
const Resolver = require('../../struct/Resolver');

class ClanEmbedCommand extends Command {
	constructor() {
		super('setup-simple-clanembed-2', {
			aliases: ['emb'],
			category: 'beta',
			clientPermissions: ['EMBED_LINKS'],
			userPermissions: ['MANAGE_GUILD'],
			description: {
				content: 'Creates a live promotional embed for a clan.',
				usage: '<clanTag>'
			}
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	*args() {
		const data = yield {
			type: async (message, args) => {
				if (!args) return null;
				const resolved = await Resolver.clan(args);
				if (resolved.status !== 200) {
					await message.channel.send({ embed: resolved.embed });
					return Flag.cancel();
				}
				return resolved;
			},
			prompt: {
				start: 'What is your clan tag?',
				retry: (msg, { failure }) => failure.value
			}
		};

		return { data };
	}

	async exec(message, { data }) {
		if (!this.client.patron.check(message.author, message.guild)) {
			const embed = this.client.util.embed()
				.setImage('https://i.imgur.com/QNeOD2n.png')
				.setDescription([
					'[Become a Patron](https://www.patreon.com/clashperk) to create Live auto updating Promotional Embed'
				]);
			return message.util.send({ embed });
		}

		const fetched = await Resolver.fetch(data);
		const reduced = fetched.reduce((count, member) => {
			const townHall = member.townHallLevel;
			count[townHall] = (count[townHall] || 0) + 1;
			return count;
		}, {});

		const townHalls = Object.entries(reduced)
			.map(arr => ({ level: arr[0], total: arr[1] }))
			.sort((a, b) => b.level - a.level);

		const location = data.location
			? data.location.isCountry
				? `:flag_${data.location.countryCode.toLowerCase()}: ${data.location.name}`
				: `🌐 ${data.location.name}`
			: `${emoji.wrong} None`;

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setTitle(`${data.name} (${data.tag})`)
			.setURL(`https://link.clashofclans.com/?action=OpenClanProfile&tag=${encodeURIComponent(data.tag)}`)
			.setThumbnail(data.badgeUrls.medium)
			.setDescription([
				`${emoji.clan} **${data.clanLevel}** ${emoji.users_small} **${data.members}** ${emoji.trophy} **${data.clanPoints}** ${emoji.versustrophy} **${data.clanVersusPoints}**`,
				'',
				data.description || ''
			])
			.addField('Clan Leader', [
				`${emoji.owner} ${data.memberList.filter(m => m.role === 'leader').map(m => `${m.name}`)[0] || 'None'}`
			])
			.addField('Requirements', [
				`${emoji.townhall} TH 10+`,
				`*Trophies Required**\n${emoji.trophy} ${data.requiredTrophies}`,
				'**Location**',
				`${location}`
			])
			.addField('War Performance', [
				`${emoji.ok} ${data.warWins} Won ${data.isWarLogPublic ? `${emoji.wrong} ${data?.warLosses} Lost ${emoji.empty} ${data?.warTies} Tied` : ''}`,
				'**War Frequency & Streak**',
				`${data.warFrequency.toLowerCase() === 'morethanonceperweek'
					? '🎟️ More Than Once Per Week'
					: `🎟️ ${data.warFrequency.toLowerCase().replace(/\b(\w)/g, char => char.toUpperCase())}`} ${'🏅'} ${data.warWinStreak}`,
				'**War League**', `${CWLEmoji[data.warLeague.name] || emoji.empty} ${data.warLeague.name}`
			])
			.addField('Town Halls', [
				townHalls.slice(0, 7).map(th => `${townHallEmoji[th.level]} ${BLUE_EMOJI[th.total]}`).join(' ')
			]);
		// .setFooter(`Members: ${data.members}`, this.client.user.displayAvatarURL()).setTimestamp();
		return message.channel.send({ embed });
	}
}

module.exports = ClanEmbedCommand;
