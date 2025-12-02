import { CommandInteraction, MessageFlags } from 'discord.js';
import util from 'node:util';
import { Args, Command } from '../../lib/handlers.js';
import { Util } from '../../util/toolkit.js';

export default class EvalCommand extends Command {
  private readonly _replaceToken!: string;

  public constructor() {
    super('eval', {
      category: 'owner',
      ownerOnly: true,
      defer: true,
      ephemeral: true
    });
  }

  public args(): Args {
    return {
      code: {
        match: 'STRING'
      },
      shard: {
        match: 'BOOLEAN'
      },
      depth: {
        match: 'NUMBER'
      }
    };
  }

  public async exec(
    interaction: CommandInteraction,
    { code, depth, shard }: { code: string; depth?: number; shard?: boolean }
  ) {
    let hrDiff;
    let evaled;
    try {
      const hrStart = process.hrtime();
      evaled = await (shard
        ? this.client.cluster.broadcastEval((client, code) => eval(code), { context: code })
        : eval(code));
      hrDiff = process.hrtime(hrStart);
    } catch (error) {
      return interaction.followUp({
        content: `*Error while evaluating!*\`\`\`js\n${error as string}\`\`\``,
        flags: MessageFlags.Ephemeral
      });
    }

    const result = this._result(evaled, hrDiff, depth, shard);
    if (Array.isArray(result)) {
      return result
        .slice(0, 5)
        .map((content) => interaction.followUp({ content, flags: MessageFlags.Ephemeral }));
    }
    return interaction.followUp({ content: result as string, flags: MessageFlags.Ephemeral });
  }

  private _result(result: string, hrDiff: number[], depth?: number, shard?: boolean) {
    const inspected = util
      .inspect(result, { depth: shard && depth ? depth + 1 : (depth ?? 0) })
      .replace(new RegExp('!!NL!!', 'g'), '\n')
      .replace(this.replaceToken, '--🙄--');

    const split = inspected.split('\n');
    const last = inspected.length - 1;
    const prependPart =
      !inspected.startsWith('{') && !inspected.startsWith('[') && !inspected.startsWith("'")
        ? split[0]
        : inspected[0];
    const appendPart =
      inspected[last] !== '}' && inspected[last] !== ']' && inspected[last] !== "'"
        ? split[split.length - 1]
        : inspected[last];
    const prepend = `\`\`\`js\n${prependPart}\n`;
    const append = `\n${appendPart}\n\`\`\``;

    return Util.splitMessage(
      `*Executed in ${this.totalTime(hrDiff).toFixed(2)}ms* \`\`\`js\n${inspected}\`\`\``,
      {
        maxLength: 1900,
        prepend,
        append
      }
    );
  }

  private get replaceToken() {
    if (!this._replaceToken) {
      const token = this.client.token!.split('').join('[^]{0,2}');
      const revToken = this.client.token!.split('').reverse().join('[^]{0,2}');
      Object.defineProperty(this, '_replaceToken', {
        value: new RegExp(`${token}|${revToken}`, 'g')
      });
    }
    return this._replaceToken;
  }

  private totalTime(hrDiff: number[]) {
    return hrDiff[0] * 1000 + hrDiff[1] / 1000000;
  }
}
