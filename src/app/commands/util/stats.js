const { Command } = require('discord-akairo');
const moment = require('moment');
require('moment-duration-format');
const { MessageEmbed } = require('discord.js');
const os = require('os');
const { version } = require('../../../../package.json');

class StatsCommand extends Command {
	constructor() {
		super('stats', {
			aliases: ['stats', 'bot-info'],
			category: 'util',
			cooldown: 1000,
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Shows some statistics of the bot.'
			}
		});
	}

	async exec(message) {
		let [guilds, users, channels, memory] = [0, 0, 0, 0];
		const values = await this.client.shard.broadcastEval(
			`[
				this.guilds.cache.size,
				this.guilds.cache.reduce((previous, current) => current.memberCount + previous, 0),
				this.channels.cache.size,
				(process.memoryUsage().heapUsed / 1024 / 1024),
			]`
		);

		for (const value of values) {
			guilds += value[0];
			users += value[1];
			channels += value[2];
			memory += value[3];
		}

		const owner = await this.client.users.fetch(this.client.ownerID, false);
		const embed = new MessageEmbed()
			.setColor(0x5970c1)
			.setTitle('Stats')
			.setAuthor(`${this.client.user.username}`, this.client.user.displayAvatarURL())
			.addField('Memory Usage', `${memory.toFixed(2)} MB`, true)
			.addField('Free Memory', [
				this.freemem > 1024 ? `${(this.freemem / 1024).toFixed(2)} GB` : `${Math.round(this.freemem)} MB`
			], true)
			.addField('Uptime', moment.duration(process.uptime() * 1000).format('D[d], H[h], m[m], s[s]', { trim: 'both mid' }), true)
			.addField('Servers', guilds, true)
			.addField('Version', `v${version}`, true)
			.addField('Node.js', process.version, true)
			.setFooter(`© ${new Date().getFullYear()} ${owner.tag}`, owner.displayAvatarURL());

		if (message.channel.type === 'dm' || !message.channel.permissionsFor(message.guild.me).has(['ADD_REACTIONS', 'MANAGE_MESSAGES'], false)) {
			return message.util.send({ embed });
		}
		const msg = await message.util.send({ embed });
		await msg.react('🗑');
		let react;
		try {
			react = await msg.awaitReactions(
				(reaction, user) => reaction.emoji.name === '🗑' && user.id === message.author.id,
				{ max: 1, time: 30000, errors: ['time'] }
			);
		} catch (error) {
			return msg.reactions.removeAll().catch(() => null);
		}
		if (!react || !react.size) return;
		return react.first().message.delete();
	}

	get freemem() {
		return os.freemem() / (1024 * 1024);
	}
}

module.exports = StatsCommand;
