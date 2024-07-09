import {
  ActionRowBuilder,
  AnyThreadChannel,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  CommandInteraction,
  ComponentType,
  DiscordjsError,
  DiscordjsErrorCodes,
  EmbedBuilder,
  Guild,
  ModalBuilder,
  PermissionFlagsBits,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  TextChannel,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { Args, Command } from '../../lib/index.js';
import { GuildEventData, eventsMap, imageMaps, locationsMap } from '../../struct/guild-events-handler.js';
import { Collections, Settings, URL_REGEX, missingPermissions } from '../../util/constants.js';
import { createInteractionCollector } from '../../util/pagination.js';

export default class SetupUtilsCommand extends Command {
  public constructor() {
    super('setup-utility', {
      category: 'none',
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
    args: { option: string; channel: TextChannel | AnyThreadChannel; disable?: boolean }
  ) {
    if (['role-refresh-button', 'link-button'].includes(args.option)) {
      const command = this.handler.getCommand('setup-buttons');
      if (!command) throw new Error(`Command "${args.option}" not found.`);
      return command.exec(interaction, args);
    }

    if (args.option === 'events-schedular') return this.handleEvents(interaction, args);
    if (args.option === 'flag-alert-log') return this.flagAlertLog(interaction, args);
    if (args.option === 'roster-changelog') return this.rosterChangeLog(interaction, args);
    if (args.option === 'reminder-ping-exclusion') return this.reminderPingExclusion(interaction, args);
    if (args.option === 'maintenance-notification-channel') return this.maintenanceNotificationChannel(interaction, args);

    throw new Error(`Command "${args.option}" not found.`);
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

  public async maintenanceNotificationChannel(
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

  public async reminderPingExclusion(
    interaction: CommandInteraction<'cached'>,
    args: { channel: TextChannel | AnyThreadChannel; disable?: boolean }
  ) {
    if (args.disable) {
      await this.client.settings.delete(interaction.guild, Settings.REMINDER_EXCLUSION);
      return interaction.editReply({ content: `Reminder ping exclusion disabled.` });
    }

    const config = this.client.settings.get<Record<string, string>>(interaction.guild, Settings.REMINDER_EXCLUSION, {
      type: 'optIn'
    });
    const customIds = {
      wars: this.client.uuid(interaction.user.id),
      raids: this.client.uuid(interaction.user.id),
      games: this.client.uuid(interaction.user.id),
      type: this.client.uuid(interaction.user.id),
      done: this.client.uuid(interaction.user.id)
    };
    const clanWarRemRole = new RoleSelectMenuBuilder().setMinValues(0).setCustomId(customIds.wars);
    const capitalRemRole = new RoleSelectMenuBuilder().setMinValues(0).setCustomId(customIds.raids);
    const clanGamesRemRole = new RoleSelectMenuBuilder().setMinValues(0).setCustomId(customIds.games);
    const clanWarRoleRow = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(clanWarRemRole);
    const capitalRaidRoleRow = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(capitalRemRole);
    const clanGamesRoleRow = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(clanGamesRemRole);

    const optInOutButton = new ButtonBuilder()
      .setStyle(ButtonStyle.Success)
      .setLabel(`Use ${config.type === 'optIn' ? 'OptOut' : 'OptIn'} Mode`)
      .setCustomId(customIds.type);
    const doneButton = new ButtonBuilder().setStyle(ButtonStyle.Primary).setLabel('Done').setCustomId(customIds.done);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(optInOutButton, doneButton);

    const mutate = () => {
      const config = this.client.settings.get<Record<string, string>>(interaction.guild, Settings.REMINDER_EXCLUSION, {
        type: 'optIn'
      });

      clanWarRemRole.setPlaceholder(`Clan War Reminder ${config.type === 'optIn' ? 'OptIn' : 'OptOut'} Role`);
      capitalRemRole.setPlaceholder(`Capital Raid Reminder ${config.type === 'optIn' ? 'OptIn' : 'OptOut'} Role`);
      clanGamesRemRole.setPlaceholder(`Clan Games Reminder ${config.type === 'optIn' ? 'OptIn' : 'OptOut'} Role`);

      const embed = new EmbedBuilder().setDescription(
        [
          `### Reminder Ping Exclusion Settings`,
          '\u200b',
          `**Clans Wars**`,
          `${config.wars ? `<@&${config.wars}>` : 'None'}`,
          '',
          `**Capital Raids**`,
          `${config.raids ? `<@&${config.raids}>` : 'None'}`,
          '',
          `**Clan Games**`,
          `${config.games ? `<@&${config.games}>` : 'None'}`,
          '',
          `**${config.type === 'optIn' ? 'OptIn' : 'OptOut'} Mode**`,
          config.type === 'optIn'
            ? 'Anyone **without** these roles will **not** be pinged in the reminders.'
            : 'Anyone **with** these roles will **not** be pinged in the reminders.'
        ].join('\n')
      );
      return embed;
    };
    const embed = mutate();

    const message = await interaction.editReply({
      embeds: [embed],
      components: [clanWarRoleRow, capitalRaidRoleRow, clanGamesRoleRow, row]
    });

    createInteractionCollector({
      message,
      interaction,
      customIds,
      onRoleSelect: async (action) => {
        const config = this.client.settings.get<Partial<ExclusionConfig>>(interaction.guild, Settings.REMINDER_EXCLUSION, {
          type: 'optIn'
        });
        const role = action.roles.first();

        if (action.customId === customIds.wars) {
          if (role) config.wars = role.id;
          else delete config.wars;
        }
        if (action.customId === customIds.raids) {
          if (role) config.raids = role.id;
          else delete config.raids;
        }
        if (action.customId === customIds.games) {
          if (role) config.games = role.id;
          else delete config.games;
        }
        await this.client.settings.set(interaction.guild, Settings.REMINDER_EXCLUSION, config);

        const embed = mutate();
        return action.update({ components: [clanWarRoleRow, capitalRaidRoleRow, clanGamesRoleRow, row], embeds: [embed] });
      },
      onClick: async (action) => {
        if (action.customId === customIds.type) {
          const config = this.client.settings.get<Partial<ExclusionConfig>>(interaction.guild, Settings.REMINDER_EXCLUSION, {
            type: 'optIn'
          });

          optInOutButton.setLabel(`Use ${config.type === 'optIn' ? 'OptOut' : 'OptIn'} Mode`);
          await this.client.settings.set(interaction.guild, Settings.REMINDER_EXCLUSION, {
            ...config,
            type: config.type === 'optIn' ? 'optOut' : 'optIn'
          });

          const embed = mutate();
          return action.update({ components: [clanWarRoleRow, capitalRaidRoleRow, clanGamesRoleRow, row], embeds: [embed] });
        }

        if (action.customId === customIds.done) {
          await action.update({ embeds: [embed], components: [] });
          return this.updateExclusionList(action.guild);
        }
      }
    });

    return this.updateExclusionList(interaction.guild);
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

  public async handleEvents(
    interaction: CommandInteraction<'cached'>,
    { disable, max_duration }: { disable?: boolean; max_duration?: number }
  ) {
    if (disable) {
      await this.client.db.collection(Collections.GUILD_EVENTS).deleteOne({ guildId: interaction.guild.id });
      return interaction.editReply({ content: 'Successfully disabled automatic events schedular.' });
    }

    if (!interaction.guild.members.me?.permissions.has([PermissionFlagsBits.ManageEvents, 1n << 44n])) {
      return interaction.editReply({
        content: "I'm missing **Create Events** and **Manage Events** permissions to execute this command."
      });
    }

    const customIds = {
      select: this.client.uuid(interaction.user.id),
      images: this.client.uuid(interaction.user.id),
      locations: this.client.uuid(interaction.user.id),
      duration: this.client.uuid(interaction.user.id),
      confirm: this.client.uuid(interaction.user.id),

      clan_games: this.client.uuid(interaction.user.id),
      capital_raids: this.client.uuid(interaction.user.id),
      cwl: this.client.uuid(interaction.user.id),
      season_reset: this.client.uuid(interaction.user.id)
    };

    const { value } = await this.client.db.collection<GuildEventData>(Collections.GUILD_EVENTS).findOneAndUpdate(
      { guildId: interaction.guild.id },
      {
        $setOnInsert: {
          enabled: false,
          events: {},
          images: {},
          allowedEvents: [...this.client.guildEvents.eventTypes],
          createdAt: new Date()
        },
        $set: {
          maxDuration: max_duration ?? 30
        }
      },
      { upsert: true, returnDocument: 'after' }
    );

    const state = {
      allowedEvents: value?.allowedEvents ?? [],
      durationOverrides: value?.durationOverrides ?? [],

      clan_games_image_url: value?.images?.clan_games_image_url ?? '',
      raid_week_image_url: value?.images?.raid_week_image_url ?? '',
      cwl_image_url: value?.images?.cwl_image_url ?? '',
      season_reset_image_url: value?.images?.season_reset_image_url ?? '',

      clan_games_location: value?.locations?.clan_games_location ?? null,
      raid_week_location: value?.locations?.raid_week_location ?? null,
      cwl_location: value?.locations?.cwl_location ?? null,
      season_reset_location: value?.locations?.season_reset_location ?? null
    };

    const menu = new StringSelectMenuBuilder()
      .setCustomId(customIds.select)
      .setPlaceholder('Select allowed events...')
      .setOptions(
        this.client.guildEvents.eventTypes.map((id) => ({
          label: eventsMap[id],
          value: id,
          default: state.allowedEvents.includes(id)
        }))
      )
      .setMinValues(1)
      .setMaxValues(this.client.guildEvents.eventTypes.length);

    const durationEvents = this.client.guildEvents.eventTypes.filter((name) => name.endsWith('_start'));
    const durationMenu = new StringSelectMenuBuilder()
      .setCustomId(customIds.duration)
      .setPlaceholder('Allowed full duration events...')
      .setOptions(
        durationEvents.map((id) => ({
          label: eventsMap[id],
          value: id,
          description: `The event stays until the end of the ${eventsMap[id]}`,
          default: state.durationOverrides.includes(id)
        }))
      )
      .setMinValues(0)
      .setMaxValues(durationEvents.length);

    const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(menu);
    const durationRow = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(durationMenu);
    const buttonRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder().setCustomId(customIds.confirm).setLabel('Confirm').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(customIds.images).setLabel('Set Images').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(customIds.locations).setLabel('Set Locations').setStyle(ButtonStyle.Secondary)
    );

    const getContent = () => {
      return [
        '**Creating automatic events schedular...**',
        '',
        '**Enabled Events**',
        this.client.guildEvents.eventTypes
          .filter((event) => state.allowedEvents.includes(event))
          .map((event) => {
            const eventName = state[imageMaps[event] as unknown as keyof typeof state]
              ? `[${eventsMap[event]}](<${state[imageMaps[event] as keyof typeof state] as string}>)`
              : `${eventsMap[event]}`;
            const location = state[locationsMap[event] as unknown as keyof typeof state]
              ? `${state[locationsMap[event] as keyof typeof state] as string}`
              : null;
            return `- ${eventName}${location ? `\n  - ${location}` : ''}`;
          })
          .join('\n'),

        '',
        '- *Click the Confirm button to save the events.*',
        '- *By default the events last for 30 minutes, you can change this by using the following option.*'
      ].join('\n');
    };

    const msg = await interaction.editReply({ content: getContent(), components: [menuRow, durationRow, buttonRow] });
    const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
      filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
      time: 10 * 60 * 1000
    });

    collector.on('collect', async (action) => {
      if (action.customId === customIds.confirm) {
        await action.deferUpdate();

        const { value } = await this.client.db.collection<GuildEventData>(Collections.GUILD_EVENTS).findOneAndUpdate(
          { guildId: interaction.guild.id },
          {
            $set: {
              images: {
                clan_games_image_url: state.clan_games_image_url,
                raid_week_image_url: state.raid_week_image_url,
                cwl_image_url: state.cwl_image_url,
                season_reset_image_url: state.season_reset_image_url
              },
              locations: {
                clan_games_location: state.clan_games_location,
                raid_week_location: state.raid_week_location,
                cwl_location: state.cwl_location,
                season_reset_location: state.season_reset_location
              },
              enabled: true,
              allowedEvents: [...state.allowedEvents],
              durationOverrides: [...state.durationOverrides]
            }
          },
          { returnDocument: 'after' }
        );

        if (!value) {
          await action.editReply({
            content: 'Event schedular was deleted while you were configuring it.',
            components: []
          });
          return;
        }

        await this.client.guildEvents.create(interaction.guild, value);

        const content = getContent().split('\n');
        await action.editReply({
          content: ['**Successfully created automatic events schedular...**', ...content.slice(1, content.length - 1)].join('\n'),
          components: []
        });
      }

      if (action.customId === customIds.select && action.isStringSelectMenu()) {
        state.allowedEvents = [...action.values];
        menu.setOptions(
          this.client.guildEvents.eventTypes.map((id) => ({
            label: eventsMap[id],
            value: id,
            description: `The event stays until the end of the ${eventsMap[id]}`,
            default: state.allowedEvents.includes(id)
          }))
        );
        await action.update({ content: getContent(), components: [menuRow, durationRow, buttonRow] });
      }

      if (action.customId === customIds.duration && action.isStringSelectMenu()) {
        state.durationOverrides = [...action.values];
        durationMenu.setOptions(
          durationEvents.map((id) => ({
            label: eventsMap[id],
            value: id,
            default: state.durationOverrides.includes(id)
          }))
        );
        await action.update({ content: getContent(), components: [menuRow, durationRow, buttonRow] });
      }

      if (action.customId === customIds.images) {
        const modalCustomId = this.client.uuid(action.user.id);
        const modal = new ModalBuilder().setCustomId(modalCustomId).setTitle('Custom Images');
        const seasonResetImageInput = new TextInputBuilder()
          .setCustomId(customIds.season_reset)
          .setLabel('Season Reset Image URL')
          .setPlaceholder('Enter Season Reset image URL')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(256)
          .setRequired(false);
        if (state.season_reset_image_url) seasonResetImageInput.setValue(state.season_reset_image_url);

        const clanGamesImageInput = new TextInputBuilder()
          .setCustomId(customIds.clan_games)
          .setLabel('Clan Games Image URL')
          .setPlaceholder('Enter Clan Games image URL')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(256)
          .setRequired(false);
        if (state.clan_games_image_url) clanGamesImageInput.setValue(state.clan_games_image_url);

        const cwlImageInput = new TextInputBuilder()
          .setCustomId(customIds.cwl)
          .setLabel('CWL Image URL')
          .setPlaceholder('Enter CWL image URL')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(256)
          .setRequired(false);
        if (state.cwl_image_url) cwlImageInput.setValue(state.cwl_image_url);

        const capitalRaidImageInput = new TextInputBuilder()
          .setCustomId(customIds.capital_raids)
          .setLabel('Capital Raid Image URL')
          .setPlaceholder('Enter Capital Raid image URL')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(256)
          .setRequired(false);
        if (state.raid_week_image_url) capitalRaidImageInput.setValue(state.raid_week_image_url);

        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(seasonResetImageInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(cwlImageInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(capitalRaidImageInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(clanGamesImageInput)
        );

        await action.showModal(modal);

        try {
          const modalSubmit = await action.awaitModalSubmit({
            time: 10 * 60 * 1000,
            filter: (action) => action.customId === modalCustomId
          });

          const season_reset_image_url = modalSubmit.fields.getTextInputValue(customIds.season_reset);
          const cwl_image_url = modalSubmit.fields.getTextInputValue(customIds.cwl);
          const raid_week_image_url = modalSubmit.fields.getTextInputValue(customIds.capital_raids);
          const clan_games_image_url = modalSubmit.fields.getTextInputValue(customIds.clan_games);

          state.season_reset_image_url = URL_REGEX.test(season_reset_image_url) ? season_reset_image_url : '';
          state.cwl_image_url = URL_REGEX.test(cwl_image_url) ? cwl_image_url : '';
          state.raid_week_image_url = URL_REGEX.test(raid_week_image_url) ? raid_week_image_url : '';
          state.clan_games_image_url = URL_REGEX.test(clan_games_image_url) ? clan_games_image_url : '';

          await modalSubmit.deferUpdate();
          await modalSubmit.editReply({ content: getContent(), components: [menuRow, durationRow, buttonRow] });
        } catch (e) {
          if (!(e instanceof DiscordjsError && e.code === DiscordjsErrorCodes.InteractionCollectorError)) {
            throw e;
          }
        }
      }

      if (action.customId === customIds.locations) {
        const modalCustomId = this.client.uuid(action.user.id);
        const modal = new ModalBuilder().setCustomId(modalCustomId).setTitle('Event Locations');
        const seasonResetLocationInput = new TextInputBuilder()
          .setCustomId(customIds.season_reset)
          .setLabel('Season Reset Location')
          .setPlaceholder('Add a location, link, or something.')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(100)
          .setRequired(false);
        if (state.season_reset_location) seasonResetLocationInput.setValue(state.season_reset_location);

        const clanGamesLocationInput = new TextInputBuilder()
          .setCustomId(customIds.clan_games)
          .setLabel('Clan Games Location')
          .setPlaceholder('Add a location, link, or something.')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(100)
          .setRequired(false);
        if (state.clan_games_location) clanGamesLocationInput.setValue(state.clan_games_location);

        const cwlLocationInput = new TextInputBuilder()
          .setCustomId(customIds.cwl)
          .setLabel('CWL Location')
          .setPlaceholder('Add a location, link, or something.')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(100)
          .setRequired(false);
        if (state.cwl_location) cwlLocationInput.setValue(state.cwl_location);

        const capitalRaidLocationInput = new TextInputBuilder()
          .setCustomId(customIds.capital_raids)
          .setLabel('Capital Raid Location')
          .setPlaceholder('Add a location, link, or something.')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(100)
          .setRequired(false);
        if (state.raid_week_location) capitalRaidLocationInput.setValue(state.raid_week_location);

        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(seasonResetLocationInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(cwlLocationInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(capitalRaidLocationInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(clanGamesLocationInput)
        );

        await action.showModal(modal);

        try {
          const modalSubmit = await action.awaitModalSubmit({
            time: 10 * 60 * 1000,
            filter: (action) => action.customId === modalCustomId
          });
          const season_reset_location = modalSubmit.fields.getTextInputValue(customIds.season_reset);
          const cwl_location = modalSubmit.fields.getTextInputValue(customIds.cwl);
          const raid_week_location = modalSubmit.fields.getTextInputValue(customIds.capital_raids);
          const clan_games_location = modalSubmit.fields.getTextInputValue(customIds.clan_games);

          state.season_reset_location = season_reset_location || null;
          state.cwl_location = cwl_location || null;
          state.raid_week_location = raid_week_location || null;
          state.clan_games_location = clan_games_location || null;

          await modalSubmit.deferUpdate();
          await modalSubmit.editReply({ content: getContent(), components: [menuRow, durationRow, buttonRow] });
        } catch (e) {
          if (!(e instanceof DiscordjsError && e.code === DiscordjsErrorCodes.InteractionCollectorError)) {
            throw e;
          }
        }
      }
    });

    collector.on('end', async (_, reason) => {
      Object.values(customIds).forEach((id) => this.client.components.delete(id));
      if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
    });
  }

  private async updateExclusionList(guild: Guild) {
    const config = this.client.settings.get<{
      type: 'optIn' | 'optOut';
      wars: string;
      games: string;
      raids: string;
      raidsExclusionUserIds: string[];
      gamesExclusionUserIds: string[];
      warsExclusionUserIds: string[];
    }>(guild, Settings.REMINDER_EXCLUSION, { type: 'optIn' });

    if (!config.wars && !config.raids && !config.games) return;

    const members = await guild.members.fetch().catch(() => null);
    if (!members) return null;

    if (config.wars) {
      const userIds = members.filter((mem) => mem.roles.cache.has(config.wars)).map((mem) => mem.id);
      config.warsExclusionUserIds = userIds;
    }

    if (config.games) {
      const userIds = members.filter((mem) => mem.roles.cache.has(config.games)).map((mem) => mem.id);
      config.gamesExclusionUserIds = userIds;
    }

    if (config.raids) {
      const userIds = members.filter((mem) => mem.roles.cache.has(config.raids)).map((mem) => mem.id);
      config.raidsExclusionUserIds = userIds;
    }

    return this.client.settings.set(guild, Settings.REMINDER_EXCLUSION, config);
  }
}

interface ExclusionConfig {
  type: 'optIn' | 'optOut';
  wars: string;
  games: string;
  raids: string;
  raidsExclusionUserIds: string[];
  gamesExclusionUserIds: string[];
  warsExclusionUserIds: string[];
}
