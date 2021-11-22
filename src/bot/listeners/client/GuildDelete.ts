import { Collections } from '../../util/Constants';
import { Guild, Webhook } from 'discord.js';
import { EMOJIS } from '../../util/Emojis';
import { Listener } from 'discord-akairo';

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
		const webhook = await this.client.fetchWebhook(this.client.settings.get('global', 'defaultWebhook', undefined)).catch(() => null);
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

		const values = await this.client.shard!.fetchClientValues('guilds.cache.size').catch(() => [0]) as number[];
		const guilds = values.reduce((prev, curr) => curr + prev, 0);

		const user = await this.client.users.fetch(guild.ownerId);
		const webhook = await this.fetchWebhook().catch(() => null);
		if (webhook) {
			const embed = this.client.util.embed()
				.setColor(0xeb3508)
				.setAuthor(`${guild.name} (${guild.id})`, guild.iconURL()!)
				.setTitle(`${EMOJIS.OWNER} ${user.tag} (${user.id})`)
				.setFooter(`${guild.memberCount} members (Shard ${guild.shard.id})`, user.displayAvatarURL())
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

	private async delete(guild: Guild) {
		const db = this.client.db.collection(Collections.CLAN_STORES);

		await db.find({ guild: guild.id })
			.forEach(data => this.client.rpcHandler.delete(data._id.toString(), { tag: data.tag, op: 0, guild: guild.id }));

		await db.updateMany({ guild: guild.id }, { $set: { paused: true } });
	}
}
