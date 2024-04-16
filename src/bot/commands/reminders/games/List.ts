import { ClanGamesRemindersEntity } from '@app/entities';
import { AnyThreadChannel, CommandInteraction, EmbedBuilder, TextChannel, escapeMarkdown, time } from 'discord.js';
import moment from 'moment';
import { Filter } from 'mongodb';
import { Command } from '../../../lib/index.js';
import { Collections } from '../../../util/Constants.js';
import { hexToNanoId } from '../../../util/Helper.js';
import { Util } from '../../../util/index.js';

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

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: { reminder_id?: string; channel?: TextChannel | AnyThreadChannel; clans?: string }
	) {
		const filter: Filter<ClanGamesRemindersEntity> = {
			guild: interaction.guildId
		};
		const tags = await this.client.resolver.resolveArgs(args.clans);
		if (args.channel) filter.channel = args.channel.id;
		if (tags.length) filter.clans = { $in: tags };

		const reminders = await this.client.db.collection<ClanGamesRemindersEntity>(Collections.CG_REMINDERS).find(filter).toArray();
		const filtered = reminders.filter((rem) => (args.reminder_id ? hexToNanoId(rem._id) === args.reminder_id.toUpperCase() : true));

		if (!filtered.length && (args.channel || tags.length || args.reminder_id)) {
			return interaction.editReply('No reminders were found for the specified channel or clans.');
		}

		if (!reminders.length) return interaction.editReply(this.i18n('command.reminders.list.no_reminders', { lng: interaction.locale }));
		const clans = await this.client.storage.find(interaction.guildId);

		const startTime = moment().startOf('month').add(21, 'days').add(8, 'hour');
		const endTime = startTime.clone().add(6, 'days');

		const label = (duration: number) => moment.duration(duration).format('d[d] H[h], m[m]', { trim: 'both mid' });
		const chunks = filtered.map((reminder) => {
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
				`${filtered.length === 1 ? reminder.message : reminder.message.slice(0, 300)}`
			].join('\n');
		});

		if (chunks.length === 1) {
			const embed = new EmbedBuilder().setDescription(chunks.join(''));
			return interaction.followUp({ embeds: [embed], ephemeral: true });
		}

		const contents = Util.splitMessage(chunks.join('\n\u200b\n'), { maxLength: 2000, char: '\n\u200b\n' });
		for (const content of contents) await interaction.followUp({ content, ephemeral: true });
	}
}
