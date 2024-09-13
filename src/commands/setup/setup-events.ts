import { Collections, URL_REGEX } from '@app/constants';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  ComponentType,
  DiscordjsError,
  DiscordjsErrorCodes,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { Command } from '../../lib/handlers.js';
import { GuildEventData, eventsMap, imageMaps, locationsMap } from '../../struct/guild-events-handler.js';

export default class SetupEventsCommand extends Command {
  public constructor() {
    super('setup-events', {
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

  public async exec(interaction: CommandInteraction<'cached'>, { disable }: { disable?: boolean }) {
    if (disable) {
      await this.client.db.collection(Collections.GUILD_EVENTS).deleteOne({ guildId: interaction.guild.id });
      return interaction.editReply({ content: 'Successfully disabled automatic events schedular.' });
    }

    if (!interaction.guild.members.me?.permissions.has([PermissionFlagsBits.ManageEvents, PermissionFlagsBits.CreateEvents])) {
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

    const value = await this.client.db.collection<GuildEventData>(Collections.GUILD_EVENTS).findOneAndUpdate(
      { guildId: interaction.guild.id },
      {
        $setOnInsert: {
          enabled: false,
          events: {},
          images: {},
          allowedEvents: [...this.client.guildEvents.eventTypes],
          createdAt: new Date()
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

    const getEmbed = (creating = true) => {
      const embed = new EmbedBuilder();
      embed.setColor(this.client.embed(interaction));

      embed.setDescription(
        [
          creating ? '**Creating automatic events schedular...**' : '**Successfully created automatic events schedular...**',
          '',
          '**Enabled Events**',
          ...this.client.guildEvents.eventTypes
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
        ].join('\n')
      );

      if (creating) {
        embed.setFooter({
          text: [
            '- Click the Confirm button to save the events.',
            '- By default the events last for 30 minutes, you can change this by using the following option.'
          ].join('\n')
        });
      }

      return { embeds: [embed] };
    };

    const msg = await interaction.editReply({ ...getEmbed(), components: [menuRow, durationRow, buttonRow] });
    const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
      filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
      time: 10 * 60 * 1000
    });

    collector.on('collect', async (action) => {
      if (action.customId === customIds.confirm) {
        await action.deferUpdate();

        const value = await this.client.db.collection<GuildEventData>(Collections.GUILD_EVENTS).findOneAndUpdate(
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

        await action.editReply({ ...getEmbed(), components: [] });
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
        await action.update({ ...getEmbed(), components: [menuRow, durationRow, buttonRow] });
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
        await action.update({ ...getEmbed(), components: [menuRow, durationRow, buttonRow] });
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
          await modalSubmit.editReply({ ...getEmbed(), components: [menuRow, durationRow, buttonRow] });
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
          await modalSubmit.editReply({ ...getEmbed(), components: [menuRow, durationRow, buttonRow] });
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
}
