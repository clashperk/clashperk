import os from 'os';
import moment from 'moment';
import { MessageEmbed, CommandInteraction, Message, Guild } from 'discord.js';
// import { version } from '../../../../package.json';
import { Collections } from '../../util/Constants.js';
import { Command } from '../../lib/index.js';
import 'moment-duration-format';

export default class StatusCommand extends Command {
	public constructor() {
		super('status', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Shows some statistics of the bot.'
			},
			defer: true,
			ephemeral: true
		});
	}

	public async run(message: Message) {
		const embed = await this.get(message.guild!);
		return message.channel.send({ embeds: [embed] });
	}

	public async exec(interaction: CommandInteraction) {
		const embed = await this.get(interaction.guild!);
		return interaction.editReply({ embeds: [embed] });
	}

	public async get(guild: Guild) {
		let [guilds, memory] = [0, 0];
		const values = await this.client.shard?.broadcastEval((client) => [
			client.guilds.cache.size,
			process.memoryUsage().heapUsed / 1024 / 1024
		]);

		for (const value of values ?? [[this.client.guilds.cache.size, process.memoryUsage().heapUsed / 1024 / 1024]]) {
			guilds += value[0];
			memory += value[1];
		}

		const owner = await this.client.users.fetch(this.client.ownerId);
		const embed = new MessageEmbed()
			.setColor(this.client.embed(guild.id))
			.setTitle('Stats')
			.setAuthor({ name: `${this.client.user!.username}`, iconURL: this.client.user!.displayAvatarURL({ format: 'png' }) })
			.addField('Memory Usage', `${memory.toFixed(2)} MB`, true)
			.addField('Free Memory', `${this.freemem.toFixed(2)} MB`, true)
			.addField('Uptime', moment.duration(process.uptime() * 1000).format('D[d], H[h], m[m], s[s]', { trim: 'both mid' }), true)
			.addField('Servers', guilds.toLocaleString(), true)
			.addField('Clans Total', `${(await this.count(Collections.CLAN_STORES)).toLocaleString()}`, true)
			.addField('Players Total', `${(await this.count(Collections.LAST_SEEN)).toLocaleString()}`, true)
			.addField('Shard', `${guild.shard.id}/${this.client.shard!.count}`, true)
			.setFooter({ text: `© ${new Date().getFullYear()} ${owner.tag}`, iconURL: owner.displayAvatarURL({ dynamic: true }) });
		return embed;
	}

	private get freemem() {
		return os.freemem() / (1024 * 1024);
	}

	private count(collection: string) {
		return this.client.db.collection(collection).estimatedDocumentCount();
	}
}
