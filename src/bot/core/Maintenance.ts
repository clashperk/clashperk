import { TextChannel } from 'discord.js';
import { EMOJIS } from '../util/Emojis';
import Client from '../struct/Client';
import moment from 'moment';

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

	private async sendMessages(dur = 0) {
		this.client.logger.info(this.getMessage(), { label: 'API_STATUS' });
		const channel = this.client.channels.cache.get(SUPPORT_SERVER_GENERAL_CHANNEL_ID);
		if (channel) await (channel as TextChannel).send(`**${EMOJIS.COC_LOGO} ${this.getMessage(dur)}**`);

		for (const setting of this.client.settings.flatten()) {
			if (!setting.eventsChannel) continue;
			if (setting.eventsChannel === SUPPORT_SERVER_GENERAL_CHANNEL_ID) continue;
			const channel = this.client.channels.cache.get(setting.eventsChannel) as TextChannel | null;
			if (channel?.isText() && channel.permissionsFor(this.client.user!)?.has(['SEND_MESSAGES', 'USE_EXTERNAL_EMOJIS', 'VIEW_CHANNEL'])) {
				await channel.send(`**${EMOJIS.COC_LOGO} ${this.getMessage(dur)}**`);
			}
		}
	}

	private getMessage(dur = 0) {
		if (this.isMaintenance) {
			return `Maintenance break has started!`;
		}
		return `Maintenance break has finished! (~${moment.duration(dur).format('D[d], H[h], m[m], s[s]', { trim: 'both mid' })})`;
	}
}
