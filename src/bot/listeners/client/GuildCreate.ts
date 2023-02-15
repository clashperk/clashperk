import { Guild, EmbedBuilder, TextChannel, Webhook, PermissionFlagsBits, ChannelType } from 'discord.js';
import { Collections } from '../../util/Constants.js';
import { EMOJIS } from '../../util/Emojis.js';
import { Listener } from '../../lib/index.js';
import { mixpanel } from '../../struct/Mixpanel.js';

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

		mixpanel.track('Guild create', {
			distinct_id: guild.ownerId,
			guild_id: guild.id,
			name: guild.name,
			owner_id: guild.ownerId,
			owner_name: user.tag,
			member_count: guild.memberCount,
			total_guild_count: guilds
		});

		const webhook = await this.fetchWebhook().catch(() => null);
		if (webhook) {
			const embed = new EmbedBuilder()
				.setColor(0x38d863)
				.setAuthor({ name: `${guild.name} (${guild.id})`, iconURL: guild.iconURL({ forceStatic: false })! })
				.setTitle(`${EMOJIS.OWNER} ${user.tag} (${user.id})`)
				.setFooter({ text: `${guild.memberCount} members (Shard ${guild.shard.id})`, iconURL: user.displayAvatarURL() })
				.setTimestamp();
			return webhook.send({
				embeds: [embed],
				username: this.client.user!.username,
				avatarURL: this.client.user!.displayAvatarURL({ extension: 'png' }),
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
		const embed = new EmbedBuilder()
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
			.addFields([
				{
					name: 'Add to Discord',
					value: [
						'ClashPerk can be added to as many servers as you want! Please share the bot with your friends. [Invite Link](https://clashperk.com/invite)'
					].join('\n')
				},
				{
					name: 'Support',
					value: [
						'Join [Support Server](https://discord.gg/ppuppun) if you need any help or visit our [Website](https://clashperk.com) for a guide.',
						'',
						'If you like the bot, please support us on [Patreon](https://www.patreon.com/clashperk)'
					].join('\n')
				}
			])
			.setImage('https://i.imgur.com/jcWPjDf.png');

		if (guild.systemChannelId) {
			const channel = guild.channels.cache.get(guild.systemChannelId) as TextChannel;
			if (
				channel
					.permissionsFor(this.client.user!.id)
					?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ViewChannel])
			) {
				return channel.send({ embeds: [embed] });
			}
		}

		const channel = guild.channels.cache
			.filter((channel) => channel.type === ChannelType.GuildText)
			.sort((a, b) => a.createdAt!.getTime() - b.createdAt!.getTime())
			.filter((channel) =>
				channel
					.permissionsFor(this.client.user!.id)!
					.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ViewChannel])
			)
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
