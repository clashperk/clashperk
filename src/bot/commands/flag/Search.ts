import { Collections } from '../../util/Constants';
import { Message, MessageEmbed } from 'discord.js';
import { Player } from 'clashofclans.js';
import { Command } from 'discord-akairo';

export default class FlagShowCommand extends Command {
	public constructor() {
		super('flag-show', {
			category: 'none',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			description: {},
			optionFlags: ['--tag']
		});
	}

	public *args(msg: Message): unknown {
		const data = yield {
			flag: '--tag',
			match: msg.interaction ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.getPlayer(msg, tag)
		};

		return { data };
	}

	public async exec(message: Message, { data }: { data: Player }) {
		const flag = await this.client.db.collection(Collections.FLAGS)
			.findOne({ guild: message.guild!.id, tag: data.tag });

		if (!flag) {
			return message.util!.send(`**${data.name}** is not flagged!`);
		}

		const user = await this.client.users.fetch(flag.user).catch(() => null);
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor({ name: `${data.name} (${data.tag})` })
			.setDescription([
				'**Executor**',
				user ? user.tag : `Unknown#0000 (${flag.user as string})`,
				'',
				'**Reason**',
				`${flag.reason as string}`
			].join('\n'))
			.setFooter({ text: 'Date' })
			.setTimestamp(flag.createdAt);

		return message.util!.send({ embeds: [embed] });
	}
}
