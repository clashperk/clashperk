const { Command, Argument, Flag } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');
const { emoji } = require('../../util/emojis');
const { Modes } = require('../../util/constants');
const Resolver = require('../../struct/Resolver');

class ClanEmbedCommand extends Command {
	constructor() {
		super('patron-clanembed', {
			category: 'hidden',
			clientPermissions: ['EMBED_LINKS'],
			userPermissions: ['MANAGE_GUILD'],
			description: {
				content: 'Setup a live updating clan embed.',
				usage: '<clanTag> [--color]'
			},
			optionFlags: ['--color']
		});
	}

	*args() {
		const data = yield {
			type: async (message, args) => {
				const resolved = await Resolver.clan(args);
				if (resolved.status !== 200) {
					if (resolved.status === 404) {
						return Flag.fail(resolved.embed.description);
					}
					await message.util.send({ embed: resolved.embed });
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
			type: 'member',
			prompt: {
				start: 'Who is the Leader of the clan?',
				retry: 'Please mention a valid member...'
			}
		};

		const accepts = yield {
			type: Argument.validate('string', (msg, txt) => txt.length <= 1024),
			prompt: {
				start: 'What townhalls are accepted?',
				retry: 'Embed field must be 1024 or fewer in length.',
				time: 1 * 60 * 1000
			},
			default: ' \u200b'
		};

		const description = yield {
			match: 'rest',
			type: Argument.validate('string', (msg, txt) => txt.length <= 1024),
			prompt: {
				start: 'What would you like to set the description?',
				retry: 'Embed description must be 1024 or fewer in length.',
				time: 1.5 * 60 * 1000
			},
			default: ' \u200b'
		};

		const color = yield {
			match: 'option',
			flag: ['--color'],
			type: 'color',
			default: message => this.client.embed(message)
		};

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

		const embed = this.client.util.embed()
			.setColor(color)
			.setTitle(`${data.name} (${data.tag})`)
			.setURL(`https://link.clashofclans.com/?action=OpenClanProfile&tag=${encodeURIComponent(data.tag)}`)
			.setThumbnail(data.badgeUrls.medium)
			.setDescription(description)
			.addField(`${emoji.owner} Leader`, `${user}`)
			.addField(`${emoji.townhall} Accepted Town-Hall`, accepts.split(',').map(x => x.trim()).join(', '))
			.addField(`${emoji.clan} War Info`, [
				`${data.warWins} wins, ${data.isWarLogPublic ? `${data.warLosses} losses, ${data.warTies} ties,` : ''} win streak ${data.warWinStreak}`
			])
			.setFooter(`Members [${data.members}/50]`, this.client.user.displayAvatarURL())
			.setTimestamp();

		const msg = await message.util.send({ embed });

		const id = await this.client.storage.register(message, {
			mode: Modes.CLAN_EMBED_LOG,
			guild: message.guild.id,
			channel: message.channel.id,
			tag: data.tag,
			color,
			name: data.name,
			patron: this.client.patron.get(message.guild.id, 'guild', false),
			message: msg.id,
			embed: { userId: user.id, accepts, description }
		});

		this.client.cacheHandler.add(id, {
			mode: Modes.CLAN_EMBED_LOG,
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
