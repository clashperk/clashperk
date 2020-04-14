const { Command } = require('discord-akairo');
const moment = require('moment');
require('moment-duration-format');
const { MessageEmbed } = require('discord.js');
const os = require('os');
const { version } = require('../../../../package.json');
const { firestore } = require('../../struct/Database');

class StatsCommand extends Command {
	constructor() {
		super('stats', {
			aliases: ['stats', 'bot-info'],
			category: 'util',
			cooldown: 1000,
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Displays statistics about the bot.'
			}
		});
	}

	async exec(message) {
		const embed = new MessageEmbed().setTitle('Stats')
			.setColor(0x5970c1)
			.setAuthor(`${this.client.user.username}`, this.client.user.displayAvatarURL())
			.addField('Memory Usage', `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, true)
			.addField('Free Memory', [
				this.freemem() > 1024 ? `${(this.freemem() / 1024).toFixed(2)} GB` : `${Math.round(this.freemem())} MB`
			], true)
			.addField('Uptime', moment.duration(process.uptime() * 1000).format('D [days], H [hrs], m [mins], s [secs]', { trim: 'both mid' }), true)
			.addField('Servers', this.client.guilds.cache.size, true)
			.addField('Users', this.users, true)
			.addField('Channels', this.client.channels.cache.size, true)
			.addField('Clans in DB', await this.count(), true)
			.addField('Version', `v${version}`, true)
			.addField('Node.JS', process.version, true)
			.setFooter(`© ${new Date().getFullYear()} ${this.owner.tag}`, this.owner.displayAvatarURL());

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

	get owner() {
		return this.client.users.cache.get(this.client.ownerID);
	}

	get users() {
		return this.client.guilds.cache.reduce((prev, guild) => guild.memberCount + prev, 0);
	}

	freemem() {
		return os.freemem() / (1024 * 1024);
	}

	async count() {
		const clans = await firestore.collection('tracking_clans')
			.get()
			.then(snap => snap.size);
		return clans;
	}
}

module.exports = StatsCommand;
