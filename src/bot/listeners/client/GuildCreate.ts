import { ChannelType, EmbedBuilder, Guild, PermissionFlagsBits, TextChannel, Webhook } from 'discord.js';
import { Listener } from '../../lib/index.js';
import { mixpanel } from '../../struct/Mixpanel.js';
import { Collections } from '../../util/Constants.js';
import { EMOJIS } from '../../util/Emojis.js';
import { welcomeEmbedMaker } from '../../util/Helper.js';
import { CustomBot, ICustomBot } from '../../struct/CustomBot.js';

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
		if (this.client.isCustom()) await this.createCommands(guild);
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
			owner_name: user.username,
			member_count: guild.memberCount,
			total_guild_count: guilds
		});

		const webhook = await this.fetchWebhook().catch(() => null);
		if (webhook) {
			const embed = new EmbedBuilder()
				.setColor(0x38d863)
				.setAuthor({ name: `${guild.name} (${guild.id})`, iconURL: guild.iconURL({ forceStatic: false })! })
				.setTitle(`${EMOJIS.OWNER} ${user.displayName} (${user.id})`)
				.setFooter({ text: `${guild.memberCount} members (Shard ${guild.shard.id})`, iconURL: user.displayAvatarURL() })
				.setTimestamp();
			return webhook.send({
				embeds: [embed],
				username: this.client.user!.displayName,
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
		const embed = welcomeEmbedMaker();

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

		for await (const data of db.find({ guild: guild.id, active: true })) {
			this.client.rpcHandler.add(data._id.toString(), { tag: data.tag, guild: guild.id, op: 0 });
		}

		await db.updateMany({ guild: guild.id }, { $set: { paused: false } });
	}

	private async createCommands(guild: Guild) {
		const patron = await this.client.patrons.findGuild(guild.id);
		if (!patron?.applicationId) return;

		const collection = this.client.db.collection<ICustomBot>(Collections.CUSTOM_BOTS);
		const app = await collection.findOne({ applicationId: patron.applicationId });
		if (!app) return;

		const customBot = new CustomBot(app.token);
		const commands = await customBot.createCommands(app.applicationId, guild.id);

		if (commands.length) {
			await collection.updateOne({ _id: app._id }, { $addToSet: { guildIds: guild.id } });
			await this.client.settings.setCustomBot(guild);
		}

		return commands;
	}
}
