const { emoji } = require('../util/emojis');

class MaintenanceHandler {
	constructor(client) {
		this.client = client;
		this.isMaintenance = Boolean(false);
	}

	async init() {
		const res = await this.client.coc.clans({ minMembers: Math.floor(Math.random() * 40) + 10, limit: 1 });
		setTimeout(this.init.bind(this), 30000);
		if (res.status === 503 && !this.isMaintenance) {
			this.isMaintenance = Boolean(true);
			this.client.cacheHandler.flush();
			return this.send();
		}
		if (res.status === 200 && this.isMaintenance) {
			this.isMaintenance = Boolean(false);
			await this.client.cacheHandler.flush();
			await this.client.cacheHandler.init();
			return this.send();
		}
		return Promise.resolve();
	}

	async send() {
		const channel = this.client.channels.cache.get('609074828707758150');
		if (this.isMaintenance && channel) {
			return channel.send(`**${emoji.clash} Maintenance Break Started!**`);
		}

		if (!this.isMaintenance && channel) {
			return channel.send(`**${emoji.clash} Maintenance Break is Over!**`);
		}
	}
}

module.exports = MaintenanceHandler;
