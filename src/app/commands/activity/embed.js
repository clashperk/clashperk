const { Command, Flag } = require('discord-akairo');
const { emoji } = require('../../util/emojis');
const Resolver = require('../../struct/Resolver');

class ClanEmbedCommand extends Command {
	constructor() {
		super('simple-clanembed', {
			category: 'hidden',
			cooldown: 3000,
			clientPermissions: ['EMBED_LINKS'],
			userPermissions: ['MANAGE_GUILD'],
			description: {
				content: 'Creates a beautiful embed for a clan.',
				usage: '<clanTag>'
			}
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

		return { data };
	}

	async exec(message, { data }) {
		const embed = this.client.util.embed()
			.setColor(5861569)
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium)
			.setTitle('Open In-Game')
			.setURL(`https://link.clashofclans.com/?action=OpenClanProfile&tag=${data.tag}`)
			.setThumbnail(data.badgeUrls.medium)
			.setDescription(data.description)
			.addField(`${emoji.owner} Leader`, `${data.memberList.filter(m => m.role === 'leader').map(m => `${m.name} (${m.tag})`)[0]}`)
			.addField(`${emoji.clan} War Info`, [
				`${data.warWins} wins, ${data.isWarLogPublic ? `${data.warLosses} losses, ${data.warTies} ties,` : ''} win streak ${data.warWinStreak}`
			])
			.setFooter(`Members [${data.members}/50]`, this.client.user.displayAvatarURL());

		await message.channel.send({ embed });
		await this.delay(250);
		return message.channel.send([
			'Become a Patron to make this Embed Live!',
			'',
			'• Self-updaing Embed',
			'• Set custom description',
			'• Set accepted Town-Halls',
			'• Set custom clan Leader',
			'• Set custom embed color'
		]);
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}
}

module.exports = ClanEmbedCommand;
