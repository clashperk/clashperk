import { TextChannel } from 'discord.js';
import moment from 'moment';
import { EMOJIS } from '../util/Emojis.js';
import { Client } from '../struct/Client.js';
import { i18n } from '../util/i18n.js';

const SUPPORT_SERVER_GENERAL_CHANNEL_ID = '609074828707758150';

export default class MaintenanceHandler {
	public isMaintenance: boolean;
	public startTime: Date | null;

	public constructor(private readonly client: Client) {
		this.startTime = null;
		this.isMaintenance = Boolean(false);
	}

	public async init() {
		setTimeout(this.init.bind(this), 30000).unref();

		const res = await this.client.http.clans({ minMembers: Math.floor(Math.random() * 40) + 10, limit: 1 });
		if (res.statusCode === 503 && !this.isMaintenance) {
			this.isMaintenance = Boolean(true);
			this.client.rpcHandler.flush();
			this.startTime = new Date();
			this.sendMessages();
		}

		if (res.statusCode === 200 && this.isMaintenance) {
			const duration = Date.now() - this.startTime!.getTime();
			if (duration > 60_000) {
				this.isMaintenance = Boolean(false);
				this.startTime = null;
				this.sendMessages(duration);
				this.client.rpcHandler.init();
			}
		}

		return this;
	}

	private sendMessages(dur = 0) {
		this.client.logger.info(this.getMessage(), { label: 'API_STATUS' });
		this.deliverMessages(dur);
		this.sendSupportServerMessage(dur);
	}

	private async deliverMessages(dur = 0) {
		for (const setting of this.client.settings.flatten()) {
			if (!setting.eventsChannel) continue;
			if (setting.eventsChannel === SUPPORT_SERVER_GENERAL_CHANNEL_ID) continue;

			if (this.client.settings.hasCustomBot(setting.guildId) && !this.client.isCustom()) continue;

			const channel = this.client.channels.cache.get(setting.eventsChannel) as TextChannel | null;
			if (channel?.isTextBased() && channel.permissionsFor(this.client.user!)?.has(['SendMessages', 'ViewChannel'])) {
				const message = i18n(this.isMaintenance ? 'common.maintenance_start' : 'common.maintenance_end', {
					lng: channel.guild.preferredLocale,
					duration: `(~${moment.duration(dur).format('D[d], H[h], m[m], s[s]', { trim: 'both mid' })})`
				});
				await channel.send(`**${EMOJIS.MAINTENANCE} ${message}**`);
			}
		}
	}

	private async sendSupportServerMessage(dur = 0) {
		const channel = this.client.channels.cache.get(SUPPORT_SERVER_GENERAL_CHANNEL_ID);
		if (channel) await (channel as TextChannel).send(`**${EMOJIS.MAINTENANCE} ${this.getMessage(dur)}**`);
	}

	private getMessage(dur = 0) {
		if (this.isMaintenance) {
			return `Maintenance break has started!`;
		}
		return `Maintenance break has finished! (~${moment.duration(dur).format('D[d], H[h], m[m], s[s]', { trim: 'both mid' })})`;
	}
}
