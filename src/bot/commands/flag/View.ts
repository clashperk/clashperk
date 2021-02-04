import { COLLECTIONS } from '../../util/Constants';
import { Message, MessageEmbed } from 'discord.js';
import { Player } from 'clashofclans.js';
import { Command } from 'discord-akairo';

export default class FlagCommand extends Command {
	public constructor() {
		super('flag-show', {
			category: '_hidden',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			description: {},
			args: [
				{
					id: 'data',
					type: (msg, tag) => this.client.resolver.getPlayer(msg, tag)
				}
			]
		});
	}

	public async exec(message: Message, { data }: { data: Player }) {
		const flag = await this.client.db.collection(COLLECTIONS.FLAGGED_USERS)
			.findOne({ guild: message.guild!.id, tag: data.tag });

		if (!flag) {
			return message.util!.send(`**${data.name}** is not flagged!`);
		}

		const user = await this.client.users.fetch(flag.user, false).catch(() => null);
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`)
			.setDescription([
				'**Executor**',
				user ? user.tag : `Unknown#0000 (${flag.user as string})`,
				'',
				'**Reason**',
				`${flag.reason as string}`
			])
			.setFooter('Date')
			.setTimestamp(flag.createdAt);

		return message.util!.send({ embed });
	}
}