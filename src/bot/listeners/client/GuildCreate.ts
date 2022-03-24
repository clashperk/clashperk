import { Guild, MessageEmbed, TextChannel, Webhook } from 'discord.js';
import { Collections } from '../../util/Constants';
import { EMOJIS } from '../../util/Emojis';
import { Listener } from '../../lib';

export default class GuildCreateListener extends Listener {
	private webhook: Webhook | null = null;

	public constructor() {
		super('guildCreate', {
			emitter: 'client',
			event: 'guildCreate',
			category: 'client'
		});
	}

	private async fetchWebhook() {
		if (this.webhook) return this.webhook;
		const webhook = await this.client.fetchWebhook(this.client.settings.get('global', 'defaultWebhook', null)).catch(() => null);
		this.webhook = webhook;
		return webhook;
	}

	public async exec(guild: Guild) {
		if (!guild.available) return;
		this.client.logger.debug(`${guild.name} (${guild.id})`, { label: 'GUILD_CREATE' });

		await this.intro(guild).catch(() => null);
		await this.restore(guild);
		await this.client.stats.post();
		await this.client.stats.addition(guild.id);
		await this.client.stats.guilds(guild, 0);

		const values = (await this.client.shard!.fetchClientValues('guilds.cache.size').catch(() => [0])) as number[];
		const guilds = values.reduce((prev, curr) => curr + prev, 0);

		const user = await this.client.users.fetch(guild.ownerId);
		const webhook = await this.fetchWebhook().catch(() => null);
		if (webhook) {
			const embed = new MessageEmbed()
				.setColor(0x38d863)
				.setAuthor({ name: `${guild.name} (${guild.id})`, iconURL: guild.iconURL({ dynamic: true })! })
				.setTitle(`${EMOJIS.OWNER} ${user.tag} (${user.id})`)
				.setFooter({ text: `${guild.memberCount} members (Shard ${guild.shard.id})`, iconURL: user.displayAvatarURL() })
				.setTimestamp();
			return webhook.send({
				embeds: [embed],
				username: this.client.user!.username,
				avatarURL: this.client.user!.displayAvatarURL({ format: 'png' }),
				content: `**Total ${guilds} | Growth ${await this.growth()}**`
			});
		}
	}

	private async growth() {
		const cursor = this.client.db.collection(Collections.BOT_GROWTH).find();
		const data = await cursor.sort({ createdAt: -1 }).limit(1).next();
		return [data!.addition, data!.deletion, data!.addition - data!.deletion].join('/');
	}

	private async intro(guild: Guild) {
		const embed = new MessageEmbed()
			.setAuthor({
				name: 'Thanks for inviting me, have a nice day!',
				iconURL: this.client.user!.displayAvatarURL()
			})
			.setDescription(
				[
					'Text-based commands are being replaced in favour of slash commands.',
					'Try typing `/` to see a list of available commands.'
				].join('\n')
			)
			.addField(
				'Add to Discord',
				[
					'ClashPerk can be added to as many servers as you want! Please share the bot with your friends. [Invite Link](https://clashperk.com/invite)'
				].join('\n')
			)
			.addField(
				'Support',
				[
					'Join [Support Server](https://discord.gg/ppuppun) if you need any help or visit our [Website](https://clashperk.com) for a guide.',
					'',
					'If you like the bot, please support us on [Patreon](https://www.patreon.com/clashperk)'
				].join('\n')
			)
			.setImage('https://i.imgur.com/jcWPjDf.png');

		if (guild.systemChannelId) {
			const channel = guild.channels.cache.get(guild.systemChannelId) as TextChannel;
			if (channel.permissionsFor(guild.me!)!.has(['SEND_MESSAGES', 'EMBED_LINKS', 'VIEW_CHANNEL'])) {
				return channel.send({ embeds: [embed] });
			}
		}

		const channel = guild.channels.cache
			.filter((channel) => channel.type === 'GUILD_TEXT')
			.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
			.filter((channel) => channel.permissionsFor(channel.guild.me!)!.has(['SEND_MESSAGES', 'EMBED_LINKS', 'VIEW_CHANNEL']))
			.first();
		if (channel) return (channel as TextChannel).send({ embeds: [embed] });
		return this.client.logger.info(`Failed on ${guild.name} (${guild.id})`, { label: 'INTRO_MESSAGE' });
	}

	private async restore(guild: Guild) {
		const db = this.client.db.collection(Collections.CLAN_STORES);

		await db.find({ guild: guild.id, active: true }).forEach((data) => {
			this.client.rpcHandler.add(data._id.toString(), { tag: data.tag, guild: guild.id, op: 0 });
		});

		await db.updateMany({ guild: guild.id }, { $set: { paused: false } });
	}
}
