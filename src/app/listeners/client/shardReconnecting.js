const { Listener } = require("discord-akairo");

class ShardReconnectListener extends Listener {
	constructor() {
		super("shardReconnecting", {
			event: "shardReconnecting",
			emitter: "client",
			category: "client"
		});
	}

	exec(id) {
		this.client.logger.info(`Shard ${id} Reconnecting`, { label: "SHARD RECONNECTING" });
	}
}

module.exports = ShardReconnectListener;
