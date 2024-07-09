import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, Message, MessageComponentInteraction } from 'discord.js';
import { title } from 'radash';
import { Command } from '../../lib/index.js';
import { Collections, Settings } from '../../util/_constants.js';
import { createInteractionCollector } from '../../util/_Pagination.js';

export default class AutoRoleDisableCommand extends Command {
  public constructor() {
    super('autorole-disable', {
      category: 'setup',
      channel: 'guild',
      defer: true,
      ephemeral: true,
      userPermissions: ['ManageGuild']
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { type: string; clans?: string }) {
    const action = {
      'town-hall': this.disableTownHallRoles.bind(this),
      'builder-hall': this.disableBuilderHallRoles.bind(this),
      'clan-roles': this.disableClanRoles.bind(this),
      'leagues': this.disableLeagueRoles.bind(this),
      'builder-leagues': this.disableBuilderLeagueRoles.bind(this),
      'wars': this.disableWarRoles.bind(this),
      'family': this.disableFamilyRoles.bind(this),
      'exclusive-family': this.disableFamilyRoles.bind(this),
      'family-leaders': this.disableFamilyRoles.bind(this),
      'guest': this.disableFamilyRoles.bind(this),
      'verified': this.disableFamilyRoles.bind(this),
      'eos-push': this.disableEOSPushRoles.bind(this)
    }[args.type];

    if (typeof action !== 'function') throw new Error('Invalid action was specified');

    return action(interaction, args);
  }

  private async disableClanRoles(interaction: CommandInteraction<'cached'>, args: { clans?: string }) {
    const { clans } = await this.client.storage.handleSearch(interaction, { args: args.clans, required: true });
    if (!clans) return null;

    const { customIds, row } = this.deleteButtonRow();
    const message = await interaction.editReply({
      components: [row],
      content: [
        '### This action cannot be undone! Are you sure?',
        `- It will **unset** clan roles from ${clans.length} clan${clans.length === 1 ? '' : 's'}`
      ].join('\n')
    });

    return this.confirmInteraction({
      customIds,
      interaction,
      message,
      onConfirm: async (action) => {
        await this.client.db
          .collection(Collections.CLAN_STORES)
          .updateMany(
            { guild: interaction.guild.id, tag: { $in: clans.map((clan) => clan.tag) } },
            { $unset: { roles: '', secureRole: '' } }
          );

        return action.update({
          components: [],
          content: this.i18n('command.autorole.disable.success_with_count', {
            lng: interaction.locale,
            count: clans.length.toString(),
            clans: clans.map((clan) => clan.name).join(', ')
          })
        });
      }
    });
  }

  private async disableFamilyRoles(interaction: CommandInteraction<'cached'>, args: { type: string }) {
    if (args.type === 'family') {
      this.client.settings.delete(interaction.guildId, Settings.FAMILY_ROLE);
    }
    if (args.type === 'exclusive-family') {
      this.client.settings.delete(interaction.guildId, Settings.EXCLUSIVE_FAMILY_ROLE);
    }
    if (args.type === 'guest') {
      this.client.settings.delete(interaction.guildId, Settings.GUEST_ROLE);
    }
    if (args.type === 'family-leaders') {
      this.client.settings.delete(interaction.guildId, Settings.FAMILY_LEADERS_ROLE);
    }
    if (args.type === 'verified') {
      this.client.settings.delete(interaction.guildId, Settings.ACCOUNT_VERIFIED_ROLE);
    }
    return interaction.editReply(`Successfully disabled ${title(args.type)} role.`);
  }

  private async disableLeagueRoles(interaction: CommandInteraction<'cached'>) {
    this.client.settings.delete(interaction.guildId, Settings.LEAGUE_ROLES);
    this.client.settings.delete(interaction.guildId, Settings.ALLOW_EXTERNAL_ACCOUNTS_LEAGUE);
    return interaction.editReply('Successfully disabled league roles.');
  }

  private async disableEOSPushRoles(interaction: CommandInteraction<'cached'>) {
    this.client.settings.delete(interaction.guildId, Settings.EOS_PUSH_CLAN_ROLES);
    this.client.settings.set(interaction.guildId, Settings.EOS_PUSH_CLANS, []);
    return interaction.editReply('Successfully disabled EOS Push roles.');
  }

  private async disableBuilderLeagueRoles(interaction: CommandInteraction<'cached'>) {
    this.client.settings.delete(interaction.guildId, Settings.BUILDER_LEAGUE_ROLES);
    return interaction.editReply('Successfully disabled builder league roles.');
  }

  private async disableTownHallRoles(interaction: CommandInteraction<'cached'>) {
    this.client.settings.delete(interaction.guildId, Settings.TOWN_HALL_ROLES);
    this.client.settings.delete(interaction.guildId, Settings.ALLOW_EXTERNAL_ACCOUNTS);
    return interaction.editReply('Successfully disabled Town Hall roles.');
  }

  private async disableBuilderHallRoles(interaction: CommandInteraction<'cached'>) {
    this.client.settings.delete(interaction.guildId, Settings.BUILDER_HALL_ROLES);
    return interaction.editReply('Successfully disabled Builder Hall roles.');
  }

  private async disableWarRoles(interaction: CommandInteraction<'cached'>, args: { clans?: string }) {
    const { clans } = await this.client.storage.handleSearch(interaction, { args: args.clans, required: true });
    if (!clans) return null;

    const { customIds, row } = this.deleteButtonRow();
    const message = await interaction.editReply({
      components: [row],
      content: [
        '### This action cannot be undone! Are you sure?',
        `- It will **unset** war roles from ${clans.length} clan${clans.length === 1 ? '' : 's'}`
      ].join('\n')
    });

    return this.confirmInteraction({
      customIds,
      interaction,
      message,
      onConfirm: async (action) => {
        await this.client.db
          .collection(Collections.CLAN_STORES)
          .updateMany({ guild: interaction.guild.id, tag: { $in: clans.map((clan) => clan.tag) } }, { $unset: { warRole: '' } });

        return action.update({
          components: [],
          content: this.i18n('command.autorole.disable.success_with_count', {
            lng: interaction.locale,
            count: clans.length.toString(),
            clans: clans.map((clan) => clan.name).join(', ')
          })
        });
      }
    });
  }

  private deleteButtonRow() {
    const customIds = {
      confirm: this.client.uuid()
    };
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(customIds.confirm).setLabel('Confirm').setStyle(ButtonStyle.Danger)
    );
    return { row, customIds };
  }

  private async confirmInteraction({
    interaction,
    message,
    customIds,
    onConfirm
  }: {
    interaction: CommandInteraction<'cached'>;
    message: Message<true>;
    customIds: Record<string, string>;
    onConfirm: (action: MessageComponentInteraction<'cached'>) => unknown | Promise<unknown>;
  }) {
    createInteractionCollector({
      interaction,
      message,
      customIds,
      clear: true,
      onClick: (action) => {
        return onConfirm(action);
      }
    });
    return interaction;
  }
}
