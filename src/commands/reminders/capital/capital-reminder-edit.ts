import { Collections } from '@app/constants';
import { RaidRemindersEntity } from '@app/entities';
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

export default class ReminderCreateCommand extends Command {
  public constructor() {
    super('capital-reminder-edit', {
      aliases: ['capital-raids-reminder-edit'],
      category: 'none',
      channel: 'guild',
      userPermissions: ['ManageGuild'],
      clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
      defer: true,
      ephemeral: true
    });
  }

  private get collection() {
    return this.client.db.collection<RaidRemindersEntity>(Collections.RAID_REMINDERS);
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { id: string; duration?: string }) {
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
      if (duration < 15 * 60 * 1000) return interaction.editReply('The duration must be greater than 15 minutes and less than 3 days.');
      if (duration > 3 * 24 * 60 * 60 * 1000) {
        return interaction.editReply('The duration must be greater than 15 minutes and less than 3 days.');
      }
    }

    const customIds = {
      roles: this.client.uuid(interaction.user.id),
      remaining: this.client.uuid(interaction.user.id),
      minThreshold: this.client.uuid(interaction.user.id),
      clans: this.client.uuid(interaction.user.id),
      save: this.client.uuid(interaction.user.id),
      memberType: this.client.uuid(interaction.user.id),
      message: this.client.uuid(interaction.user.id),
      modalMessage: this.client.uuid(interaction.user.id)
    };

    const state = {
      remaining: reminder.remaining.map((r) => r.toString()),
      allMembers: reminder.allMembers,
      roles: reminder.roles,
      message: reminder.message,
      minThreshold: reminder.minThreshold
    };

    const embed = new EmbedBuilder();
    const mutate = (disable = false) => {
      embed.setDescription(
        [`**Edit Raid Attack Reminder (${this.getStatic(duration)} remaining)** <#${reminder.channel}>`, '', `${reminder.message}`].join(
          '\n'
        )
      );
      embed.setFooter({
        text: [clans.map((clan) => `${clan.name} (${clan.tag})`).join(', ')].join('\n')
      });

      const remAttackRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setPlaceholder('Select Min. Attacks Threshold')
          .setCustomId(customIds.minThreshold)
          .setOptions(
            Array(6)
              .fill(0)
              .map((_, i) => ({
                label: `${i + 1} minimum attack${i === 0 ? '' : 's'}${i === 5 ? ` (if eligible)` : ''}`,
                value: (i + 1).toString(),
                default: state.minThreshold === i + 1
              }))
          )
          .setDisabled(disable)
      );

      const minAttackRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setPlaceholder('Select Min. Attacks Done')
          .setMaxValues(1)
          .setCustomId(customIds.memberType)
          .setOptions([
            {
              label: 'All Members',
              value: 'allMembers',
              description: 'With a minimum of 0 attacks done (@ping non-participants)',
              default: state.allMembers
            },
            {
              label: 'Only Participants',
              value: 'onlyParticipants',
              description: 'With a minimum of 1 attack done (@ping participants only)',
              default: !state.allMembers
            }
          ])
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

      const buttonRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(customIds.message)
            .setLabel('Set Custom Message')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disable)
        )
        .addComponents(new ButtonBuilder().setCustomId(customIds.save).setLabel('Save').setStyle(ButtonStyle.Primary).setDisabled(disable));

      return [remAttackRow, minAttackRow, clanRolesRow, buttonRow];
    };

    const clans = await this.client.storage.search(interaction.guildId, reminder.clans);
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
      if (action.customId === customIds.remaining && action.isStringSelectMenu()) {
        state.remaining = action.values;
        await action.update({ components: mutate(), embeds: [embed] });
      }

      if (action.customId === customIds.minThreshold && action.isStringSelectMenu()) {
        state.minThreshold = Number(action.values.at(0));
        await action.update({ components: mutate(), embeds: [embed] });
      }

      if (action.customId === customIds.roles && action.isStringSelectMenu()) {
        state.roles = action.values;
        await action.update({ components: mutate() });
      }

      if (action.customId === customIds.memberType && action.isStringSelectMenu()) {
        state.allMembers = action.values.includes('allMembers');
        await action.update({ components: mutate() });
      }

      if (action.customId === customIds.message && action.isButton()) {
        const modalCustomId = this.client.uuid(interaction.user.id);
        const modal = new ModalBuilder().setCustomId(modalCustomId).setTitle('Edit Reminder Message');
        const messageInput = new TextInputBuilder()
          .setCustomId(customIds.modalMessage)
          .setLabel('Reminder Message')
          .setMinLength(1)
          .setMaxLength(1000)
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
              await modalSubmit.editReply({
                components: mutate(),
                embeds: [embed]
              });
            });
        } catch {}
      }

      if (action.customId === customIds.save && action.isButton()) {
        await action.deferUpdate();
        const updated = await this.collection.findOneAndUpdate(
          { _id: reminder._id },
          {
            $set: {
              remaining: state.remaining.map((num) => Number(num)),
              roles: state.roles,
              allMembers: state.allMembers,
              message: state.message.trim(),
              duration
            }
          },
          { returnDocument: 'after' }
        );

        if (updated && reminder.duration !== duration) {
          this.client.capitalRaidScheduler.reSchedule(updated);
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
