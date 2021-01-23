import { TextChannel } from 'discord.js';
import { EMOJIS } from '../util/Emojis';
import Client from '../struct/Client';

export default class MaintenanceHandler {
	public isMaintenance: boolean;

	public constructor(private readonly client: Client) {
		this.isMaintenance = Boolean(false);
	}

	public async init() {
		const res = await this.client.http.clans({ minMembers: Math.floor(Math.random() * 40) + 10, limit: 1 }).catch(() => null);
		setTimeout(this.init.bind(this), 30000);
		if (res?.statusCode === 503 && !this.isMaintenance) {
			this.isMaintenance = Boolean(true);
			this.client.rpcHandler.flush();
			return this.send();
		}
		if (res?.statusCode === 200 && this.isMaintenance) {
			this.isMaintenance = Boolean(false);
			await this.client.rpcHandler.init();
			return this.send();
		}
		return Promise.resolve();
	}

	private send() {
		const channel = this.client.channels.cache.get('609074828707758150');
		if (this.isMaintenance && channel) {
			return (channel as TextChannel).send(`**${EMOJIS.COC_LOGO} Maintenance Break has Started!**`);
		}

		if (!this.isMaintenance && channel) {
			return (channel as TextChannel).send(`**${EMOJIS.COC_LOGO} Maintenance Break has Finished!**`);
		}
	}
}
