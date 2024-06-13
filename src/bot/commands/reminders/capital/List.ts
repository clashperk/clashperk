import { AnyThreadChannel, CommandInteraction, EmbedBuilder, TextChannel, escapeMarkdown, time } from 'discord.js';
import moment from 'moment';
import { Filter } from 'mongodb';
import { RaidRemindersEntity } from '../../../entities/capital-raid-reminders.entity.js';
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
    super('capital-reminder-list', {
      aliases: ['capital-raids-reminder-list'],
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
    const filter: Filter<RaidRemindersEntity> = {
      guild: interaction.guildId
    };
    const tags = await this.client.resolver.resolveArgs(args.clans);
    if (args.channel) filter.channel = args.channel.id;
    if (tags.length) filter.clans = { $in: tags };

    const reminders = await this.client.db.collection<RaidRemindersEntity>(Collections.RAID_REMINDERS).find(filter).toArray();
    const filtered = reminders.filter((rem) => (args.reminder_id ? hexToNanoId(rem._id) === args.reminder_id.toUpperCase() : true));

    if (!filtered.length && (args.channel || tags.length || args.reminder_id)) {
      return interaction.editReply('No reminders were found for the specified channel or clans.');
    }

    if (!reminders.length) return interaction.editReply(this.i18n('command.reminders.list.no_reminders', { lng: interaction.locale }));
    const clans = await this.client.storage.find(interaction.guildId);

    const label = (duration: number) => moment.duration(duration).format('d[d] H[h], m[m], s[s]', { trim: 'both mid' });

    const { raidWeekEndTime } = Util.geRaidWeekend(new Date());

    const chunks = filtered.map((reminder) => {
      const clanNames = clans.filter((clan) => reminder.clans.includes(clan.tag)).map((clan) => `${clan.name} (${clan.tag})`);
      const timestamp = moment(raidWeekEndTime).subtract(reminder.duration, 'milliseconds').toDate();
      return [
        `**🔔 Reminder (ID: ${hexToNanoId(reminder._id)})**`,
        `${label(reminder.duration)} remaining - ${time(timestamp, 'R')}`,
        '**Channel**',
        `<#${reminder.channel}>`,
        '**Roles**',
        reminder.roles.length === 4 ? 'Any' : `${reminder.roles.map((role) => roles[role]).join(', ')}`,
        reminder.minThreshold ? '**Min. Attack Threshold**' : '**Remaining Hits**',
        reminder.minThreshold ? reminder.minThreshold : reminder.remaining.length === 6 ? 'Any' : `${reminder.remaining.join(', ')}`,
        '**Members**',
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
