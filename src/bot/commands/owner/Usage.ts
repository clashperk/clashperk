import { MessageAttachment, MessageEmbed, Message } from 'discord.js';
import { Command, Argument } from 'discord-akairo';
import { COLLECTIONS } from '../../util/Constants';
import Chart from '../../core/ChartHandler';
import moment from 'moment';

export default class UsageCommand extends Command {
	public constructor() {
		super('usage', {
			aliases: ['usage'],
			category: '_owner',
			description: {
				content: 'Displays the usage statistics of the bot.'
			},
			clientPermissions: ['EMBED_LINKS'],
			args: [
				{
					id: 'growth',
					type: ['growth']
				},
				{
					'id': 'limit',
					'type': Argument.range('integer', 15, 60, true),
					'default': 15
				}
			]
		});
	}

	public async exec(message: Message, { growth: graph, limit }: { growth: string; limit: number }) {
		if (graph) {
			const { addition, deletion, growth } = await this.growth();
			const buffer = await this.buffer(limit);
			const file = new MessageAttachment(buffer, 'growth.png');
			const embed = new MessageEmbed()
				.setAuthor(this.client.user!.username, this.client.user!.displayAvatarURL())
				.setColor(this.client.embed(message))
				.setImage('attachment://growth.png')
				.setFooter(`${'⚙️'} Today's Growth: ${Number(addition)}/${Math.abs(deletion)}/${growth}`);
			return message.util!.send(embed.footer!.text, { /* embed, */ files: [file] });
		}

		const { commands } = await this.commands();
		const usage = await this.usage();
		const embed = this.client.util.embed()
			.setAuthor(`${this.client.user!.username}`, this.client.user!.displayAvatarURL())
			.setColor(this.client.embed(message))
			.setTitle('Usage')
			.setFooter(`${Number(await this.commandsTotal())}x Total • Since April 2019`);
		embed.setDescription([
			`__**\`\u200e${'Date'.padEnd(6, ' ')}  ${'Uses'.padEnd(18, ' ')}\u200f\`**__`,
			...usage.map(en => `\`\u200e${moment(en.createdAt).format('DD MMM')}  ${en.usage.toString().padEnd(18, ' ')}\u200f\``),
			'',
			`__**\`\u200e # ${'Uses'.padStart(6, ' ')}  ${'Command'.padEnd(15, ' ')}\u200f\`**__`,
			...commands.splice(0, 15)
				.map(({ id, uses }, index) => {
					const command = this.client.commandHandler.modules.get(id)!.aliases[0].replace(/-/g, '');
					return `\`\u200e${(index + 1).toString().padStart(2, ' ')} ${uses.toString().padStart(5, ' ')}x  ${command.padEnd(15, ' ')}\u200f\``;
				})
		]);

		return message.util!.send({ embed });
	}

	private async commands() {
		const data = await this.client.db.collection(COLLECTIONS.BOT_STATS)
			.findOne({ id: 'stats' });
		const commands: { uses: number; id: string }[] = [];
		for (const [key, value] of Object.entries(data?.commands ?? {})) {
			if (!this.client.commandHandler.modules.get(key)?.aliases.length) continue;
			commands.push({ uses: Number(value), id: key });
		}

		return { commands: this.sort(commands), total: this.total(commands) };
	}

	private async growth() {
		const data = await this.client.db.collection(COLLECTIONS.BOT_GROWTH)
			.findOne({ ISTDate: new Date(Date.now() + 198e5).toISOString().substring(0, 10) });
		if (!data) return { addition: 0, deletion: 0, growth: 0 };
		return { addition: data.addition, deletion: data.deletion, growth: data.addition - data.deletion };
	}

	private async buffer(limit: number) {
		const collection = await this.client.db.collection(COLLECTIONS.BOT_GROWTH)
			.find({ createdAt: { $gte: new Date(Date.now() - ((limit + 1) * 24 * 60 * 60 * 1000)) } })
			.sort({ createdAt: 1 })
			.toArray();
		return Chart.growth(
			collection
				.slice(-limit)
				.map(growth => ({ date: new Date(growth.ISTDate), value: growth }))
		);
	}

	private async commandsTotal() {
		const data = await this.client.db.collection(COLLECTIONS.BOT_STATS)
			.findOne({ id: 'stats' });

		return data?.commands_used ?? 0;
	}

	private usage(): Promise<{ usage: number; createdAt: Date }[]> {
		return this.client.db.collection(COLLECTIONS.BOT_USAGE)
			.find()
			.sort({ createdAt: -1 })
			.limit(15)
			.toArray();
	}

	private sort(items: { uses: number; id: string }[]) {
		return items.sort((a, b) => b.uses - a.uses);
	}

	private total(items: { uses: number }[]) {
		return items.reduce((previous, currrent) => currrent.uses + previous, 0);
	}
}
