const { Command } = require('discord-akairo');
const moment = require('moment');
require('moment-duration-format');
const { MessageEmbed } = require('discord.js');
const os = require('os-utils');
const { version } = require('../../../../package.json');
const Clans = require('../../model/Clans');

class StatsCommand extends Command {
	constructor() {
		super('stats', {
			aliases: ['stats', 'bot-info'],
			category: 'util',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Displays statistics about the bot.'
			}
		});
	}

	async exec(message) {
		const clans = await Clans.findAll();
		const embed = new MessageEmbed()
			.setColor(0x5970c1)
			.setAuthor(`${this.client.user.username} Statistics`, this.client.user.displayAvatarURL())
			.addField('Memory Usage', `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, true)
			.addField('Free Memory', `${Math.round(os.freemem())} MB`, true)
			.addField('Uptime', moment.duration(this.client.uptime).format('D [days], H [hrs], m [mins], s [secs]'), true)
			.addField('Servers', this.client.guilds.size, true)
			.addField('Users', this.client.guilds.reduce((prev, guild) => guild.memberCount + prev, 0), true)
			.addField('Channels', this.client.channels.filter(c => c.type === 'text').size, true)
			.addField('Clans in DB', clans.length, true)
			.addField('Version', `v${version}`, true)
			.addField('Node.Js', process.version, true)
			.setFooter(`© 2019 ${this.client.users.get(this.client.ownerID).tag}`, this.client.users.get(this.client.ownerID).displayAvatarURL());

		if (message.channel.type === 'dm' || !message.channel.permissionsFor(message.guild.me).has(['ADD_REACTIONS', 'MANAGE_MESSAGES'], false)) {
			return message.util.send({ embed });
		}
		const msg = await message.util.send({ embed });
		msg.react('🗑');
		let react;
		try {
			react = await msg.awaitReactions(
				(reaction, user) => reaction.emoji.name === '🗑' && user.id === message.author.id,
				{ max: 1, time: 30000, errors: ['time'] }
			);
		} catch (error) {
			msg.reactions.removeAll();
			return message;
		}
		react.first().message.delete();
		return message;
	}
}

module.exports = StatsCommand;
