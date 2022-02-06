import { Message, MessageEmbed } from 'discord.js';
import { Collections } from '../../util/Constants';
import { Reminder } from '../../struct/RemindScheduler';
import { Command } from 'discord-akairo';
import moment from 'moment';

const roles: { [key: string]: string } = {
	member: 'Member',
	admin: 'Elder',
	coLeader: 'Co-Leader',
	leader: 'Leader'
};

export default class ReminderListCommand extends Command {
	public constructor() {
		super('reminder-list', {
			category: 'reminder',
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
		if (!reminders.length) return message.util!.send('**You have no reminders.**');

		const label = (duration: number) => moment.duration(duration)
			.format('H[h], m[m], s[s]', { trim: 'both mid' });

		const embed = new MessageEmbed();
		reminders.forEach((reminder, index) => {
			embed.addField(
				`${index + 1}. ${label(reminder.duration)} remaining`,
				[
					`**Channel:** <#${reminder.channel}>`,
					reminder.roles.length === 4 ? '' : `**Roles:** ${reminder.roles.map(role => roles[role]).join(', ')}`,
					reminder.townHalls.length === 13 ? '' : `**Town Halls:** ${reminder.townHalls.join(', ')}`,
					reminder.remaining.length === 2 ? '' : `**Remaining Hits:** ${reminder.remaining.join(', ')}`,
					`**Custom Message:** ${reminder.message.substring(0, 100)}...`,
					'\u200b'
				].filter(txt => txt.length).join('\n')
			);
		});

		return message.util!.send({ embeds: [embed] });
	}
}
