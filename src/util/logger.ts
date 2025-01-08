import chalk from 'chalk';
import moment from 'moment';
import util from 'node:util';
import { Client } from '../struct/client.js';

const COLORS: Record<string, string> = {
  debug: 'yellow',
  info: 'cyan',
  warn: 'magenta',
  error: 'red',
  log: 'grey'
};

const TAGS: Record<string, string> = {
  debug: '[DEBUG]',
  info: '[INFO ]',
  warn: '[WARN ]',
  error: '[ERROR]',
  log: '[INFO ]'
};

export class Logger {
  public constructor(private readonly client: Client | null) {}

  public debug(message: string | unknown, { label }: { label?: string }) {
    return this.write(message, { label, tag: 'debug' });
  }

  public log(message: string | unknown, { label }: { label?: string }) {
    return this.write(message, { label, tag: 'log' });
  }

  public info(message: string | unknown, { label }: { label?: string }) {
    return this.write(message, { label, tag: 'info' });
  }

  public error(message: string | unknown, { label }: { label?: string }) {
    return this.write(message, { error: true, label, tag: 'error' });
  }

  public warn(message: string | unknown, { label }: { label?: string }) {
    return this.write(message, { label, tag: 'warn' });
  }

  private write(message: string | unknown, { error, label, tag }: { error?: boolean; label?: string; tag: string }) {
    const timestamp = chalk.cyan(moment().utcOffset('+05:30').format('DD-MM-YYYY kk:mm:ss'));
    const content = this.clean(message);
    const stream = error ? process.stderr : process.stdout;
    const color = COLORS[tag] as 'red' | 'cyan' | 'yellow' | 'magenta';
    stream.write(`[${timestamp}]${this.shard} ${chalk[color].bold(TAGS[tag])} » ${label ? `[${label}] » ` : ''}${content}\n`);
  }

  private clean(message: string | unknown) {
    if (typeof message === 'string') return message;
    return util.inspect(message, { depth: Infinity });
  }

  private get shard() {
    return this.client?.shard?.ids ? ` [SHARD${this.client.shard.ids[0]!.toString().padStart(2)}]` : ` [SHARD X]`;
  }
}
