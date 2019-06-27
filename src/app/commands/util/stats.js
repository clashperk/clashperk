const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const moment = require('moment');
require('moment-duration-format');
const { version } = require('../../../../package.json');

class StatsCommand extends Command {
	constructor() {
		super('stats', {
			aliases: ['stats', 'bot-info'],
			category: 'util',
			clientPermissions: ['EMBED_LINKS'],
			description: { content: 'Displays statistics about the bot.' }
		});
	}

	async fetchInvite() {
		if (this.invite) return this.invite;
		const invite = await this.client.generateInvite([
			'CREATE_INSTANT_INVITE',
			'ADD_REACTIONS',
			'VIEW_CHANNEL',
			'SEND_MESSAGES',
			'EMBED_LINKS',
			'ATTACH_FILES',
			'READ_MESSAGE_HISTORY',
			'USE_EXTERNAL_EMOJIS'
		]);

		this.invite = invite;
		return invite;
	}

	async exec(message) {
		const embed = new MessageEmbed().setColor(0x5970c1)
			.setAuthor('Statistics', this.client.user.displayAvatarURL())
			.addField('Memory Usage', `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, true)
			.addField('Uptime', moment.duration(this.client.uptime).format('D [days], H [hrs], m [mins], s [secs]'), true)
			.addField('Servers', this.client.guilds.size, true)
			.addField('Channels', this.client.channels.size, true)
			.addField('Users', this.client.guilds.reduce((prev, guild) => guild.memberCount + prev, 0), true)
			.addField('Version', version, true)
			.addField('Invite Link', `[Invite](${await this.fetchInvite()})`, true)
			.setFooter(`© 2018 - 2019 ${this.client.users.get(this.client.ownerID).tag}`, this.client.users.get(this.client.ownerID).displayAvatarURL());

		return message.util.send({ embed });
	}
}

module.exports = StatsCommand;
