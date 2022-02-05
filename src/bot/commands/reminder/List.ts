import { Message, MessageActionRow, MessageButton, MessageSelectMenu } from 'discord.js';
import { Collections } from '../../util/Constants';
import { Reminder } from '../../struct/RemindScheduler';
import { Command } from 'discord-akairo';
import moment from 'moment';

export default class ReminderListCommand extends Command {
	public constructor() {
		super('reminder-list', {
			aliases: ['reminder-list'],
			category: 'beta',
			channel: 'guild',
			description: {},
			optionFlags: ['--id'],
			userPermissions: ['MANAGE_GUILD'],
			clientPermissions: ['EMBED_LINKS']
		});
	}

	public *args(msg: Message): unknown {
		const id = yield {
			flag: '--id',
			match: msg.interaction ? 'option' : 'phrase',
			type: 'string'
		};

		return { id };
	}

	public async exec(message: Message) {
		const reminders = await this.client.db.collection<Reminder>(Collections.REMINDERS)
			.find({ guild: message.guild!.id })
			.toArray();

		const customIds = {
			'menu': this.client.uuid(message.author.id),
			'delete': this.client.uuid(message.author.id),
			'view': this.client.uuid(message.author.id)
		};

		const label = (duration: number) => moment.duration(duration)
			.format('D[d], H[h], m[m], s[s]', { trim: 'both mid' });
		const menu = new MessageActionRow()
			.addComponents(
				new MessageSelectMenu()
					.setCustomId(customIds.menu)
					.setPlaceholder('Select a reminder!')
					.addOptions(
						reminders.map(
							rem => ({
								label: label(rem.duration),
								value: rem._id.toHexString(),
								description: `${rem.message.substring(0, 100)}`
							})
						)
					)
			);

		const button = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setCustomId(customIds.view)
					.setLabel('View')
					.setStyle('PRIMARY')
					.setDisabled(true)
			)
			.addComponents(
				new MessageButton()
					.setCustomId(customIds.delete)
					.setLabel('Delete')
					.setStyle('DANGER')
					.setDisabled(true)
			);

		return message.util!.send({ content: '**Manage Reminders!**', components: [menu, button] });
	}
}
