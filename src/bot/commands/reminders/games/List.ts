import { CommandInteraction, escapeMarkdown, time } from 'discord.js';
import moment from 'moment';
import { Collections } from '../../../util/Constants.js';
import { Command } from '../../../lib/index.js';
import { Util } from '../../../util/index.js';
import { ClanGamesReminder } from '../../../struct/ClanGamesScheduler.js';
import { hexToNanoId } from '../../../util/Helper.js';

const roles: Record<string, string> = {
	member: 'Member',
	admin: 'Elder',
	coLeader: 'Co-Leader',
	leader: 'Leader'
};

export default class ReminderListCommand extends Command {
	public constructor() {
		super('clan-games-reminder-list', {
			category: 'reminder',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true,
			ephemeral: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>) {
		const reminders = await this.client.db
			.collection<ClanGamesReminder>(Collections.CG_REMINDERS)
			.find({ guild: interaction.guildId })
			.toArray();
		if (!reminders.length) return interaction.editReply(this.i18n('command.reminders.list.no_reminders', { lng: interaction.locale }));
		const clans = await this.client.storage.find(interaction.guildId);

		const startTime = moment().startOf('month').add(21, 'days').add(8, 'hour');
		const endTime = startTime.clone().add(6, 'days');

		const label = (duration: number) => moment.duration(duration).format('d[d] H[h], m[m], s[s]', { trim: 'both mid' });
		const chunks = reminders.map((reminder) => {
			const clanNames = clans.filter((clan) => reminder.clans.includes(clan.tag)).map((clan) => `${clan.name} (${clan.tag})`);
			const timestamp = moment(endTime).subtract(reminder.duration, 'milliseconds').toDate();
			return [
				`**🔔 Reminder (ID: ${hexToNanoId(reminder._id)})**`,
				`${label(reminder.duration)} remaining - ${time(timestamp, 'R')}`,
				'**Channel**',
				`<#${reminder.channel}>`,
				'**Roles**',
				reminder.roles.length === 4 ? 'Any' : `${reminder.roles.map((role) => roles[role]).join(', ')}`,
				'**Min Points**',
				reminder.minPoints === 0 ? 'Until Maxed' : `${reminder.minPoints}`,
				'**Participation Type**',
				reminder.allMembers ? 'All Members' : 'Only Participants',
				'**Clans**',
				clanNames.length ? `${escapeMarkdown(clanNames.join(', '))}` : 'Any',
				'**Message**',
				`${escapeMarkdown(reminder.message.substring(0, 300))}`
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
