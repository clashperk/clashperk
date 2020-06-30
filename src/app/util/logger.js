const chalk = require("chalk");
const moment = require("moment");
const { inspect } = require("util");

class Logger {
	constructor(client) {
		this.client = client;
	}

	debug(message, { color = "yellow", tag = "[DEBUG]", label } = {}) {
		this._write(message, { color, tag, label });
	}

	info(message, { color = "cyan", tag = "[INFO ]", label } = {}) {
		this._write(message, { color, tag, label });
	}

	error(message, { color = "red", tag = "[ERROR]", label } = {}) {
		this._write(message, { color, tag, label, error: true });
	}

	warn(message, { color = "magenta", tag = "[WARN ]", label } = {}) {
		this._write(message, { color, tag, label });
	}

	_write(message, { color, tag, label = "UNKNOWN", error = false } = {}) {
		const timestamp = chalk.cyan(moment().format("DD-MM-YYYY kk:mm:ss"));
		const content = this._clean(message);
		const stream = error ? process.stderr : process.stdout;
		const shard = this._shard(this.client);
		stream.write(`[${timestamp}]${shard} ${chalk[color].bold(tag)} » [${label}] » ${content}\n`);
	}

	_clean(item) {
		if (typeof item === "string") return item;
		const cleaned = inspect(item, { depth: Infinity });
		return cleaned;
	}

	_shard(client) {
		return client && client.shard && client.shard.ids ? ` [SHARD ${client.shard.ids[0]}]` : "";
	}
}

module.exports = Logger;
