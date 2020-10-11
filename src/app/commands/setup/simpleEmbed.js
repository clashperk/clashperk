const { Command, Flag } = require('discord-akairo');
const { emoji } = require('../../util/emojis');
const Resolver = require('../../struct/Resolver');

class ClanEmbedCommand extends Command {
	constructor() {
		super('setup-simple-clanembed', {
			category: 'hidden',
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

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setTitle(`${data.name} (${data.tag})`)
			.setURL(`https://link.clashofclans.com/?action=OpenClanProfile&tag=${encodeURIComponent(data.tag)}`)
			.setThumbnail(data.badgeUrls.medium)
			.setDescription(data.description || 'No description available.')
			.addField(`${emoji.owner} Leader`, `${data.memberList.filter(m => m.role === 'leader').map(m => `${m.name} (${m.tag})`)[0]}`)
			.addField(`${emoji.clan} War Info`, [
				`${data.warWins} wins, ${data.isWarLogPublic ? `${data.warLosses} losses, ${data.warTies} ties,` : ''} win streak ${data.warWinStreak}`
			])
			.setFooter(`Members [${data.members}/50]`, this.client.user.displayAvatarURL())
			.setTimestamp();
		return message.channel.send({ embed });
	}
}

module.exports = ClanEmbedCommand;
