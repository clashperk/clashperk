const chalk = require('chalk');
const moment = require('moment');
const { inspect } = require('util');

class Logger {
	constructor(client) {
		this.client = client;
	}

	debug(message, { color = 'yellow', tag = '[DEBUG]', label } = {}) {
		this.write(message, { color, tag, label });
	}

	info(message, { color = 'cyan', tag = '[INFO ]', label } = {}) {
		this.write(message, { color, tag, label });
	}

	error(message, { color = 'red', tag = '[ERROR]', label } = {}) {
		this.write(message, { color, tag, label, error: true });
	}

	warn(message, { color = 'magenta', tag = '[WARN ]', label } = {}) {
		this.write(message, { color, tag, label });
	}

	write(message, { color, tag, label = 'UNKNOWN', error = false } = {}) {
		const timestamp = chalk.cyan(moment().utcOffset('+05:30').format('DD-MM-YYYY kk:mm:ss'));
		const content = this.clean(message);
		const stream = error ? process.stderr : process.stdout;
		const shard = this.shard(this.client);
		stream.write(`[${timestamp}] ${chalk[color].bold(tag)}${shard} » [${label}] » ${content}\n`);
	}

	clean(item) {
		if (typeof item === 'string') return item;
		const cleaned = inspect(item, { depth: Infinity });
		return cleaned;
	}

	shard(client) {
		return client && client.shard && client.shard.ids ? ` [SHARD ${client.shard.ids[0]}]` : '';
	}
}

module.exports = Logger;
