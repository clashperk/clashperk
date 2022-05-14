import { CommandInteraction } from 'discord.js';
import { Collections } from '../../util/Constants';
import { Reminder } from '../../struct/RemindScheduler';
import { Command } from '../../lib';
import { Util } from '../../util';
import moment from 'moment';

const roles: Record<string, string> = {
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
			clientPermissions: ['EMBED_LINKS'],
			defer: true,
			ephemeral: true
		});
	}

	public async exec(interaction: CommandInteraction) {
		const reminders = await this.client.db.collection<Reminder>(Collections.REMINDERS).find({ guild: interaction.guild!.id }).toArray();
		if (!reminders.length) return interaction.editReply('**You have no reminders.**');
		const clans = await this.client.storage.find(interaction.guild!.id);

		const label = (duration: number) => moment.duration(duration).format('H[h], m[m], s[s]', { trim: 'both mid' });

		const chunks = reminders.map((reminder, index) => {
			const _clans = clans.filter((clan) => reminder.clans.includes(clan.tag)).map((clan) => clan.name);
			return [
				`**🔔 Reminder (${index + 1})**`,
				`${label(reminder.duration)} remaining`,
				'**Channel**',
				`<#${reminder.channel}>`,
				'**Roles**',
				reminder.roles.length === 4 ? 'Any' : `${reminder.roles.map((role) => roles[role]).join(', ')}`,
				'**Town Halls**',
				reminder.townHalls.length === 13 ? 'Any' : `${reminder.townHalls.join(', ')}`,
				'**Remaining Hits**',
				reminder.remaining.length === 2 ? 'Any' : `${reminder.remaining.join(', ')}`,
				'**Clans**',
				_clans.length ? `${Util.escapeMarkdown(_clans.join(', '))}` : 'Any',
				'**Message**',
				`${Util.escapeMarkdown(reminder.message.substring(0, 300))}`
			].join('\n');
		});

		const contents = Util.splitMessage(chunks.join('\n\u200b\n'), { maxLength: 2000, char: '\n\u200b\n' });
		for (const content of contents)
			await interaction.followUp({
				content,
				ephemeral: true
			});
	}
}
