import { CommandInteraction, escapeMarkdown } from 'discord.js';
import moment from 'moment';
import { Collections, MAX_TOWN_HALL_LEVEL } from '../../util/Constants.js';
import { Reminder } from '../../struct/ClanWarScheduler.js';
import { Command } from '../../lib/index.js';
import { Util } from '../../util/index.js';

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
			clientPermissions: ['EmbedLinks'],
			defer: true,
			ephemeral: true
		});
	}

	public async exec(interaction: CommandInteraction) {
		const reminders = await this.client.db.collection<Reminder>(Collections.REMINDERS).find({ guild: interaction.guild!.id }).toArray();
		if (!reminders.length) return interaction.editReply(this.i18n('command.reminder.list.no_reminders', { lng: interaction.locale }));
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
				reminder.townHalls.length === MAX_TOWN_HALL_LEVEL - 1 ? 'Any' : `${reminder.townHalls.join(', ')}`,
				'**Remaining Hits**',
				reminder.remaining.length === 2 ? 'Any' : `${reminder.remaining.join(', ')}`,
				'**War Types**',
				reminder.warTypes.length === 3 ? 'Any' : `${reminder.warTypes.join(', ').toUpperCase()}`,
				'**Clans**',
				_clans.length ? `${escapeMarkdown(_clans.join(', '))}` : 'Any',
				'**Message**',
				`${escapeMarkdown(reminder.message.substring(0, 300))}`
			].join('\n');
		});

		const contents = Util.splitMessage(chunks.join('\n\u200b\n'), { maxLength: 2000, char: '\n\u200b\n' });
		for (const content of contents) await interaction.followUp({ content, ephemeral: true });
	}
}
