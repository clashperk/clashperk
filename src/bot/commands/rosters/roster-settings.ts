import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction
} from 'discord.js';
import { ObjectId } from 'mongodb';
import { Command } from '../../lib/index.js';
import { RosterSortTypes, rosterLayoutMap } from '../../struct/roster-manager.js';
import { RosterManageActions, RosterCommandSortOptions as sortingItems } from '../../util/command-options.js';
import { Settings } from '../../util/constants.js';
import { getExportComponents } from '../../util/helper.js';
import { Util } from '../../util/index.js';
import { createInteractionCollector } from '../../util/pagination.js';

export default class RosterEditCommand extends Command {
  public constructor() {
    super('roster-settings', {
      category: 'roster',
      channel: 'guild',
      defer: true,
      ephemeral: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { roster: string; signup_disabled: boolean }) {
    if (!ObjectId.isValid(args.roster)) return interaction.followUp({ content: 'Invalid roster ID.', ephemeral: true });

    const rosterId = new ObjectId(args.roster);
    const roster = await this.client.rosterManager.get(rosterId);
    if (!roster) return interaction.followUp({ content: 'Roster was deleted.', ephemeral: true });

    const customIds = {
      select: this.client.uuid(interaction.user.id),
      sort: this.client.uuid(interaction.user.id),
      clear: this.client.uuid(interaction.user.id),
      layout: this.client.uuid(interaction.user.id)
    };

    const selected: Partial<{ layoutIds: string[]; sortBy: RosterSortTypes }> = {
      layoutIds: roster.layout?.split('/') ?? [],
      sortBy: roster.sortBy
    };

    const isClosed = this.client.rosterManager.isClosed(roster);

    const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setMinValues(1)
        .setPlaceholder('Select an action!')
        .setCustomId(customIds.select)
        .setOptions([
          {
            label: 'Roster Info/Export',
            description: 'View roster info, settings and Export to Google spreadsheet.',
            value: 'export'
          },
          {
            label: `${isClosed ? 'Open' : 'Close'} Roster`,
            description: `${isClosed ? 'Allow' : 'Prevent'} new signups to the roster.`,
            value: isClosed ? 'open' : 'close'
          },
          {
            label: 'Clear Roster',
            description: 'Remove all members from the roster.',
            value: 'clear'
          },
          {
            label: `${args.signup_disabled ? 'Show' : 'Hide'} Buttons`,
            description: `${args.signup_disabled ? 'Show' : 'Hide'} signup buttons from the message.`,
            value: 'toggle-signup'
          },
          {
            label: 'Archive Mode',
            description: 'Remove action buttons from the message.',
            value: 'archive'
          },
          {
            label: 'Add User',
            description: 'Add a user or players to the roster.',
            value: RosterManageActions.ADD_USER
          },
          {
            label: 'Remove User',
            description: 'Remove a user or players from the roster.',
            value: RosterManageActions.DEL_USER
          },
          {
            label: 'Change Roster',
            description: 'Move a user or players to another roster.',
            value: RosterManageActions.CHANGE_ROSTER
          },
          {
            label: 'Change Group',
            description: 'Move a user or players to another user group.',
            value: RosterManageActions.CHANGE_CATEGORY
          },
          {
            label: 'Edit Roster',
            description: 'Edit roster layout and sorting options.',
            value: 'edit'
          },
          {
            label: 'Unregistered Members',
            description: 'List of members who did not sign up for the roster.',
            value: 'unregistered'
          },
          {
            label: 'Missing Members',
            description: 'List of members who are currently not in the clan.',
            value: 'missing'
          }
        ])
    );

    const message = await interaction.followUp({ components: [menuRow], ephemeral: true });
    const categories = await this.client.rosterManager.getCategories(interaction.guild.id);

    const closeRoster = async (action: StringSelectMenuInteraction<'cached'>) => {
      const updated = await this.client.rosterManager.close(rosterId);
      if (!updated) return action.reply({ content: 'Roster was deleted.', ephemeral: true });
      await action.update({ content: 'Roster closed!', components: [] });

      const embed = this.client.rosterManager.getRosterEmbed(updated, categories);
      const row = this.client.rosterManager.getRosterComponents({ roster: updated, signupDisabled: args.signup_disabled });
      return interaction.editReply({ embeds: [embed], components: [row] });
    };

    const openRoster = async (action: StringSelectMenuInteraction<'cached'>) => {
      if (roster.endTime && new Date(roster.endTime) < new Date()) {
        return action.reply({ content: 'This roster cannot be opened as the closing time has passed.', ephemeral: true });
      }

      if (!roster.allowMultiSignup && roster.members.length > 0 && roster.closed) {
        const dup = await this.client.rosterManager.rosters.findOne(
          {
            '_id': { $ne: roster._id },
            'closed': false,
            'category': roster.category,
            'guildId': action.guild.id,
            'members.tag': { $in: roster.members.map((mem) => mem.tag) }
          },
          { projection: { name: 1, clan: 1 } }
        );

        if (dup)
          return action.reply(
            `This roster has multiple members signed up for another roster **${dup.clan.name} - ${dup.name}**. Please remove them before opening this roster.`
          );
      }

      const updated = await this.client.rosterManager.open(rosterId);
      if (!updated) return action.reply({ content: 'Roster was deleted.', ephemeral: true });
      await action.update({ content: 'Roster opened!', components: [] });

      const embed = this.client.rosterManager.getRosterEmbed(updated, categories);
      const row = this.client.rosterManager.getRosterComponents({ roster: updated, signupDisabled: args.signup_disabled });
      return interaction.editReply({ embeds: [embed], components: [row] });
    };

    const selectClear = async (action: StringSelectMenuInteraction<'cached'>) => {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(customIds.clear).setLabel('Confirm').setStyle(ButtonStyle.Danger)
      );
      await action.update({
        content: [
          '### Clearing Roster',
          `- ${roster.clan.name} (${roster.clan.tag}) - ${roster.name}`,
          `- ${roster.members.length} ${Util.plural(roster.members.length, 'player')} will be removed.`,
          '- **This action cannot be undone! Are you sure?**'
        ].join('\n'),
        components: [row]
      });
    };

    const clearRoster = async (action: ButtonInteraction<'cached'>) => {
      const updated = await this.client.rosterManager.clear(rosterId);
      if (!updated) return action.reply({ content: 'Roster was deleted.', ephemeral: true });

      await action.update({ content: 'Roster cleared!', components: [] });

      const embed = this.client.rosterManager.getRosterEmbed(updated, categories);
      const row = this.client.rosterManager.getRosterComponents({ roster: updated, signupDisabled: args.signup_disabled });
      return interaction.editReply({ embeds: [embed], components: [row] });
    };

    const archiveRoster = async (action: StringSelectMenuInteraction<'cached'>) => {
      const embed = this.client.rosterManager.getRosterEmbed(roster, categories);
      await interaction.editReply({ embeds: [embed], components: [] });
      await action.update({ content: 'Roster message archived!', components: [] });

      const { res, body: clan } = await this.client.http.getClan(roster.clan.tag);
      if (!res.ok) return action.reply({ content: `Failed to fetch the clan \u200e${roster.clan.name} (${roster.clan.tag})` });

      const sheet = await this.client.rosterManager.exportSheet({
        name: interaction.guild.name,
        roster,
        clan,
        categories
      });

      const components = getExportComponents(sheet);
      return interaction.editReply({ embeds: [embed], components: [...components] });
    };

    const toggleSignup = async (action: StringSelectMenuInteraction<'cached'>) => {
      await action.update({
        content: `${args.signup_disabled ? 'Signup buttons updated.' : 'Signup buttons removed.'}`,
        components: []
      });

      const row = this.client.rosterManager.getRosterComponents({ roster, signupDisabled: !args.signup_disabled });
      return interaction.editReply({ components: [row] });
    };

    const exportSheet = async (action: StringSelectMenuInteraction<'cached'>) => {
      if (!roster.members.length) return action.reply({ content: 'Roster is empty.', ephemeral: true });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setLabel('Updating spreadsheet...').setStyle(ButtonStyle.Link).setURL('https://google.com').setDisabled(true)
      );
      const embed = this.client.rosterManager.getRosterInfoEmbed(roster);
      await action.update({ embeds: [embed], components: [row] });

      const { res, body: clan } = await this.client.http.getClan(roster.clan.tag);
      if (!res.ok) {
        return action.editReply({
          content: `Failed to fetch the clan \u200e${roster.clan.name} (${roster.clan.tag})`,
          embeds: [],
          components: []
        });
      }

      const sheet = await this.client.rosterManager.exportSheet({
        name: interaction.guild.name,
        roster,
        clan,
        categories
      });

      const components = getExportComponents(sheet);
      return action.editReply({ content: null, embeds: [embed], components: [...components] });
    };

    const selectSortBy = async (action: StringSelectMenuInteraction<'cached'>) => {
      selected.sortBy = action.values.at(0)! as RosterSortTypes;
      const updated = await this.client.rosterManager.edit(rosterId, { sortBy: selected.sortBy });
      if (!updated) return action.reply({ content: 'Roster was deleted.', ephemeral: true });

      await action.deferUpdate();

      const embed = this.client.rosterManager.getRosterEmbed(updated, categories);
      const row = this.client.rosterManager.getRosterComponents({ roster: updated, signupDisabled: args.signup_disabled });
      return interaction.editReply({ embeds: [embed], components: [row] });
    };

    const selectLayout = async (action: StringSelectMenuInteraction<'cached'>) => {
      selected.layoutIds = action.values;
      const updated = await this.client.rosterManager.edit(rosterId, { layout: selected.layoutIds.join('/') });
      if (!updated) return action.reply({ content: 'Roster was deleted.', ephemeral: true });

      await action.deferUpdate();

      const embed = this.client.rosterManager.getRosterEmbed(updated, categories);
      const row = this.client.rosterManager.getRosterComponents({ roster: updated, signupDisabled: args.signup_disabled });
      return interaction.editReply({ embeds: [embed], components: [row] });
    };

    const editRoster = async (action: StringSelectMenuInteraction<'cached'>) => {
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
        .setOptions(sortingItems.map((option) => ({ label: option.name, value: option.value, default: roster.sortBy === option.value })));
      const sortMenuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(sortMenu);

      return action.update({
        components: [layoutMenuRow, sortMenuRow],
        content: [
          `**Change Roster Layout**`,
          `- More settings can be edited using ${this.client.commands.get('/roster edit')} command.`
        ].join('\n')
      });
    };

    createInteractionCollector({
      interaction,
      customIds,
      message,
      onClick: (action) => {
        if (!this.client.util.isManager(action.member, Settings.ROSTER_MANAGER_ROLE)) {
          return action.reply({
            ephemeral: true,
            content: this.i18n('common.missing_manager_role', { lng: action.locale })
          });
        }

        if (action.customId === customIds.clear) return clearRoster(action);
      },
      onSelect: async (action: StringSelectMenuInteraction<'cached'>) => {
        const value = action.values.at(0)!;
        if (!this.client.util.isManager(action.member, Settings.ROSTER_MANAGER_ROLE) && !['export'].includes(value)) {
          return action.reply({
            ephemeral: true,
            content: this.i18n('common.missing_manager_role', { lng: action.locale })
          });
        }

        if (action.customId === customIds.layout) {
          return selectLayout(action);
        }
        if (action.customId === customIds.sort) {
          return selectSortBy(action);
        }

        switch (value) {
          case 'close':
            return closeRoster(action);
          case 'open':
            return openRoster(action);
          case 'clear':
            return selectClear(action);
          case 'archive':
            return archiveRoster(action);
          case 'toggle-signup':
            return toggleSignup(action);
          case 'export':
            return exportSheet(action);
          case 'edit':
            return editRoster(action);
          case 'unregistered': {
            await action.deferReply({ ephemeral: true });
            const command = this.handler.getCommand('roster-ping')!;
            return command.exec(action, {
              roster: rosterId.toHexString(),
              ping_option: 'unregistered',
              message: 'Unregistered Members (who did not sign up)'
            });
          }
          case 'missing': {
            await action.deferReply({ ephemeral: true });
            const command = this.handler.getCommand('roster-ping')!;
            return command.exec(action, {
              roster: rosterId.toHexString(),
              ping_option: 'missing',
              message: 'Missing Members (signed up but not in the clan)'
            });
          }

          case RosterManageActions.ADD_USER:
          case RosterManageActions.DEL_USER:
          case RosterManageActions.CHANGE_ROSTER:
          case RosterManageActions.CHANGE_CATEGORY: {
            await action.deferUpdate();
            const command = this.handler.getCommand('roster-manage')!;
            return command.exec(action, { roster: rosterId.toHexString(), action: value });
          }
        }
      }
    });
  }
}
