import chalk from 'chalk';
import moment from 'moment';
import util from 'util';
import Client from '../struct/Client';

interface T {
	[key: string]: string;
}

const COLORS: T = {
	debug: 'yellow',
	info: 'cyan',
	warn: 'magenta',
	error: 'red'
};

const TAGS: T = {
	debug: '[DEBUG]',
	info: '[INFO ]',
	warn: '[WARN ]',
	error: '[ERROR]'
};

export default class Logger {
	public constructor(private readonly client: Client | null) {}

	public debug(message: string | any, { label }: { label?: string }) {
		return this.write(message, { label, tag: 'debug' });
	}

	public info(message: string | any, { label }: { label?: string }) {
		return this.write(message, { label, tag: 'info' });
	}

	public error(message: string | any, { label }: { label?: string }) {
		return this.write(message, { error: true, label, tag: 'error' });
	}

	public warn(message: string | any, { label }: { label?: string }) {
		return this.write(message, { label, tag: 'warn' });
	}

	private write(message: string | any, { error, label, tag }: { error?: boolean; label?: string; tag: string }) {
		const timestamp = chalk.cyan(moment().utcOffset('+05:30').format('DD-MM-YYYY kk:mm:ss'));
		const content = this.clean(message);
		const stream = error ? process.stderr : process.stdout;
		const color = COLORS[tag] as 'red' | 'cyan' | 'yellow' | 'magenta';
		stream.write(`[${timestamp}]${this.shard} ${chalk[color].bold(TAGS[tag])} » ${label ? `[${label}] » ` : ''}${content}\n`);
	}

	private clean(message: string | any) {
		if (typeof message === 'string') return message;
		return util.inspect(message, { depth: Infinity });
	}

	private get shard() {
		return this.client?.shard?.ids ? ` [SHARD ${this.client.shard.ids[0]}]` : '';
	}
}

