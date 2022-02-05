import { Message, MessageEmbed } from 'discord.js';
import { Collections } from '../../util/Constants';
import { Reminder } from '../../struct/RemindScheduler';
import { Command } from 'discord-akairo';
import moment from 'moment';

export default class ReminderListCommand extends Command {
	public constructor() {
		super('reminder-list', {
			aliases: ['rem-list'],
			category: 'beta',
			channel: 'guild',
			description: {},
			userPermissions: ['MANAGE_GUILD'],
			clientPermissions: ['EMBED_LINKS']
		});
	}

	public async exec(message: Message) {
		const reminders = await this.client.db.collection<Reminder>(Collections.REMINDERS)
			.find({ guild: message.guild!.id })
			.toArray();

		const label = (duration: number) => moment.duration(duration)
			.format('D[d], H[h], m[m], s[s]', { trim: 'both mid' });

		const embed = new MessageEmbed();
		for (const reminder of reminders) {
			embed.addField(
				label(reminder.duration),
				[
					`Message: ${reminder.message.substring(0, 100)}`,
					`Channel: <#${reminder.channel}>`,
					`Roles: ${reminder.roles.join(', ')}`,
					`Town Halls: ${reminder.townHalls.join(', ')}`
				].join('\n')
			);
		}

		return message.util!.send({ embeds: [embed] });
	}
}
