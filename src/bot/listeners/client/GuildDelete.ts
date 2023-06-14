import { Guild, EmbedBuilder, Webhook } from 'discord.js';
import { Collections } from '../../util/Constants.js';
import { EMOJIS } from '../../util/Emojis.js';
import { Listener } from '../../lib/index.js';
import { mixpanel } from '../../struct/Mixpanel.js';

export default class GuildDeleteListener extends Listener {
	public webhook: Webhook | null = null;

	public constructor() {
		super('guildDelete', {
			emitter: 'client',
			event: 'guildDelete',
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
		this.client.logger.debug(`${guild.name} (${guild.id})`, { label: 'GUILD_DELETE' });

		await this.delete(guild);
		await this.client.stats.post();
		await this.client.stats.deletion();
		await this.client.stats.guilds(guild, 0);

		const values = (await this.client.shard!.fetchClientValues('guilds.cache.size').catch(() => [0])) as number[];
		const guilds = values.reduce((prev, curr) => curr + prev, 0);
		const user = await this.client.users.fetch(guild.ownerId);

		mixpanel.track('Guild delete', {
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
				.setColor(0xeb3508)
				.setAuthor({ name: `${guild.name} (${guild.id})`, iconURL: guild.iconURL()! })
				.setTitle(`${EMOJIS.OWNER} ${user.displayName} (${user.id})`)
				.setFooter({ text: `${guild.memberCount} members (Shard ${guild.shard.id})`, iconURL: user.displayAvatarURL() })
				.setTimestamp();
			return webhook.send({
				embeds: [embed],
				username: this.client.user!.displayName,
				avatarURL: this.client.user!.displayAvatarURL({ forceStatic: false }),
				content: `**Total ${guilds} | Growth ${await this.growth()}**`
			});
		}
	}

	private async growth() {
		const cursor = this.client.db.collection(Collections.BOT_GROWTH).find();
		const data = await cursor.sort({ createdAt: -1 }).limit(1).next();
		return [data!.addition, data!.deletion, data!.addition - data!.deletion].join('/');
	}

	private async delete(guild: Guild) {
		const db = this.client.db.collection(Collections.CLAN_STORES);

		for await (const data of db.find({ guild: guild.id })) {
			this.client.rpcHandler.delete(data._id.toString(), { tag: data.tag, op: 0, guild: guild.id });
		}

		await db.updateMany({ guild: guild.id }, { $set: { paused: true } });
	}
}
