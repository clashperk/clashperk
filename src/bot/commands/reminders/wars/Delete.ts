import { Collections, MAX_TOWN_HALL_LEVEL } from '@app/constants';
import { ClanWarRemindersEntity, ClanWarSchedulersEntity } from '@app/entities';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  ComponentType,
  EmbedBuilder,
  StringSelectMenuBuilder,
  escapeMarkdown
} from 'discord.js';
import moment from 'moment';
import { ObjectId } from 'mongodb';
import { Command } from '../../../lib/index.js';
import { hexToNanoId } from '../../../util/Helper.js';

const roles: Record<string, string> = {
  member: 'Member',
  admin: 'Elder',
  coLeader: 'Co-Leader',
  leader: 'Leader'
};

export default class ReminderDeleteCommand extends Command {
  public constructor() {
    super('reminder-delete', {
      aliases: ['reminders-delete'],
      category: 'reminder',
      channel: 'guild',
      userPermissions: ['ManageGuild'],
      clientPermissions: ['EmbedLinks'],
      defer: true,
      ephemeral: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { id?: string }) {
    const reminders = await this.client.db
      .collection<ClanWarRemindersEntity>(Collections.REMINDERS)
      .find({ guild: interaction.guild.id })
      .toArray();
    if (!reminders.length) return interaction.editReply(this.i18n('command.reminders.delete.no_reminders', { lng: interaction.locale }));

    if (args.id) {
      const reminderId = reminders.find((rem) => hexToNanoId(rem._id) === args.id?.toUpperCase())?._id;
      if (!reminderId)
        return interaction.editReply(this.i18n('command.reminders.delete.not_found', { lng: interaction.locale, id: args.id }));
      await this.client.db.collection<ClanWarRemindersEntity>(Collections.REMINDERS).deleteOne({ _id: reminderId });
      await this.client.db.collection<ClanWarSchedulersEntity>(Collections.SCHEDULERS).deleteMany({ reminderId });
      return interaction.editReply(this.i18n('command.reminders.delete.success', { lng: interaction.locale, id: args.id }));
    }

    if (reminders.length > 25)
      return interaction.editReply(this.i18n('command.reminders.delete.too_many_reminders', { lng: interaction.locale }));

    const clans = await this.client.storage.find(interaction.guild.id);
    const customIds = {
      menu: this.client.uuid(interaction.user.id),
      delete: this.client.uuid(interaction.user.id),
      view: this.client.uuid(interaction.user.id)
    };

    const label = (duration: number) => moment.duration(duration).format('H[h], m[m], s[s]', { trim: 'both mid' });

    const state = {
      selected: null as string | null,
      reminders: new Set(reminders.map((rem) => rem._id.toHexString()))
    };

    const options = (men = false, view = false, del = false) => {
      const menu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(customIds.menu)
          .setPlaceholder('Select a reminder!')
          .addOptions(
            reminders
              .filter((rem) => state.reminders.has(rem._id.toHexString()))
              .map((rem) => ({
                label: `${label(rem.duration)} remaining`,
                value: rem._id.toHexString(),
                description: `${rem.message.slice(0, 100)}`,
                default: state.selected === rem._id.toHexString()
              }))
          )
          .setDisabled(men)
      );

      const button = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(new ButtonBuilder().setCustomId(customIds.view).setLabel('View').setStyle(ButtonStyle.Primary).setDisabled(view))
        .addComponents(new ButtonBuilder().setCustomId(customIds.delete).setLabel('Delete').setStyle(ButtonStyle.Danger).setDisabled(del));

      return [menu, button];
    };

    const embeds = () => {
      const reminder = reminders.find((rem) => rem._id.toHexString() === state.selected)!;
      const embed = new EmbedBuilder().setColor(this.client.embed(interaction));
      embed.addFields([
        {
          name: 'Duration',
          value: `${label(reminder.duration)} remaining`
        },
        {
          name: 'Channel',
          value: `<#${reminder.channel}>`
        }
      ]);
      if (reminder.roles.length === 4) {
        embed.addFields([{ name: 'Roles', value: 'Any' }]);
      } else {
        embed.addFields([{ name: 'Roles', value: reminder.roles.map((role) => roles[role]).join(', ') || 'None' }]);
      }
      if (reminder.townHalls.length === MAX_TOWN_HALL_LEVEL - 1) {
        embed.addFields([{ name: 'Town Halls', value: 'Any' }]);
      } else {
        embed.addFields([{ name: 'Town Halls', value: reminder.townHalls.join(', ') || 'None' }]);
      }
      if (reminder.remaining.length === 2) {
        embed.addFields([{ name: 'Remaining Hits', value: 'Any' }]);
      } else {
        embed.addFields([{ name: 'Remaining Hits', value: reminder.remaining.join(', ') || 'None' }]);
      }
      if (reminder.warTypes.length === 3) {
        embed.addFields([{ name: 'War Types', value: 'Any' }]);
      } else {
        embed.addFields([{ name: 'War Types', value: reminder.warTypes.join(', ').toUpperCase() || 'None' }]);
      }
      const clanNames = clans
        .filter((clan) => reminder.clans.includes(clan.tag))
        .map((clan) => escapeMarkdown(`${clan.name} (${clan.tag})`));
      if (clanNames.length) embed.addFields([{ name: 'Clans', value: clanNames.join(', ').slice(0, 1024) || 'None' }]);
      else embed.addFields([{ name: 'Clans', value: reminder.clans.join(', ').slice(0, 1024) || 'None' }]);
      embed.addFields([{ name: 'Message', value: reminder.message.slice(0, 1024) || 'None' }]);
      return embed;
    };

    const msg = await interaction.editReply({
      embeds: [],
      content: '**Manage War Reminders**',
      components: options(false, true, true)
    });
    const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
      filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
      time: 5 * 60 * 1000
    });

    collector.on('collect', async (action) => {
      if (action.customId === customIds.menu && action.isStringSelectMenu()) {
        state.selected = action.values[0]!;
        await action.update({ components: options(false, true, false), embeds: [embeds()] });
      }

      if (action.customId === customIds.view) {
        const rems = reminders.filter((rem) => state.reminders.has(rem._id.toHexString()));
        await action.update({
          embeds: rems.length ? [embeds()] : [],
          components: rems.length ? options(false, true, false) : [],
          content: rems.length ? '**Manage War Reminders**' : "**You don't have any more reminders!**"
        });
      }

      if (action.customId === customIds.delete) {
        await action.deferUpdate();
        state.reminders.delete(state.selected!);

        await this.client.db.collection<ClanWarRemindersEntity>(Collections.REMINDERS).deleteOne({ _id: new ObjectId(state.selected!) });
        await this.client.db
          .collection<ClanWarSchedulersEntity>(Collections.SCHEDULERS)
          .deleteMany({ reminderId: new ObjectId(state.selected!) });

        const rems = reminders.filter((rem) => state.reminders.has(rem._id.toHexString()));
        await action.editReply({
          embeds: [],
          components: rems.length ? options(false, true, true) : [],
          content: rems.length ? '**Manage War Reminders**' : "**You don't have any more reminders!**"
        });
      }
    });

    collector.on('end', async (_, reason) => {
      for (const id of Object.values(customIds)) {
        this.client.components.delete(id);
      }
      if (!/delete/i.test(reason)) await interaction.editReply({ components: state.reminders.size ? options(true, true, true) : [] });
    });
  }
}
