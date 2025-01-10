import { Collections, Settings, UNRANKED_WAR_LEAGUE_ID, URL_REGEX } from '@app/constants';
import {
  ActionRowBuilder,
  AnyThreadChannel,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  MessageFlags,
  Role,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  TextChannel
} from 'discord.js';
import moment from 'moment-timezone';
import { ObjectId } from 'mongodb';
import { Args, Command } from '../../lib/handlers.js';
import { IRoster, RosterSortTypes, rosterLabel, rosterLayoutMap } from '../../struct/roster-manager.js';
import { RosterCommandSortOptions } from '../../util/command.options.js';
import { createInteractionCollector } from '../../util/pagination.js';

export default class RosterEditCommand extends Command {
  public constructor() {
    super('roster-edit', {
      category: 'roster',
      channel: 'guild',
      userPermissions: ['ManageGuild'],
      roleKey: Settings.ROSTER_MANAGER_ROLE,
      defer: true,
      ephemeral: true
    });
  }

  public args(): Args {
    return {
      color_code: {
        match: 'COLOR'
      }
    };
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: {
      roster: string;
      clan?: string;
      detach_clan?: boolean;
      name?: string;
      category?: IRoster['category'];
      max_members?: number;
      min_town_hall?: number;
      max_town_hall?: number;
      min_hero_level?: number;
      roster_role?: Role;
      delete_role?: boolean;
      allow_multi_signup?: boolean;
      allow_group_selection?: boolean;
      max_accounts_per_user?: number;
      end_time?: string;
      start_time?: string;
      timezone?: string;
      layout?: string;
      sort_by?: RosterSortTypes;
      clear_members?: boolean;
      use_clan_alias?: boolean;
      delete_roster?: boolean;
      allow_unlinked?: boolean;
      color_code?: number;
      roster_image_url?: string;
      components_only?: boolean;
      log_channel?: TextChannel | AnyThreadChannel;
    }
  ) {
    if (args.roster === '*') return this.handleBulk(interaction);

    if (!ObjectId.isValid(args.roster)) return interaction.followUp({ content: 'Invalid roster ID.', flags: MessageFlags.Ephemeral });

    const rosterId = new ObjectId(args.roster);
    const roster = await this.client.rosterManager.get(rosterId);
    if (!roster) return interaction.followUp({ content: 'Roster was deleted.', flags: MessageFlags.Ephemeral });

    if (args.delete_roster) {
      await this.client.rosterManager.delete(rosterId);
      return interaction.followUp({ content: 'Roster deleted successfully.', flags: MessageFlags.Ephemeral });
    }

    if (args.clan && args.detach_clan) {
      return interaction.editReply({ content: 'You cannot detach and attach a clan at the same time in a single command.' });
    }

    const clan = args.clan ? await this.client.resolver.resolveClan(interaction, args.clan) : null;
    if (args.clan && !clan) return;

    if (args.roster_role) {
      const dup = await this.client.rosterManager.rosters.findOne({ _id: { $ne: roster._id }, roleId: args.roster_role.id });
      if (dup) return interaction.editReply({ content: 'A roster with this role already exists.' });
    }

    const data: Partial<IRoster> = {};

    if (args.clan && clan)
      data.clan = {
        tag: clan.tag,
        name: clan.name,
        badgeUrl: clan.badgeUrls.large,
        league: {
          id: clan.warLeague?.id ?? UNRANKED_WAR_LEAGUE_ID,
          name: clan.warLeague?.name ?? 'Unranked'
        }
      };
    if (args.name) data.name = args.name;
    if (args.max_members) data.maxMembers = args.max_members;
    if (args.min_town_hall) data.minTownHall = args.min_town_hall;
    if (args.max_town_hall) data.maxTownHall = args.max_town_hall;
    if (args.min_hero_level) data.minHeroLevels = args.min_hero_level;
    if (args.roster_role) data.roleId = args.roster_role.id;
    if (args.delete_role) data.roleId = null;

    if (args.roster_image_url && URL_REGEX.test(args.roster_image_url)) data.rosterImage = args.roster_image_url;
    if (args.roster_image_url && /^none$/i.test(args.roster_image_url)) data.rosterImage = null;

    if (typeof args.allow_multi_signup === 'boolean') data.allowMultiSignup = args.allow_multi_signup;
    if (typeof args.allow_group_selection === 'boolean') data.allowCategorySelection = args.allow_group_selection;
    if (args.clear_members) data.members = [];
    if (args.sort_by) data.sortBy = args.sort_by;
    if (typeof args.max_accounts_per_user === 'number') data.maxAccountsPerUser = args.max_accounts_per_user;
    if (args.layout) {
      const layoutIds = args.layout.split('/');
      if (layoutIds.length >= 3 && layoutIds.every((id) => id in rosterLayoutMap)) {
        data.layout = args.layout;
      }
    }
    if (typeof args.use_clan_alias === 'boolean') data.useClanAlias = args.use_clan_alias;
    if (typeof args.allow_unlinked === 'boolean') data.allowUnlinked = args.allow_unlinked;
    if (typeof args.color_code === 'number') data.colorCode = args.color_code;
    if (args.category) data.category = args.category;
    if (args.detach_clan) data.clan = null;

    if (args.log_channel) {
      const webhook = await this.client.storage.getWebhook(args.log_channel.isThread() ? args.log_channel.parent! : args.log_channel);
      if (!webhook) {
        return interaction.editReply(
          this.i18n('common.too_many_webhooks', { lng: interaction.locale, channel: args.log_channel.toString() })
        );
      }
      data.logChannelId = args.log_channel.id;
      data.webhook = { token: webhook.token!, id: webhook.id };
    }

    const selected = {
      layoutIds: [] as string[]
    };

    const customIds = {
      select: this.client.uuid(interaction.user.id)
    };

    const keys = Object.entries(rosterLayoutMap);
    const menu = new StringSelectMenuBuilder()
      .setCustomId(customIds.select)
      .setPlaceholder('Select a custom layout!')
      .setMinValues(3)
      .setMaxValues(5)
      .setOptions(keys.map(([key, { name, description }]) => ({ label: name, description, value: key })));
    const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);

    if (typeof args.allow_multi_signup === 'boolean' && !args.allow_multi_signup && roster.allowMultiSignup && roster.members.length > 0) {
      const dup = await this.client.rosterManager.rosters.findOne(
        {
          '_id': { $ne: roster._id },
          'closed': false,
          'category': roster.category,
          'guildId': interaction.guild.id,
          'members.tag': { $in: roster.members.map((mem) => mem.tag) }
        },
        { projection: { name: 1, clan: 1 } }
      );

      if (dup)
        return interaction.editReply(
          `This roster has multiple members signed up for another roster ${rosterLabel(dup)}. Please remove them or close the roster before disabling multi-signup.`
        );
    }

    const timezoneId = await this.client.rosterManager.getTimezoneId(interaction, args.timezone);
    if (args.start_time && moment(args.start_time).isValid()) {
      data.startTime = this.client.rosterManager.convertTime(args.start_time, timezoneId);
      if (data.startTime < new Date()) return interaction.editReply('Start time cannot be in the past.');
      if (data.startTime < moment().add(5, 'minutes').toDate()) {
        return interaction.editReply('Start time must be at least 5 minutes from now.');
      }
    }

    if (args.end_time && moment(args.end_time).isValid()) {
      data.endTime = this.client.rosterManager.convertTime(args.end_time, timezoneId);
      if (data.endTime < new Date()) return interaction.editReply('End time cannot be in the past.');
      if (data.endTime < moment().add(5, 'minutes').toDate()) {
        return interaction.editReply('End time must be at least 5 minutes from now.');
      }
    }

    if (data.endTime && data.startTime) {
      if (data.endTime < data.startTime) return interaction.editReply('End time cannot be before start time.');
      if (data.endTime.getTime() - data.startTime.getTime() < 600000)
        return interaction.editReply('Roster must be at least 10 minutes long.');
    }

    const updated = await this.client.rosterManager.edit(rosterId, data);
    if (!updated) return interaction.followUp({ content: 'This roster no longer exists!', flags: MessageFlags.Ephemeral });
    this.client.rosterManager.setDefaultSettings(interaction.guild.id, updated);

    const token = this.client.util.createToken({ userId: interaction.user.id, guildId: interaction.guild.id });
    const url = `https://clashperk.com/rosters?roster=${updated._id.toHexString()}&bot=${this.client.isCustom() ? 'custom' : 'public'}&token=${token}`;

    const embed = this.client.rosterManager.getRosterInfoEmbed(updated);
    embed.setDescription(
      [
        `- ${this.client.commands.get('/roster post')} to signup.`,
        `- ${this.client.commands.get('/roster manage')} to manage the roster.`,
        `- ${this.client.commands.get('/roster edit')} to change the roster settings.`,
        `- ${this.client.commands.get('/roster delete')} to delete the roster.`,
        `- ${this.client.commands.get('/roster list')} to list all rosters or search for a roster.`,
        `- ${this.client.commands.get('/roster clone')} to clone a roster.`,
        `- ${this.client.commands.get('/roster groups create')} to create a user group.`,
        `- ${this.client.commands.get('/roster groups modify')} to edit/delete a user group.`
      ].join('\n')
    );

    embed.addFields({
      name: '\u200b',
      value: `[Manage Roster on the Web](${url})`
    });

    const message = await interaction.editReply({
      embeds: args.components_only ? [] : [embed],
      components: [menuRow],
      content: args.components_only
        ? `**Change Roster Layout** \n- More settings can be edited using ${this.client.commands.get('/roster edit')} command.`
        : null
    });

    createInteractionCollector({
      customIds,
      message,
      interaction,
      onSelect: async (interaction) => {
        selected.layoutIds = interaction.values;
        data.layout = selected.layoutIds.join('/');

        const updated = await this.client.rosterManager.edit(rosterId, data);
        if (!updated) return interaction.followUp({ content: 'This roster no longer exists!', flags: MessageFlags.Ephemeral });

        const embed = this.client.rosterManager.getRosterInfoEmbed(updated);
        return interaction.update({ embeds: [embed], components: [menuRow] });
      }
    });
  }

  public async handleBulk(interaction: CommandInteraction<'cached'>) {
    const customIds = {
      sort: this.client.uuid(interaction.user.id),
      layout: this.client.uuid(interaction.user.id),
      applyToAll: this.client.uuid(interaction.user.id)
    };

    const keys = Object.entries(rosterLayoutMap);
    const layoutMenu = new StringSelectMenuBuilder()
      .setCustomId(customIds.layout)
      .setPlaceholder('Select a custom layout!')
      .setMinValues(3)
      .setMaxValues(5)
      .setOptions(keys.map(([key, { name, description }]) => ({ label: name, description, value: key })));
    const layoutMenuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(layoutMenu);

    const sortMenu = new StringSelectMenuBuilder()
      .setCustomId(customIds.sort)
      .setPlaceholder('Select roster sorting key!')
      .setOptions(RosterCommandSortOptions.map((option) => ({ label: option.name, value: option.value })));
    const sortMenuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(sortMenu);

    const applyToAllButton = new ButtonBuilder()
      .setCustomId(customIds.applyToAll)
      .setStyle(ButtonStyle.Danger)
      .setLabel('Apply to all Rosters')
      .setDisabled(true);
    const applyRow = new ActionRowBuilder<ButtonBuilder>().addComponents(applyToAllButton);
    const selected: Partial<Pick<IRoster, 'layout' | 'sortBy'>> = {};

    const getContent = () => {
      const texts = [
        `**Change Roster Layout and Sorting Key**`,
        '',
        '*\\*Currently, bulk edit mode only supports editing layout and sorting key.*'
      ];

      if (selected.layout) {
        texts.push('', '**Layout**', `\`${selected.layout}\``);
      }

      if (selected.sortBy) {
        texts.push('', '**Sorting Key**', `\`${selected.sortBy}\``);
      }

      return texts.join('\n');
    };

    const message = await interaction.editReply({
      components: [layoutMenuRow, sortMenuRow, applyRow],
      content: getContent()
    });

    const selectSortBy = async (action: StringSelectMenuInteraction<'cached'>) => {
      selected.sortBy = action.values.at(0)! as RosterSortTypes;

      applyToAllButton.setDisabled(!selected.layout && !selected.sortBy);
      await action.update({ content: getContent(), components: [layoutMenuRow, sortMenuRow, applyRow] });
    };

    const selectLayout = async (action: StringSelectMenuInteraction<'cached'>) => {
      selected.layout = action.values.join('/');

      applyToAllButton.setDisabled(!selected.layout && !selected.sortBy);
      await action.update({ content: getContent(), components: [layoutMenuRow, sortMenuRow, applyRow] });
    };

    const apply = async (action: ButtonInteraction<'cached'>) => {
      await this.client.db
        .collection<IRoster>(Collections.ROSTERS)
        .updateMany({ guildId: interaction.guild.id, category: { $nin: ['TROPHY', 'NO_CLAN'] } }, { $set: selected });
      await action.update({ components: [] });
    };

    createInteractionCollector({
      message,
      interaction,
      customIds,
      onClick: (action) => {
        if (action.customId === customIds.applyToAll) {
          return apply(action);
        }
      },
      onSelect: (action) => {
        if (action.customId === customIds.layout) {
          return selectLayout(action);
        }
        if (action.customId === customIds.sort) {
          return selectSortBy(action);
        }
      }
    });
  }
}
