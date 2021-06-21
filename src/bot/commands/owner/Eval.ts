import { Command, Argument } from 'discord-akairo';
import { Util, Message } from 'discord.js';
import util from 'util';

export default class EvalCommand extends Command {
	private readonly _replaceToken!: string;

	public constructor() {
		super('eval', {
			aliases: ['eval', 'e'],
			category: 'owner',
			ownerOnly: true,
			description: {
				content: 'You can\'t use this anyway, so why explain?',
				usage: '<code>'
			},
			optionFlags: ['--depth', '-d'],
			flags: ['--shard', '-s']
		});
	}

	public *args(): unknown {
		const depth = yield {
			'match': 'option',
			'type': Argument.range('integer', 0, 3, true),
			'flag': ['--depth', '-d'],
			'default': 0
		};

		const shard = yield {
			match: 'flag',
			flag: ['--shard', '-s']
		};

		const code = yield {
			match: 'rest',
			type: 'string'
		};

		return { depth, shard, code };
	}

	public async exec(message: Message, { code, depth, shard }: { code: string; depth: number; shard: number }) {
		let hrDiff;
		let evaled;
		try {
			const hrStart = process.hrtime();
			evaled = await (shard ? this.client.shard!.broadcastEval(client => code) : eval(code)); // eslint-disable-line
			hrDiff = process.hrtime(hrStart);
		} catch (error) {
			return message.util!.send(`*Error while evaluating!*\`\`\`js\n${error as string}\`\`\``);
		}

		const result = this._result(evaled, hrDiff, depth, shard);
		if (Array.isArray(result)) {
			return result.map(async (res, index) => {
				if (index === 0) return message.util!.send(res);
				return message.channel.send(res);
			});
		}
		return message.util!.send(result);
	}

	private _result(result: string, hrDiff: number[], depth: number, shard: number) {
		const inspected = util.inspect(result, { depth: shard ? depth + 1 : depth })
			.replace(new RegExp('!!NL!!', 'g'), '\n')
			.replace(this.replaceToken, '--🙄--');

		const split = inspected.split('\n');
		const last = inspected.length - 1;
		const prependPart = inspected[0] !== '{' && inspected[0] !== '[' && inspected[0] !== '\'' ? split[0] : inspected[0];
		const appendPart = inspected[last] !== '}' && inspected[last] !== ']' && inspected[last] !== '\'' ? split[split.length - 1] : inspected[last];
		const prepend = `\`\`\`js\n${prependPart}\n`;
		const append = `\n${appendPart}\n\`\`\``;

		return Util.splitMessage(
			`*Executed in ${this.totalTime(hrDiff).toFixed(2)}ms* \`\`\`js\n${inspected}\`\`\``,
			{ maxLength: 1900, prepend, append }
		);
	}

	private get replaceToken() {
		if (!this._replaceToken) {
			const token = this.client.token!.split('').join('[^]{0,2}');
			const revToken = this.client.token!.split('').reverse().join('[^]{0,2}');
			Object.defineProperty(this, '_replaceToken', { value: new RegExp(`${token}|${revToken}`, 'g') });
		}
		return this._replaceToken;
	}

	private totalTime(hrDiff: number[]) {
		return (hrDiff[0] * 1000) + (hrDiff[1] / 1000000);
	}
}
