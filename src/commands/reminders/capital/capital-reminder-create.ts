import { Collections, missingPermissions } from '@app/constants';
import { RaidRemindersEntity } from '@app/entities';
import {
  ActionRowBuilder,
  AnyThreadChannel,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  ComponentType,
  EmbedBuilder,
  ModalBuilder,
  PermissionsString,
  StringSelectMenuBuilder,
  TextChannel,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import moment from 'moment';
import { ObjectId } from 'mongodb';
import ms from 'ms';
import { Args, Command } from '../../../lib/handlers.js';

export default class ReminderCreateCommand extends Command {
  public constructor() {
    super('capital-reminder-create', {
      aliases: ['capital-raids-reminder-create'],
      category: 'none',
      channel: 'guild',
      userPermissions: ['ManageGuild'],
      clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
      defer: true,
      ephemeral: true
    });
  }

  private readonly permissions: PermissionsString[] = [
    'EmbedLinks',
    'UseExternalEmojis',
    'SendMessages',
    'ReadMessageHistory',
    'ManageWebhooks',
    'ViewChannel'
  ];

  public args(interaction: CommandInteraction<'cached'>): Args {
    return {
      channel: {
        match: 'CHANNEL',
        default: interaction.channel!
      }
    };
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: { duration: string; message: string; channel: TextChannel | AnyThreadChannel; clans?: string }
  ) {
    const { clans } = await this.client.storage.handleSearch(interaction, { args: args.clans, required: true });
    if (!clans) return;

    const permission = missingPermissions(args.channel, interaction.guild.members.me!, this.permissions);
    if (permission.missing) {
      return interaction.editReply(
        this.i18n('common.missing_access', {
          lng: interaction.locale,
          channel: args.channel.toString(),
          permission: permission.missingPerms
        })
      );
    }

    const webhook = await this.client.storage.getWebhook(args.channel.isThread() ? args.channel.parent! : args.channel);
    if (!webhook) {
      return interaction.editReply(this.i18n('common.too_many_webhooks', { lng: interaction.locale, channel: args.channel.toString() }));
    }

    const reminders = await this.client.db
      .collection<RaidRemindersEntity>(Collections.RAID_REMINDERS)
      .countDocuments({ guild: interaction.guild.id });
    if (reminders >= 25 && !this.client.patreonHandler.get(interaction.guild.id)) {
      return interaction.editReply(this.i18n('command.reminders.create.max_limit', { lng: interaction.locale }));
    }
    if (!/\d+?\.?\d+?[dhm]|\d[dhm]/g.test(args.duration)) {
      return interaction.editReply('The duration must be in a valid format. e.g. 30m 2h, 1h30m, 1d, 2d1h');
    }

    const dur = args.duration.match(/\d+?\.?\d+?[dhm]|\d[dhm]/g)!.reduce((acc, cur) => acc + ms(cur), 0);
    if (!args.message) return interaction.editReply(this.i18n('command.reminders.no_message', { lng: interaction.locale }));

    if (dur < 15 * 60 * 1000) return interaction.editReply('The duration must be greater than 15 minutes and less than 3 days.');
    if (dur > 3 * 24 * 60 * 60 * 1000) {
      return interaction.editReply('The duration must be greater than 15 minutes and less than 3 days.');
    }

    const customIds = {
      roles: this.client.uuid(interaction.user.id),
      townHalls: this.client.uuid(interaction.user.id),
      remaining: this.client.uuid(interaction.user.id),
      clans: this.client.uuid(interaction.user.id),
      save: this.client.uuid(interaction.user.id),
      memberType: this.client.uuid(interaction.user.id),
      minThreshold: this.client.uuid(interaction.user.id),
      message: this.client.uuid(interaction.user.id),
      modalMessage: this.client.uuid(interaction.user.id)
    };

    const state = {
      remaining: ['1', '2', '3', '4', '5', '6'],
      allMembers: true,
      minThreshold: 5,
      roles: ['leader', 'coLeader', 'admin', 'member'],
      clans: clans.map((clan) => clan.tag),
      message: args.message
    };

    const embed = new EmbedBuilder();
    const mutate = (disable = false) => {
      embed.setDescription(
        [`**Setup Raid Attack Reminder (${this.getStatic(dur)} remaining)** <#${args.channel.id}>`, '', `${state.message}`].join('\n')
      );
      embed.setFooter({
        text: [clans.map((clan) => `${clan.name} (${clan.tag})`).join(', ')].join('\n')
      });

      const row1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setPlaceholder('Select Min. Attack Threshold')
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

      const row2 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
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

      const row3 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
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

      const row4 = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(customIds.message)
            .setLabel('Edit Reminder Message')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disable)
        )
        .addComponents(new ButtonBuilder().setCustomId(customIds.save).setLabel('Save').setStyle(ButtonStyle.Primary).setDisabled(disable));

      return [row1, row2, row3, row4];
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
      if (action.customId === customIds.remaining && action.isStringSelectMenu()) {
        state.remaining = action.values;
        await action.update({ components: mutate() });
      }

      if (action.customId === customIds.minThreshold && action.isStringSelectMenu()) {
        state.minThreshold = Number(action.values.at(0));
        await action.update({ components: mutate() });
      }

      if (action.customId === customIds.roles && action.isStringSelectMenu()) {
        state.roles = action.values;
        await action.update({ components: mutate() });
      }

      if (action.customId === customIds.memberType && action.isStringSelectMenu()) {
        state.allMembers = action.values.includes('allMembers');
        await action.update({ components: mutate() });
      }

      if (action.customId === customIds.clans && action.isStringSelectMenu()) {
        state.clans = action.values;
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
          .setValue(state.message)
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

      if (action.customId === customIds.save && action.isButton()) {
        await action.deferUpdate();
        const reminder = {
          // TODO: remove this
          _id: new ObjectId(),
          guild: interaction.guild.id,
          channel: args.channel.id,
          remaining: state.remaining.map((num) => Number(num)),
          roles: state.roles,
          minThreshold: state.minThreshold,
          allMembers: state.allMembers,
          clans: state.clans,
          webhook: { id: webhook.id, token: webhook.token! },
          message: state.message.trim(),
          duration: dur,
          createdAt: new Date()
        };

        const { insertedId } = await this.client.db.collection<RaidRemindersEntity>(Collections.RAID_REMINDERS).insertOne(reminder);
        this.client.capitalRaidScheduler.create({ ...reminder, _id: insertedId });
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
