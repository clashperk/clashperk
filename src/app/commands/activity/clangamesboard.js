const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const { mongodb } = require('../../struct/Database');
const { Op } = require('../../util/constants');
const Resolver = require('../../struct/Resolver');

class ClanGamesBoardCommand extends Command {
	constructor() {
		super('clangamesboard', {
			aliases: ['gameboard', 'cgboard', 'clangamesboard', 'clangameboard'],
			category: 'setup-hidden',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			clientPermissions: ['ADD_REACTIONS', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'],
			description: {
				content: 'Setup a live updating clan games board.',
				usage: '<clanTag> [channel/color]',
				examples: ['#8QU8J9LP', '#8QU8J9LP #clan-games #5970C1', '#8QU8J9LP #5970C1 #clan-games']
			}
		});
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
			},
			unordered: false
		};

		const channel = yield {
			type: 'textChannel',
			unordered: [1, 2],
			default: message => message.channel
		};

		const hexColor = yield {
			type: 'color',
			unordered: [1, 2],
			default: message => this.client.embed(message)
		};

		return { data, channel, hexColor };
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { data, channel, hexColor }) {
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

		const permissions = ['ADD_REACTIONS', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY', 'VIEW_CHANNEL'];
		if (!channel.permissionsFor(channel.guild.me).has(permissions, false)) {
			return message.util.send(`I\'m missing ${this.missingPermissions(channel, this.client.user, permissions)} to run that command.`);
		}

		const patron = this.client.patron.get(message.guild.id, 'guild', false);
		const id = await this.client.storage.register(message, {
			op: Op.CLAN_GAMES_LOG,
			guild: message.guild.id,
			channel: channel.id,
			patron: patron ? true : false,
			message: null,
			name: data.name,
			tag: data.tag,
			color: patron ? hexColor : this.client.embed(message)
		});

		await this.client.cacheHandler.add(id, {
			op: Op.CLAN_GAMES_LOG,
			tag: data.tag,
			guild: message.guild.id
		});

		const embed = new MessageEmbed()
			.setTitle(`${data.name}`)
			.setURL(`https://link.clashofclans.com/?action=OpenClanProfile&tag=${encodeURIComponent(data.tag)}`)
			.setThumbnail(data.badgeUrls.small)
			.setDescription([
				'**Wait Time**',
				`${this.client.patron.get(message.guild.id, 'guild', false) ? 15 : 30} min`,
				'',
				'**Color**',
				`\`#${hexColor.toString(16)}\``,
				'',
				'**Channel**',
				`${channel}`,
				'',
				'**Clan Games Board**',
				`[Enabled](${message.url})`
			])
			.setColor(hexColor);
		return message.util.send({ embed });
	}

	async clans(message) {
		const collection = await mongodb.db('clashperk')
			.collection('clanstores')
			.find({ guild: message.guild.id })
			.toArray();
		return collection;
	}

	missingPermissions(channel, user, permissions) {
		const missingPerms = channel.permissionsFor(user).missing(permissions)
			.map(str => {
				if (str === 'VIEW_CHANNEL') return '`Read Messages`';
				return `\`${str.replace(/_/g, ' ').toLowerCase().replace(/\b(\w)/g, char => char.toUpperCase())}\``;
			});

		return missingPerms.length > 1
			? `${missingPerms.slice(0, -1).join(', ')} and ${missingPerms.slice(-1)[0]}`
			: missingPerms[0];
	}
}

module.exports = ClanGamesBoardCommand;
