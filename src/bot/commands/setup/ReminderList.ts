import { Message, MessageEmbed } from 'discord.js';
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

		const embed = new MessageEmbed()
			.setDescription([
				`**Reminders for ${message.guild!.name}**`
			].join('\n'));

		for (const reminder of reminders) {
			embed.addField(
				moment.duration(reminder.duration).format('D[d], H[h], m[m], s[s]', { trim: 'both mid' }),
				[
					reminder.message,
					'',
					`<#${reminder.channel}>`
				].join('\n')
			);
		}

		return message.util!.send({ embeds: [embed] });
	}
}
