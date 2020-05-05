const { Command } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');
const { emoji } = require('../../util/emojis');
const { MODES } = require('../../util/constants');

class ClanEmbedCommand extends Command {
	constructor() {
		super('clanembed', {
			aliases: ['clanembed'],
			category: 'premium',
			cooldown: 3000,
			clientPermissions: ['EMBED_LINKS', 'MANAGE_NICKNAMES'],
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
			type: 'clan',
			prompt: {
				start: 'What is the clan tag?',
				retry: 'Please provide a valid ClanTag.'
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
			type: 'string',
			prompt: {
				start: 'What townhalls are accepted?'
			},
			default: '\u200b'
		};

		const description = yield {
			match: 'rest',
			prompt: {
				start: 'What would you like to set the description?'
			},
			default: '\u200b'
		};

		const color = yield {
			match: 'option',
			flag: ['--color'],
			type: 'color',
			default: 5861569
		};

		return { data, user, accepts, description, color };
	}

	async exec(message, { data, accepts, user, description, color }) {
		const clans = await this.clans(message);
		const max = this.client.patron.get(message.guild.id, 'limit', 2);
		if (clans.length >= max && !clans.map(clan => clan.tag).includes(data.tag)) {
			const embed = this.client.util.embed()
				.setDescription([
					'You can only claim 2 clans per guild!',
					'',
					'**Want more than that?**',
					'Consider subscribing to one of our premium plans on Patreon',
					'',
					'[Become a Patron](https://www.patreon.com/bePatron?u=14584309)'
				])
				.setColor(5861569);
			return message.util.send({ embed });
		}

		const isPatron = this.client.patron.get(message.guild.id, 'guild', false) || this.client.patron.get(message.author.id, 'user', false);
		const isVoter = this.client.voter.isVoter(message.author.id);
		if (clans.length >= 1 && !clans.map(clan => clan.tag).includes(data.tag) && !(isVoter || isPatron)) {
			const embed = this.client.util.embed()
				.setDescription([
					'**Not Voted!**',
					'',
					'Want to claim one more clan? Please consider voting us on Discord Bot List',
					'',
					'[Vote ClashPerk](https://top.gg/bot/526971716711350273/vote)'
				])
				.setColor(5861569);
			return message.util.send({ embed });
		}

		if (!clans.map(clan => clan.tag).includes(data.tag) && !data.description.toLowerCase().includes('cp')) {
			const embed = this.client.util.embed()
				.setAuthor(`${data.name} - Donation Log Setup`, data.badgeUrls.small)
				.setDescription([
					'**Clan Description**',
					`${data.description}`,
					'',
					'**Verify Your Clan**',
					'Add the word `CP` at the end of the clan description.',
					'You can remove it after verification.',
					'This is a security feature to ensure you have proper leadership of the clan.'
				]);
			return message.util.send({ embed });
		}

		const embed = this.client.util.embed()
			.setColor(color)
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium)
			.setTitle('Open In-Game')
			.setURL(`https://link.clashofclans.com/?action=OpenClanProfile&tag=${data.tag}`)
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

		const id = await this.client.storage.register({
			mode: MODES[4],
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
			mode: MODES[4],
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
