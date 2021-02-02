const { version } = require('../../../../package.json'); // eslint-disable-line
import { MessageEmbed, TextChannel, Message } from 'discord.js';
import { Command } from 'discord-akairo';
import 'moment-duration-format';
import moment from 'moment';
import os from 'os';

export default class StatsCommand extends Command {
	public constructor() {
		super('stats', {
			aliases: ['stats', 'bot-info'],
			category: '_hidden',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Shows some statistics of the bot.'
			}
		});
	}

	public async exec(message: Message) {
		let [guilds, memory] = [0, 0];
		const values = await this.client.shard!.broadcastEval(
			`[
				this.guilds.cache.size,
				(process.memoryUsage().heapUsed / 1024 / 1024),
			]`
		);

		for (const value of values) {
			guilds += value[0];
			memory += value[1];
		}

		const owner = await this.client.users.fetch(this.client.ownerID as string, false);
		const grpc: any = await new Promise(resolve => this.client.rpc.stats({}, (err: any, res: any) => {
			if (res) resolve(JSON.parse(res?.data));
			else resolve({ heapUsed: 0 });
		}));

		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setTitle('Stats')
			.setAuthor(`${this.client.user!.username}`, this.client.user!.displayAvatarURL())
			.addField('Memory Usage', `${memory.toFixed(2)} MB`, true)
			.addField('RPC Usage', `${(grpc.heapUsed / 1024 / 1024).toFixed(2)} MB`, true)
			.addField('Uptime', moment.duration(process.uptime() * 1000).format('D[d], H[h], m[m], s[s]', { trim: 'both mid' }), true)
			.addField('Servers', guilds, true)
			.addField('Shard', `${message.guild!.shard.id}/${this.client.shard!.count}`, true)
			.addField('Version', `v${version as string}`, true)
			.setFooter(`© ${new Date().getFullYear()} ${owner.tag}`, owner.displayAvatarURL({ dynamic: true }));

		if (message.channel.type === 'dm' || !(message.channel as TextChannel).permissionsFor(message.guild!.me!)!.has(['ADD_REACTIONS', 'MANAGE_MESSAGES'], false)) {
			return message.util!.send({ embed });
		}
		const msg = await message.util!.send({ embed });
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

		return react.first()?.message.delete();
	}

	private get freemem() {
		return os.freemem() / (1024 * 1024);
	}
}
