import {
  ActionRowBuilder,
  AnyThreadChannel,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  CommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  RoleSelectMenuBuilder,
  TextChannel
} from 'discord.js';
import { Args, Command } from '../../lib/handlers.js';
import { Collections, Settings, missingPermissions } from '../../util/constants.js';
import { createInteractionCollector } from '../../util/pagination.js';

export default class SetupUtilsCommand extends Command {
  public constructor() {
    super('setup-server-logs', {
      category: 'setup',
      channel: 'guild',
      userPermissions: ['ManageGuild'],
      clientPermissions: [
        'EmbedLinks',
        'UseExternalEmojis',
        'ManageWebhooks',
        'SendMessagesInThreads',
        'SendMessages',
        'ReadMessageHistory',
        'ViewChannel'
      ],
      defer: true,
      ephemeral: true
    });
  }

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
      /** @deprecated - To be deleted soon. */
      option: string;
      log_type: string;
      channel: TextChannel | AnyThreadChannel;
      disable?: boolean;
    }
  ) {
    const logType = args.option || args.log_type;
    if (logType === 'flag-alert-log') return this.flagAlertLog(interaction, args);
    if (logType === 'roster-changelog') return this.rosterChangeLog(interaction, args);
    if (logType === 'maintenance-break-log') return this.maintenanceBreakLog(interaction, args);

    throw new Error(`Command "${logType}" not found.`);
  }

  public async rosterChangeLog(
    interaction: CommandInteraction<'cached'>,
    args: { channel: TextChannel | AnyThreadChannel; disable?: boolean }
  ) {
    if (args.disable) {
      await this.client.settings.delete(interaction.guild, Settings.ROSTER_CHANGELOG);
      return interaction.editReply({ content: `Roster changelog disabled.` });
    }

    const webhook = await this.client.storage.getWebhook(args.channel.isThread() ? args.channel.parent! : args.channel);
    if (!webhook) {
      return interaction.editReply(
        // eslint-disable-next-line
        this.i18n('command.setup.enable.too_many_webhooks', { lng: interaction.locale, channel: args.channel.toString() })
      );
    }

    await this.client.settings.set(interaction.guild, Settings.ROSTER_CHANGELOG, {
      channelId: args.channel.id,
      webhook: { token: webhook.token, id: webhook.id }
    });

    return interaction.editReply({ content: `Roster changelog set to <#${args.channel.id}>` });
  }

  public async maintenanceBreakLog(
    interaction: CommandInteraction<'cached'>,
    args: { channel: TextChannel | AnyThreadChannel; disable?: boolean }
  ) {
    if (args.disable) {
      await this.client.settings.delete(interaction.guild, Settings.EVENTS_CHANNEL);
      return interaction.editReply({ content: `Maintenance notification channel disabled.` });
    }

    const permission = missingPermissions(args.channel, interaction.guild.members.me!, [
      'ManageWebhooks',
      'ViewChannel',
      'SendMessages',
      'UseExternalEmojis'
    ]);

    if (permission.missing) {
      return interaction.editReply(
        this.i18n('common.missing_access', {
          lng: interaction.locale,
          channel: args.channel.toString(), // eslint-disable-line
          permission: permission.missingPerms
        })
      );
    }

    await this.client.settings.set(interaction.guild, Settings.EVENTS_CHANNEL, args.channel.id);
    return interaction.editReply(`Maintenance notification channel set to <#${args.channel.id}>`);
  }

  public async flagAlertLog(interaction: CommandInteraction<'cached'>, args: { disable?: boolean }) {
    const ChannelTypes: Exclude<ChannelType, ChannelType.DM | ChannelType.GroupDM>[] = [
      ChannelType.GuildText,
      ChannelType.GuildAnnouncement,
      ChannelType.AnnouncementThread,
      ChannelType.PublicThread,
      ChannelType.PrivateThread,
      ChannelType.GuildMedia
    ];

    if (args.disable) {
      await this.client.db.collection(Collections.FLAG_ALERT_LOGS).deleteOne({ guildId: interaction.guildId });
      this.client.rpcHandler.flagAlertLog.del(interaction.guildId);

      return interaction.editReply('Successfully disabled.');
    }

    const flagLog = await this.client.db.collection(Collections.FLAG_ALERT_LOGS).findOne({ guildId: interaction.guildId });

    const state: { channelId: string | null; roleId: string | null; useAutoRole: boolean } = {
      channelId: flagLog?.channelId ?? interaction.channelId,
      roleId: flagLog?.roleId ?? null,
      useAutoRole: flagLog?.useAutoRole ?? false
    };

    const customIds = {
      channel: this.client.uuid(),
      role: this.client.uuid(),
      confirm: this.client.uuid(),
      useAutoRole: this.client.uuid()
    };

    const channelMenu = new ChannelSelectMenuBuilder()
      .addChannelTypes(ChannelTypes)
      .setCustomId(customIds.channel)
      .setPlaceholder('Select flag notification channel');
    if (state.channelId) channelMenu.setDefaultChannels(state.channelId);

    const roleMenu = new RoleSelectMenuBuilder()
      .setCustomId(customIds.role)
      .setPlaceholder('Select flag notification role')
      .setDisabled(state.useAutoRole);
    if (state.roleId) roleMenu.setDefaultRoles(state.roleId);

    const confirmButton = new ButtonBuilder()
      .setStyle(ButtonStyle.Primary)
      .setLabel('Confirm')
      .setCustomId(customIds.confirm)
      .setDisabled(!state.channelId);

    const useAutoRoleButton = new ButtonBuilder()
      .setStyle(ButtonStyle.Secondary)
      .setLabel(state.useAutoRole ? 'Use the Selected Role' : 'Use Clan-Specific Roles')
      .setCustomId(customIds.useAutoRole)
      .setDisabled(!state.channelId);

    const channelRow = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(channelMenu);
    const roleRow = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(roleMenu);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, useAutoRoleButton);

    const getText = () => {
      return [
        '### Setting up Flag Alert Log',
        state.useAutoRole ? '- Roles will be selected based on the AutoRole settings (Leader and Co-Leader only)' : '',
        state.useAutoRole ? '- Only specific Leader and Co-Leader roles will be notified if a banned player joins their clan.' : ''
      ].join('\n');
    };

    const message = await interaction.editReply({
      content: getText(),
      components: [channelRow, roleRow, row]
    });

    const onMutation = async () => {
      if (!state.channelId) return;

      await this.client.db.collection(Collections.FLAG_ALERT_LOGS).updateOne(
        { guildId: interaction.guild.id },
        {
          $set: {
            channelId: state.channelId,
            roleId: state.roleId,
            useAutoRole: state.useAutoRole,
            updatedAt: new Date()
          },
          ...(flagLog && flagLog.channelId !== state.channelId ? { $unset: { webhook: '' } } : {}),
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        { upsert: true }
      );

      return this.client.rpcHandler.flagAlertLog.add(interaction.guildId);
    };

    createInteractionCollector({
      customIds,
      interaction,
      message,
      onRoleSelect: async (action) => {
        state.roleId = action.roles.at(0)?.id ?? null;
        if (state.roleId) roleMenu.setDefaultRoles(state.roleId);

        await action.update({ components: [channelRow, roleRow, row] });
      },
      onChannelSelect: async (action) => {
        state.channelId = action.channels.at(0)!.id;
        if (state.channelId) channelMenu.setDefaultChannels(state.channelId);
        confirmButton.setDisabled(false);

        await action.update({ components: [channelRow, roleRow, row] });
      },
      onClick: async (action) => {
        if (action.customId === customIds.useAutoRole) {
          state.useAutoRole = !state.useAutoRole;
          roleMenu.setDisabled(!state.channelId || state.useAutoRole);
          useAutoRoleButton.setLabel(state.useAutoRole ? 'Use the Selected Role' : 'Use Clan-Specific Roles');
          return action.update({ components: [channelRow, roleRow, row], content: getText() });
        }

        roleMenu.setDisabled(true);
        channelMenu.setDisabled(true);

        const embed = new EmbedBuilder();
        embed.setTitle('Flag Alert Log');
        embed.setColor(this.client.embed(interaction));
        if (state.useAutoRole) {
          embed.setDescription(
            [
              '### Channel',
              `<#${state.channelId!}>`,
              '### Roles',
              'Will be selected from the AutoRole settings (Leader and Co-Leader only)'
            ].join('\n')
          );
        } else {
          embed.setDescription(
            ['### Channel', `<#${state.channelId!}>`, '### Role', `${state.roleId ? `<@&${state.roleId}>` : 'None'}`].join('\n')
          );
        }

        const role = state.roleId && interaction.guild.roles.cache.get(state.roleId);
        const channel = state.channelId && interaction.guild.channels.cache.get(state.channelId);

        if (
          role &&
          !role.mentionable &&
          channel &&
          !channel.permissionsFor(interaction.guild.members.me!).has(PermissionFlagsBits.MentionEveryone)
        ) {
          embed.setFooter({
            text: [
              `If the role is not mentionable, the push notification won't work!`,
              'Either make the role mentionable or grant the bot Mention Everyone permission.'
            ].join('\n')
          });
        }

        await onMutation();
        this.client.settings.set(interaction.guildId, Settings.HAS_FLAG_ALERT_LOG, true);
        await action.update({ embeds: [embed], components: [], content: null });
      }
    });
  }
}
