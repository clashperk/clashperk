import { MessageEmbed, Message, Snowflake, MessageButton, MessageActionRow } from 'discord.js';
import { version } from '../../../../package.json';
import { Collections } from '../../util/Constants';
import { Command } from 'discord-akairo';
import 'moment-duration-format';
import moment from 'moment';
import os from 'os';

export default class StatsCommand extends Command {
	public constructor() {
		super('stats', {
			aliases: ['stats', 'about'],
			category: 'none',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Shows some statistics of the bot.'
			},
			args: [
				{
					id: 'more',
					flag: 'max',
					match: 'flag'
				}
			]
		});
	}

	public async exec(message: Message, { more }: { more: boolean }) {
		let [guilds, memory] = [0, 0];
		const values = await this.client.shard?.broadcastEval(
			client => [client.guilds.cache.size, (process.memoryUsage().heapUsed / 1024 / 1024)]
		);

		for (const value of values ?? [[this.client.guilds.cache.size, process.memoryUsage().heapUsed / 1024 / 1024]]) {
			guilds += value[0];
			memory += value[1];
		}

		const owner = await this.client.users.fetch(this.client.ownerID as Snowflake);
		const grpc: any = await new Promise(resolve => this.client.rpc.stats({}, (err: any, res: any) => {
			if (res) resolve(JSON.parse(res?.data));
			else resolve({ heapUsed: 0 });
		}));

		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setTitle('Stats')
			.setAuthor(`${this.client.user!.username}`, this.client.user!.displayAvatarURL())
			.addField('Memory Usage', `${memory.toFixed(2)} MB`, true)
			.addField('RPC Usage', `${(grpc.heapUsed / 1024 / 1024).toFixed(2)} MB`, true);
		if (more && this.client.isOwner(message.author)) embed.addField('Free Memory', `${this.freemem.toFixed(2)} MB`, true);
		embed.addField('Uptime', moment.duration(process.uptime() * 1000).format('D[d], H[h], m[m], s[s]', { trim: 'both mid' }), true)
			.addField('Servers', guilds.toLocaleString(), true);
		if (more && this.client.isOwner(message.author)) {
			embed.addField('Clans Total', `${(await this.count(Collections.CLAN_STORES)).toLocaleString()}`, true)
				.addField('Players Total', `${(await this.count(Collections.LAST_SEEN)).toLocaleString()}`, true);
		}
		embed.addField('Shard', `${message.guild!.shard.id}/${this.client.shard!.count}`, true)
			.addField('Version', `v${version}`, true)
			.setFooter(`© ${new Date().getFullYear()} ${owner.tag}`, owner.displayAvatarURL({ dynamic: true }));

		const customId = this.client.uuid();
		const button = new MessageButton()
			.setEmoji('🗑️')
			.setCustomId(customId)
			.setStyle('SECONDARY');

		const msg = await message.util!.send({ embeds: [embed], components: [new MessageActionRow({ components: [button] })] });
		const interaction = await msg.awaitMessageComponent({
			filter: action => action.customId === customId && action.user.id === message.author.id,
			time: 5 * 60 * 1000
		}).catch(() => null);

		this.client.components.delete(customId);
		await interaction?.deferUpdate();
		await interaction?.deleteReply();
		if (message.deletable && interaction) await message.delete();
	}

	private get freemem() {
		return os.freemem() / (1024 * 1024);
	}

	private count(collection: string) {
		return this.client.db.collection(collection).find().count();
	}
}
