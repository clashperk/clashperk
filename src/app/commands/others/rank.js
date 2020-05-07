const { Command } = require('discord-akairo');

class RankCommand extends Command {
	constructor() {
		super('rank', {
			aliases: ['rank'],
			category: 'other',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Shows your rank ([vote](https://top.gg/bot/526971716711350273/vote) based).'
			},
			args: [
				{
					id: 'member',
					type: 'member',
					default: message => message.member
				}
			]
		});
	}

	cooldown(message) {
		if (this.client.patron.isPatron(message.author, message.guild) || this.client.voteHandler.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { member }) {
		if (member.user.bot) {
			const embed = this.client.util.embed()
				.setAuthor(member.user.tag, member.user.displayAvatarURL())
				.setColor(0x5970c1)
				.setTitle('🏷️ Bots aren\'t invited to Rank Party!');
			return message.util.send({ embed });
		}
		const data = await this.client.voteHandler.get(member.id);
		const embed = this.client.util.embed()
			.setAuthor(member.user.tag, member.user.displayAvatarURL())
			.setColor(0x5970c1)
			.setDescription(`[${data.left.join('')}](${message.url.replace(message.id, '')})${data.right.join('')} \`${data.progress} XP\``)
			.setTitle(`🏷️ Level ${data.level}`);
		return message.util.send({ embed });
	}
}

module.exports = RankCommand;
