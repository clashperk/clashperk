const https = require('https');
const { emoji } = require('../util/emojis');

class MaintenanceHandler {
	constructor(client) {
		this.client = client;
		this.isMaintenance = Boolean(false);

		return this.init();
	}

	init() {
		return https.request('https://api.clashofclans.com/v1/locations?limit=1', {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${process.env.CLASH_OF_CLANS_API}`,
				'Content-Type': 'application/json'
			}
		}, res => {
			setTimeout(this.init.bind(this), 30 * 1000);
			if (res.statusCode === 503 && !this.isMaintenance) {
				this.isMaintenance = Boolean(true);
				this.client.cacheHandler.flush();
				return this.send();
			}
			if (res.statusCode === 200 && this.isMaintenance) {
				this.isMaintenance = Boolean(false);
				this.client.cacheHandler.init();
				return this.send();
			}
		}).end();
	}

	async send() {
		if (this.isMaintenance) {
			return this.client.channels.get('609074828707758150').send(`**${emoji.clash} Maintenance Break Started!**`);
		}

		if (!this.isMaintenance) {
			return this.client.channels.get('609074828707758150').send(`**${emoji.clash} Maintenance Break is Over!**`);
		}
	}
}

module.exports = MaintenanceHandler;
