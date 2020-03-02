const { Listener } = require('discord-akairo');

class ShardResumedListener extends Listener {
	constructor() {
		super('shardResumed', {
			event: 'shardResumed',
			emitter: 'client',
			category: 'client'
		});
	}

	exec(id, replayedEvents) {
		this.client.logger.info(`Shard ${id} resumed (replayed ${replayedEvents} events)`, { label: 'SHARD RESUMED' });
	}
}

module.exports = ShardResumedListener;
