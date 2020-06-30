const { Listener } = require("discord-akairo");

class ShardResumeListener extends Listener {
	constructor() {
		super("shardResume", {
			event: "shardResume",
			emitter: "client",
			category: "client"
		});
	}

	exec(id, replayedEvents) {
		this.client.logger.info(`Shard ${id} resumed (replayed ${replayedEvents} events)`, { label: "SHARD RESUMED" });
	}
}

module.exports = ShardResumeListener;
