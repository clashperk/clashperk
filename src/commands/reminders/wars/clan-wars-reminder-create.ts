import { Collections, FeatureFlags, MAX_TOWN_HALL_LEVEL, missingPermissions } from '@app/constants';
import { ClanWarRemindersEntity } from '@app/entities';
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

// 24h (Battle Day)
// 47h (War Declared)
// 0m (War Ended)

export default class ClanWarsReminderCreateCommand extends Command {
  public constructor() {
    super('clan-wars-reminder-create', {
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
    args: {
      duration: string;
      message: string;
      channel: TextChannel | AnyThreadChannel;
      clans?: string;
      exclude_participant_list?: boolean;
    }
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
      .collection<ClanWarRemindersEntity>(Collections.WAR_REMINDERS)
      .countDocuments({ guild: interaction.guild.id });

    const totalClans = await this.client.storage.getTotalClans(interaction.guild.id);
    if (reminders >= Math.max(totalClans * 5, 25) && !this.client.patreonHandler.get(interaction.guild.id)) {
      return interaction.editReply(this.i18n('command.reminders.create.max_limit', { lng: interaction.locale }));
    }

    if (!/\d+?\.?\d+?[dhm]|\d[dhm]/g.test(args.duration)) {
      return interaction.editReply(this.i18n('command.reminders.create.invalid_duration_format', { lng: interaction.locale }));
    }

    const dur = args.duration.match(/\d+?\.?\d+?[dhm]|\d[dhm]/g)!.reduce((acc, cur) => acc + ms(cur), 0);
    if (!args.message) return interaction.editReply(this.i18n('command.reminders.no_message', { lng: interaction.locale }));

    if (dur < 15 * 60 * 1000 && dur !== 0) {
      return interaction.editReply(this.i18n('command.reminders.create.duration_limit', { lng: interaction.locale }));
    }
    if (dur > 48 * 60 * 60 * 1000) {
      return interaction.editReply(this.i18n('command.reminders.create.duration_limit', { lng: interaction.locale }));
    }
    if (dur % (15 * 60 * 1000) !== 0) {
      return interaction.editReply(this.i18n('command.reminders.create.duration_order', { lng: interaction.locale }));
    }

    const customIds = {
      roles: this.client.uuid(interaction.user.id),
      townHalls: this.client.uuid(interaction.user.id),
      remaining: this.client.uuid(interaction.user.id),
      clans: this.client.uuid(interaction.user.id),
      save: this.client.uuid(interaction.user.id),
      warType: this.client.uuid(interaction.user.id),
      message: this.client.uuid(interaction.user.id),
      modalMessage: this.client.uuid(interaction.user.id)
    };

    const randomDonators = (await this.client.isFeatureEnabled(FeatureFlags.RANDOM_DONATOR, interaction.guild.id))
      ? ['1-d', '2-d', '3-d', '5-d', '10-d']
      : [];

    const state = {
      remaining: ['1', '2'],
      townHalls: Array(MAX_TOWN_HALL_LEVEL - 1)
        .fill(0)
        .map((_, i) => (i + 2).toString()),
      smartSkip: false,
      silent: args.exclude_participant_list || [48 * 60 * 60 * 1000, 24 * 60 * 60 * 1000, 0].includes(dur),
      roles: ['leader', 'coLeader', 'admin', 'member'],
      warTypes: ['cwl', 'normal', 'friendly'],
      clans: clans.map((clan) => clan.tag),
      message: args.message,
      randomDonators: null as number | null
    };
    if (state.silent) state.remaining = [];

    const embed = new EmbedBuilder();
    const mutate = (disable = false) => {
      embed.setDescription(
        [
          `**Setup War Reminder (${dur === 0 ? 'at the end' : `${this.getStatic(dur)} remaining`})** <#${args.channel.id}>`,

          !interaction.options.resolved?.roles?.size && state.silent
            ? '\n*This reminder will not notify any individuals for the remaining attacks. \nPlease include some roles within the reminder message to receive notifications.*\n'
            : '',
          `${state.message}`
        ].join('\n')
      );
      embed.setFooter({
        text: [clans.map((clan) => `${clan.name} (${clan.tag})`).join(', ')].join('\n')
      });

      const warTypeRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setPlaceholder('Select War Types')
          .setMaxValues(3)
          .setCustomId(customIds.warType)
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
          .setMaxValues(4)
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
            },
            ...randomDonators.map((num) => ({
              label: `${num} Donators`,
              value: num,
              default: state.randomDonators === +num.replace('-d', '')
            }))
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
        .addComponents(new ButtonBuilder().setCustomId(customIds.save).setLabel('Save').setStyle(ButtonStyle.Primary).setDisabled(disable));

      if (dur === 0) {
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
      if (action.customId === customIds.warType && action.isStringSelectMenu()) {
        state.warTypes = action.values;
        await action.update({ components: mutate() });
      }

      if (action.customId === customIds.remaining && action.isStringSelectMenu()) {
        state.remaining = action.values.filter((v) => !['smartSkip', 'silent', ...randomDonators].includes(v));
        state.smartSkip = action.values.includes('smartSkip');
        state.silent = action.values.includes('silent');
        state.randomDonators = randomDonators.reduce((num, v) => {
          if (!action.values.includes(v)) return num;
          return Math.max(num, +v.replace('-d', ''));
        }, 0);

        if (state.silent) {
          state.remaining = [];
          state.smartSkip = false;
          state.randomDonators = null;
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
        const reminder: ClanWarRemindersEntity = {
          _id: new ObjectId(),
          guild: interaction.guild.id,
          channel: args.channel.id,
          disabled: false,
          remaining: state.remaining.map((num) => Number(num)),
          townHalls: state.townHalls.map((num) => Number(num)),
          roles: state.roles,
          randomLimit: state.randomDonators,
          clans: state.clans,
          silent: state.silent,
          smartSkip: state.smartSkip,
          webhook: { id: webhook.id, token: webhook.token! },
          warTypes: state.warTypes,
          message: state.message.trim(),
          duration: dur,
          createdAt: new Date()
        };

        const { insertedId } = await this.client.db.collection(Collections.WAR_REMINDERS).insertOne(reminder);
        this.client.clanWarScheduler.create({ ...reminder, _id: insertedId });
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
