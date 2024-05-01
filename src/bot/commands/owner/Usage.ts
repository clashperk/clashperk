import { CommandInteraction, EmbedBuilder } from 'discord.js';
import moment from 'moment';
import { Args, Command } from '../../lib/index.js';
import Chart from '../../struct/ChartHandler.js';
import { Collections } from '../../util/Constants.js';

export default class UsageCommand extends Command {
  public constructor() {
    super('usage', {
      category: 'owner',
      clientPermissions: ['EmbedLinks', 'AttachFiles'],
      defer: true,
      ownerOnly: true,
      ephemeral: true
    });
  }

  public args(): Args {
    return {
      chart: {
        match: 'STRING'
      },
      limit: {
        match: 'INTEGER'
      }
    };
  }

  public async exec(interaction: CommandInteraction<'cached'>, { chart, limit }: { chart: string; limit?: number }) {
    limit ??= 15;
    if (chart) {
      const url = await this.buffer(Number(limit));
      return interaction.editReply(url);
    }

    const { commands, total } = await this.commands();
    const maxDigit = Math.max(...commands.map((cmd) => cmd.uses.toString().length));
    const usage = await this.usage();
    const embed = new EmbedBuilder()
      .setAuthor({ name: `${this.client.user!.displayName}`, iconURL: this.client.user!.displayAvatarURL({ extension: 'png' }) })
      .setColor(this.client.embed(interaction))
      .setTitle('Usage')
      .setFooter({ text: `${total.toLocaleString()}x Total • Since April 2019` });
    embed.setDescription(
      [
        `__**\`\u200e${'Date'.padEnd(6, ' ')}  ${'Uses'.padEnd(18, ' ')}\u200f\`**__`,
        ...usage.map((en) => `\`\u200e${moment(en.createdAt).format('DD MMM')}  ${en.usage.toString().padEnd(18, ' ')}\u200f\``),
        '',
        `__**\`\u200e # ${'Uses'.padStart(maxDigit + 1, ' ')}  ${'Command'.padEnd(15, ' ')}\u200f\`**__`,
        ...commands.splice(0, 50).map(({ id, uses }, index) => {
          const command = `/${this.client.commandHandler.modules.get(id)!.id}`;
          return `\`\u200e${(index + 1).toString().padStart(2, ' ')} ${uses
            .toString()
            .padStart(maxDigit, ' ')}x  ${command.padEnd(15, ' ')}\u200f\``;
        })
      ].join('\n')
    );

    return interaction.editReply({ embeds: [embed] });
  }

  private async commands() {
    const result = await this.client.db
      .collection<{ uses: number; command: string; total: number }>(Collections.BOT_COMMANDS)
      .find()
      .toArray();

    const commands = result
      .filter((cmd) => this.handler.modules.has(cmd.command))
      .map((cmd) => ({
        id: cmd.command,
        uses: cmd.total
      }));

    return { commands: this.sort(commands), total: this.total(commands) };
  }

  private async growth() {
    const cursor = this.client.db.collection(Collections.BOT_GROWTH).find();
    const data = await cursor.sort({ _id: -1 }).limit(1).next();
    return { addition: data?.addition, deletion: data?.deletion, growth: data?.addition - data?.deletion };
  }

  private async buffer(limit: number) {
    const growth = await this.growth();
    const collection = await this.client.db.collection(Collections.BOT_GROWTH).find().sort({ _id: -1 }).limit(limit).toArray();
    return Chart.growth(
      collection.reverse().map((growth) => ({ date: new Date(growth.key), value: growth })),
      { ...growth }
    );
  }

  private usage(): Promise<{ usage: number; createdAt: Date }[]> {
    return this.client.db
      .collection<{ usage: number; createdAt: Date }>(Collections.BOT_USAGE)
      .find()
      .sort({ _id: -1 })
      .limit(15)
      .toArray();
  }

  private sort(items: { uses: number; id: string }[]) {
    return items.sort((a, b) => b.uses - a.uses);
  }

  private total(items: { uses: number }[]) {
    return items.reduce((previous, current) => current.uses + previous, 0);
  }
}
