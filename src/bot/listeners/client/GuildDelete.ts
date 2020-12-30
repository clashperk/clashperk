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
		await this.client.stats.guilds(guild.id, 0);

		const user = await this.client.users.fetch(guild.ownerID);
		const webhook = await this.fetchWebhook().catch(() => null);
		if (webhook) {
			const embed = this.client.util.embed()
				.setColor(0xeb3508)
				.setAuthor(`${guild.name} (${guild.id})`, guild.iconURL()!)
				.setTitle(`${EMOJIS.OWNER} ${user.tag} (${user.id})`)
				.setFooter(`${guild.memberCount} members (Shard ${guild.shard.id})`, user.displayAvatarURL())
				.setTimestamp();
			return webhook.send({ embeds: [embed], username: 'ClashPerk', avatarURL: this.client.user!.displayAvatarURL() });
		}
	}

	private async delete(guild: Guild) {
		await this.client.db.collection('clanstores')
			.find({ guild: guild.id })
			.forEach(data => this.client.rpcHandler.delete(data._id?.toString(), { tag: data.tag }));
	}
}
