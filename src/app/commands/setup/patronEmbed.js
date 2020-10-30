const { Command, Argument, Flag } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');
const { emoji, CWLEmoji, townHallEmoji, BLUE_EMOJI } = require('../../util/emojis');
const { Op } = require('../../util/constants');
const Resolver = require('../../struct/Resolver');
const { Util } = require('discord.js');

class ClanEmbedCommand extends Command {
	constructor() {
		super('setup-patron-clanembed', {
			category: 'hidden',
			clientPermissions: ['EMBED_LINKS'],
			userPermissions: ['MANAGE_GUILD'],
			description: {
				content: 'Creates a live promotional embed for a clan.',
				usage: '<clanTag>'
			}
		});
	}

	*args() {
		const data = yield {
			type: async (message, args) => {
				if (!this.client.patron.get(message.guild.id, 'guild', false)) {
					const embed = this.client.util.embed()
						.setImage('https://i.imgur.com/QNeOD2n.png')
						.setDescription([
							'[Become a Patron](https://www.patreon.com/clashperk) to create Live auto updating Promotional Embed'
						]);
					await message.util.send({ embed });
					return Flag.cancel();
				}

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

		const user = yield {
			match: 'none',
			type: 'member',
			prompt: {
				start: 'Who is the leader of the clan? (mention clan leader)',
				retry: 'Please mention a valid member...'
			}
		};

		const accepts = yield {
			match: 'none',
			type: Argument.validate('string', (msg, txt) => txt.length <= 100),
			prompt: {
				start: 'What Town-Halls are accepted? (write anything)',
				retry: 'Embed field must be 100 or fewer in length.',
				time: 1 * 60 * 1000
			},
			default: ' \u200b'
		};

		const description = yield {
			match: 'none',
			type: Argument.validate('string', (msg, txt) => txt.length <= 300),
			prompt: {
				start: 'What would you like to set the description? (write anything)',
				retry: 'Embed description must be 300 or fewer in length.',
				time: 1.5 * 60 * 1000
			},
			default: ' \u200b'
		};

		const yesNo = yield {
			match: 'none',
			type: (msg, txt) => {
				if (!txt) return null;
				if (/^y(?:e(?:a|s)?)?$/i.test(txt)) return true;
				return false;
			},
			prompt: {
				start: 'Would you like to set a custom color of the embed? (yes/no)'
			}
		};

		const color = yield (
			// eslint-disable-next-line multiline-ternary
			yesNo ? {
				match: 'none',
				type: (msg, txt) => {
					if (!txt) return null;
					const resolver = this.handler.resolver.types.get('color');
					return resolver(msg, txt) || this.client.embed(msg);
				},
				prompt: {
					start: 'What is the hex code of the color? (e.g. #f96854)'
				}
			} : {
				match: 'none',
				default: m => this.client.embed(m)
			}
		);

		return { data, user, accepts, description, color };
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { data, accepts, user, description, color }) {
		const clans = await this.clans(message);
		const max = this.client.patron.get(message.guild.id, 'limit', 2);
		if (clans.length >= max && !clans.map(clan => clan.tag).includes(data.tag)) {
			const embed = Resolver.limitEmbed();
			return message.util.send({ embed });
		}

		const code = ['CP', message.guild.id.substr(-2)].join('');
		const clan = clans.find(clan => clan.tag === data.tag) || { verified: false };
		if (!clan.verified && !data.description.toUpperCase().includes(code)) {
			const embed = Resolver.verifyEmbed(data, code);
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
				description.toLowerCase() === 'auto'
					? data.description
					: description.toLowerCase() === 'none'
						? ''
						: Util.cleanContent(description, message) || ''
			])
			.addField('Clan Leader', [
				`${emoji.owner} ${data.memberList.filter(m => m.role === 'leader').map(m => `${m.name}`)[0] || 'None'} - ${user}`
			])
			.addField('Requirements', [
				`${emoji.townhall} ${accepts}`,
				'**Trophies Required**',
				`${emoji.trophy} ${data.requiredTrophies}`,
				`**Location** \n${location}`
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
			])
			.setFooter('Synced', this.client.user.displayAvatarURL())
			.setTimestamp();

		description = description.toLowerCase() === 'auto'
			? 'auto'
			: description.toLowerCase() === 'none'
				? ''
				: description;

		const msg = await message.util.send({ embed });
		const id = await this.client.storage.register(message, {
			op: Op.CLAN_EMBED_LOG,
			guild: message.guild.id,
			channel: message.channel.id,
			tag: data.tag,
			color,
			name: data.name,
			patron: message.guild.patron(),
			message: msg.id,
			embed: { userId: user.id, accepts, description: Util.cleanContent(description, message) }
		});

		this.client.cacheHandler.add(id, {
			op: Op.CLAN_EMBED_LOG,
			guild: message.guild.id,
			tag: data.tag
		});
	}

	async clans(message) {
		const collection = await mongodb.db('clashperk')
			.collection('clanstores')
			.find({ guild: message.guild.id })
			.toArray();
		return collection;
	}
}

module.exports = ClanEmbedCommand;
