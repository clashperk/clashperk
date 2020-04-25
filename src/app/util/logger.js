const chalk = require('chalk');
const moment = require('moment');
const { inspect } = require('util');

class Logger {
	constructor(client) {
		this.client = client;
	}

	debug(message, { color = 'yellow', tag = '[DEBUG]', label } = {}) {
		this.constructor.write(message, { color, tag, label });
	}

	info(message, { color = 'cyan', tag = '[INFO ]', label } = {}) {
		this.constructor.write(message, { color, tag, label });
	}

	error(message, { color = 'red', tag = '[ERROR]', label } = {}) {
		this.constructor.write(message, { color, tag, label, error: true });
	}

	warn(message, { color = 'magenta', tag = '[WARN ]', label } = {}) {
		this.constructor.write(message, { color, tag, label });
	}

	static write(message, { color, tag, label = 'UNKNOWN', error = false } = {}) {
		const timestamp = chalk.cyan(moment().format('DD-MM-YYYY kk:mm:ss'));
		const content = this.clean(message);
		const stream = error ? process.stderr : process.stdout;
		const shard = this.shard();
		stream.write(`[${timestamp}]${shard} ${chalk[color].bold(tag)} » [${label}] » ${content}\n`);
	}

	static clean(item) {
		if (typeof item === 'string') return item;
		const cleaned = inspect(item, { depth: Infinity });
		return cleaned;
	}

	static shard() {
		console.log(this.client.shard);
		return this.client && this.client.shard && this.client.shard.ids ? ` [SHARD ${this.client.shard.ids[0]}]` : '';
	}
}

module.exports = Logger;
