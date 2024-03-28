import { AnyThreadChannel, CommandInteraction, TextChannel, escapeMarkdown } from 'discord.js';
import moment from 'moment';
import { Filter } from 'mongodb';
import { Command } from '../../../lib/index.js';
import { Reminder } from '../../../struct/ClanWarScheduler.js';
import { Collections, MAX_TOWN_HALL_LEVEL } from '../../../util/Constants.js';
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
		super('reminder-list', {
			aliases: ['reminders-list'],
			category: 'reminder',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true,
			ephemeral: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { channel?: TextChannel | AnyThreadChannel; clans?: string }) {
		const filter: Filter<Reminder> = {
			guild: interaction.guildId
		};
		const tags = await this.client.resolver.resolveArgs(args.clans);
		if (args.channel) filter.channel = args.channel.id;
		if (tags.length) filter.clans = { $in: tags };

		const reminders = await this.client.db.collection<Reminder>(Collections.REMINDERS).find(filter).toArray();
		if (!reminders.length && (args.channel || tags.length)) {
			return interaction.editReply('No reminders were found for the specified channel or clans.');
		}

		if (!reminders.length) return interaction.editReply(this.i18n('command.reminders.list.no_reminders', { lng: interaction.locale }));
		const clans = await this.client.storage.find(interaction.guildId);

		const label = (duration: number) => moment.duration(duration).format('H[h], m[m], s[s]', { trim: 'both mid' });

		const chunks = reminders.map((reminder) => {
			const clanNames = clans.filter((clan) => reminder.clans.includes(clan.tag)).map((clan) => `${clan.name} (${clan.tag})`);
			return [
				`**🔔 Reminder (ID: ${hexToNanoId(reminder._id)})**`,
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
				clanNames.length ? `${escapeMarkdown(clanNames.join(', '))}` : 'Any',
				'**Message**',
				`${escapeMarkdown(reminder.message.slice(0, 300))}`
			].join('\n');
		});

		const contents = Util.splitMessage(chunks.join('\n\u200b\n'), { maxLength: 2000, char: '\n\u200b\n' });
		for (const content of contents) await interaction.followUp({ content, ephemeral: true });
	}
}
