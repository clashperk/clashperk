import { ClanWarRemindersEntity } from '@app/entities';
import { AnyThreadChannel, CommandInteraction, EmbedBuilder, Interaction, TextChannel, escapeMarkdown } from 'discord.js';
import moment from 'moment';
import { Filter } from 'mongodb';
import { Command } from '../../../lib/index.js';
import { Collections, MAX_TOWN_HALL_LEVEL } from '../../../util/constants.js';
import { hexToNanoId } from '../../../util/helper.js';
import { Util } from '../../../util/toolkit.js';

const roles: Record<string, string> = {
  member: 'Member',
  admin: 'Elder',
  coLeader: 'Co-Leader',
  leader: 'Leader'
};

export default class ReminderListCommand extends Command {
  public constructor() {
    super('clan-wars-reminder-list', {
      category: 'reminder',
      channel: 'guild',
      clientPermissions: ['EmbedLinks'],
      defer: true,
      ephemeral: true
    });
  }

  async pre(_: Interaction, args: { compact_list?: boolean }) {
    this.ephemeral = !args.compact_list;
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: { reminder_id?: string; channel?: TextChannel | AnyThreadChannel; clans?: string; compact_list?: boolean }
  ) {
    const filter: Filter<ClanWarRemindersEntity> = {
      guild: interaction.guildId
    };
    const tags = await this.client.resolver.resolveArgs(args.clans);
    if (args.channel) filter.channel = args.channel.id;
    if (tags.length) filter.clans = { $in: tags };

    const reminders = await this.client.db.collection<ClanWarRemindersEntity>(Collections.REMINDERS).find(filter).toArray();
    const filtered = reminders.filter((rem) => (args.reminder_id ? hexToNanoId(rem._id) === args.reminder_id.toUpperCase() : true));

    if (!filtered.length && (args.channel || tags.length || args.reminder_id)) {
      return interaction.editReply('No reminders were found for the specified channel or clans or reminder_id.');
    }

    if (!reminders.length) return interaction.editReply(this.i18n('command.reminders.list.no_reminders', { lng: interaction.locale }));
    const clans = await this.client.storage.find(interaction.guildId);

    const label = (duration: number) => moment.duration(duration).format('H[h], m[m]', { trim: 'both mid' });

    const chunks = filtered.map((reminder) => {
      const clanNames = clans.filter((clan) => reminder.clans.includes(clan.tag)).map((clan) => `${clan.name} (${clan.tag})`);

      const id = `**🔔 Reminder (ID: ${hexToNanoId(reminder._id)})**`;
      const channel = `**Channel** \n<#${reminder.channel}>`;
      const timeLeft = `**Time Left** \n${label(reminder.duration)}`;
      const clanInfo = `**Clans** \n${clanNames.length ? `${escapeMarkdown(clanNames.join(', '))}` : 'Any'}`;
      const message = `**Message** \n${filtered.length === 1 ? reminder.message : reminder.message.slice(0, 300)}`;

      if (args.compact_list) {
        return [id, timeLeft, channel, clanInfo, message].join('\n');
      }

      const header = [
        `**🔔 Reminder (ID: ${hexToNanoId(reminder._id)})${reminder.disabled ? ' [DISABLED]' : ''}**`,
        `${label(reminder.duration)} remaining; ${reminder.smartSkip ? 'Skip at 100%; ' : ''}${reminder.silent ? 'Message Only;' : ''}`,
        channel
      ].join('\n');
      const body = [
        '**Roles**',
        reminder.roles.length === 4 ? 'Any' : `${reminder.roles.map((role) => roles[role]).join(', ')}`,
        '**Town Halls**',
        reminder.townHalls.length === MAX_TOWN_HALL_LEVEL - 1 ? 'Any' : `${reminder.townHalls.join(', ')}`,
        '**Remaining Hits**',
        reminder.remaining.length === 2 ? 'Any' : `${reminder.remaining.join(', ')}`
      ].join('\n');
      const footer = [
        '**War Types**',
        reminder.warTypes.length === 3 ? 'Any' : `${reminder.warTypes.join(', ').toUpperCase()}`,
        clanInfo,
        message
      ].join('\n');

      return (reminder.silent ? [header, footer] : [header, body, footer]).join('\n');
    });

    if (chunks.length === 1) {
      const embed = new EmbedBuilder().setDescription(chunks.join(''));
      return interaction.followUp({ embeds: [embed], ephemeral: !args.compact_list });
    }

    const contents = Util.splitMessage(chunks.join('\n\u200b\n'), { maxLength: 2000, char: '\n\u200b\n' });
    for (const content of contents) await interaction.followUp({ content, ephemeral: !args.compact_list });
  }
}
