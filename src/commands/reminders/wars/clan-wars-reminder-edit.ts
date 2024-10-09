import { Collections, MAX_TOWN_HALL_LEVEL } from '@app/constants';
import { ClanWarRemindersEntity } from '@app/entities';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  ComponentType,
  EmbedBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import moment from 'moment';
import ms from 'ms';
import { Command } from '../../../lib/handlers.js';
import { hexToNanoId } from '../../../util/helper.js';

export default class ReminderEditCommand extends Command {
  public constructor() {
    super('clan-wars-reminder-edit', {
      category: 'reminder',
      channel: 'guild',
      userPermissions: ['ManageGuild'],
      clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
      defer: true,
      ephemeral: true
    });
  }

  private get collection() {
    return this.client.db.collection<ClanWarRemindersEntity>(Collections.REMINDERS);
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { id: string; disable?: boolean; duration?: string }) {
    const reminders = await this.collection.find({ guild: interaction.guild.id }).toArray();
    if (!reminders.length) return interaction.editReply(this.i18n('command.reminders.no_reminders', { lng: interaction.locale }));

    const reminderId = reminders.find((rem) => hexToNanoId(rem._id) === args.id.toUpperCase())?._id;
    if (!reminderId) {
      return interaction.editReply(this.i18n('command.reminders.delete.not_found', { lng: interaction.locale, id: args.id }));
    }

    const reminder = await this.collection.findOne({ _id: reminderId });
    if (!reminder) {
      return interaction.editReply(this.i18n('command.reminders.delete.not_found', { lng: interaction.locale, id: args.id }));
    }

    let duration = reminder.duration;

    if (args.duration) {
      if (!/\d+?\.?\d+?[dhm]|\d[dhm]/g.test(args.duration)) {
        return interaction.editReply(this.i18n('command.reminders.create.invalid_duration_format', { lng: interaction.locale }));
      }

      duration = args.duration.match(/\d+?\.?\d+?[dhm]|\d[dhm]/g)!.reduce((acc, cur) => acc + ms(cur), 0);
      if (duration < 15 * 60 * 1000 && duration !== 0) {
        return interaction.editReply(this.i18n('command.reminders.create.duration_limit', { lng: interaction.locale }));
      }
      if (duration > 48 * 60 * 60 * 1000) {
        return interaction.editReply(this.i18n('command.reminders.create.duration_limit', { lng: interaction.locale }));
      }
      if (duration % (15 * 60 * 1000) !== 0) {
        return interaction.editReply(this.i18n('command.reminders.create.duration_order', { lng: interaction.locale }));
      }
    }

    const customIds = {
      roles: this.client.uuid(interaction.user.id),
      townHalls: this.client.uuid(interaction.user.id),
      remaining: this.client.uuid(interaction.user.id),
      clans: this.client.uuid(interaction.user.id),
      save: this.client.uuid(interaction.user.id),
      disable: this.client.uuid(interaction.user.id),
      warTypes: this.client.uuid(interaction.user.id),
      message: this.client.uuid(interaction.user.id),
      modalMessage: this.client.uuid(interaction.user.id)
    };

    const clans = await this.client.storage.search(interaction.guildId, reminder.clans);
    const state = {
      remaining: reminder.remaining.map((remaining) => remaining.toString()),
      townHalls: reminder.townHalls.map((townHall) => townHall.toString()),
      smartSkip: Boolean(reminder.smartSkip),
      roles: reminder.roles,
      silent: reminder.silent || reminder.duration === 0,
      warTypes: reminder.warTypes,
      message: reminder.message,
      disabled: args.disable ?? reminder.disabled
    };

    const embed = new EmbedBuilder();
    const mutate = (disable = false) => {
      embed.setDescription(
        [
          `**Edit War Reminder (${
            reminder.duration === 0 ? 'at the end' : `${this.getStatic(duration)} remaining`
          })** <#${reminder.channel}>`,

          !interaction.options.resolved?.roles?.size && state.silent
            ? '\n*This reminder will not notify any individuals for the remaining attacks. \nPlease include some roles within the reminder message to receive notifications.*\n'
            : '',
          `${state.message}`
        ].join('\n')
      );
      embed.setFooter({
        text: [state.disabled ? 'Reminder Disabled\n' : '', clans.map((clan) => `${clan.name} (${clan.tag})`).join(', ')].join('\n')
      });
      const warTypeRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setPlaceholder('Select War Types')
          .setMaxValues(3)
          .setCustomId(customIds.warTypes)
          .setOptions([
            {
              label: 'Normal',
              value: 'normal',
              default: state.warTypes.includes('normal')
            },
            {
              label: 'Friendly',
              value: 'friendly',
              default: state.warTypes.includes('friendly')
            },
            {
              label: 'CWL',
              value: 'cwl',
              default: state.warTypes.includes('cwl')
            }
          ])
          .setDisabled(disable)
      );

      const attackRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setPlaceholder('Select Attacks Remaining')
          .setMaxValues(3)
          .setCustomId(customIds.remaining)
          .setOptions([
            {
              description: '1 Attack Remaining',
              label: '1 Remaining',
              value: '1',
              default: state.remaining.includes('1')
            },
            {
              description: '2 Attacks Remaining',
              label: '2 Remaining',
              value: '2',
              default: state.remaining.includes('2')
            },
            {
              description: 'Skip reminder if the destruction is 100%',
              label: 'Skip at 100%',
              value: 'smartSkip',
              default: state.smartSkip
            },
            {
              description: 'Does not @ping any individuals, only drops the message',
              label: 'Message Only (No Ping)',
              value: 'silent',
              default: state.silent
            }
          ])
          .setDisabled(disable)
      );

      const townHallRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setPlaceholder('Select Town Halls')
          .setCustomId(customIds.townHalls)
          .setMaxValues(MAX_TOWN_HALL_LEVEL - 1)
          .setOptions(
            Array(MAX_TOWN_HALL_LEVEL - 1)
              .fill(0)
              .map((_, i) => {
                const hall = (i + 2).toString();
                return {
                  value: hall,
                  label: hall,
                  description: `Town Hall ${hall}`,
                  default: state.townHalls.includes(hall)
                };
              })
          )
          .setDisabled(disable)
      );

      const clanRolesRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setPlaceholder('Select Clan Roles')
          .setCustomId(customIds.roles)
          .setMaxValues(4)
          .setOptions([
            {
              label: 'Leader',
              value: 'leader',
              default: state.roles.includes('leader')
            },
            {
              label: 'Co-Leader',
              value: 'coLeader',
              default: state.roles.includes('coLeader')
            },
            {
              label: 'Elder',
              value: 'admin',
              default: state.roles.includes('admin')
            },
            {
              label: 'Member',
              value: 'member',
              default: state.roles.includes('member')
            }
          ])
          .setDisabled(disable)
      );

      const btnRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(customIds.message)
            .setLabel('Edit Reminder Message')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disable)
        )
        .addComponents(
          new ButtonBuilder()
            .setCustomId(customIds.disable)
            .setLabel(state.disabled ? 'Enable' : 'Disable')
            .setStyle(state.disabled ? ButtonStyle.Success : ButtonStyle.Danger)
            .setDisabled(disable)
        )
        .addComponents(new ButtonBuilder().setCustomId(customIds.save).setLabel('Save').setStyle(ButtonStyle.Primary).setDisabled(disable));

      if (reminder.duration === 0) {
        return [warTypeRow, btnRow];
      }

      if (state.silent) {
        return [warTypeRow, attackRow, btnRow];
      }

      return [warTypeRow, attackRow, townHallRow, clanRolesRow, btnRow];
    };

    const msg = await interaction.editReply({
      components: mutate(),
      embeds: [embed],
      allowedMentions: { parse: [] }
    });

    const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
      filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
      time: 5 * 60 * 1000
    });

    collector.on('collect', async (action) => {
      if (action.customId === customIds.warTypes && action.isStringSelectMenu()) {
        state.warTypes = action.values;
        await action.update({ components: mutate() });
      }

      if (action.customId === customIds.remaining && action.isStringSelectMenu()) {
        state.remaining = action.values.filter((v) => !['smartSkip', 'silent'].includes(v));
        state.smartSkip = action.values.includes('smartSkip');
        state.silent = action.values.includes('silent');

        if (state.silent) {
          state.remaining = [];
          state.smartSkip = false;
        } else if (!state.remaining.some((x) => ['1', '2'].includes(x))) {
          state.remaining = ['1', '2'];
        }
        await action.update({ components: mutate(), embeds: [embed] });
      }

      if (action.customId === customIds.townHalls && action.isStringSelectMenu()) {
        state.townHalls = action.values;
        await action.update({ components: mutate() });
      }

      if (action.customId === customIds.roles && action.isStringSelectMenu()) {
        state.roles = action.values;
        await action.update({ components: mutate() });
      }

      if (action.customId === customIds.message && action.isButton()) {
        const modalCustomId = this.client.uuid(interaction.user.id);
        const modal = new ModalBuilder().setCustomId(modalCustomId).setTitle('Edit Reminder Message');
        const messageInput = new TextInputBuilder()
          .setCustomId(customIds.modalMessage)
          .setLabel('Reminder Message')
          .setMinLength(1)
          .setMaxLength(1800)
          .setRequired(true)
          .setValue(reminder.message)
          .setStyle(TextInputStyle.Paragraph);
        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(messageInput));
        await action.showModal(modal);

        try {
          await action
            .awaitModalSubmit({
              time: 5 * 60 * 1000,
              filter: (action) => action.customId === modalCustomId
            })
            .then(async (modalSubmit) => {
              state.message = modalSubmit.fields.getTextInputValue(customIds.modalMessage);
              await modalSubmit.deferUpdate();
              await modalSubmit.editReply({ components: mutate(), embeds: [embed] });
            });
        } catch {}
      }

      if (action.customId === customIds.disable && action.isButton()) {
        state.disabled = !state.disabled;
        await action.update({ components: mutate(), embeds: [embed] });
      }

      if (action.customId === customIds.save && action.isButton()) {
        await action.deferUpdate();
        const updated = await this.collection.findOneAndUpdate(
          { _id: reminder._id },
          {
            $set: {
              remaining: state.remaining.map((num) => Number(num)),
              townHalls: state.townHalls.map((num) => Number(num)),
              roles: state.roles,
              warTypes: state.warTypes,
              smartSkip: state.smartSkip,
              silent: state.silent,
              disabled: state.disabled,
              message: state.message,
              duration
            }
          }
        );

        if (updated && updated.duration !== reminder.duration) {
          this.client.clanWarScheduler.reSchedule(updated);
        }

        await action.editReply({
          components: mutate(true),
          content: this.i18n('command.reminders.create.success', { lng: interaction.locale })
        });
      }
    });

    collector.on('end', async (_, reason) => {
      for (const id of Object.values(customIds)) this.client.components.delete(id);
      if (!/delete/i.test(reason)) await interaction.editReply({ components: mutate(true) });
    });
  }

  private getStatic(dur: number) {
    return moment.duration(dur).format('d[d] h[h] m[m]', { trim: 'both mid' });
  }
}
