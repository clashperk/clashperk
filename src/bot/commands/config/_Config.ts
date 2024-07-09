import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  Guild,
  HexColorString,
  MessageComponentInteraction,
  Role,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  resolveColor
} from 'discord.js';
import ms from 'ms';
import { title, unique } from 'radash';
import { command } from '../../../../locales/en.js';
import { Command } from '../../lib/index.js';
import { Settings } from '../../util/Constants.js';
import { createInteractionCollector } from '../../util/Pagination.js';

const options = [
  {
    name: 'manager_role',
    key: Settings.MANAGER_ROLE,
    description: command.config.options.manager_role.description
  },
  {
    name: 'roster_manager_role',
    key: Settings.ROSTER_MANAGER_ROLE,
    description: command.config.options.roster_manager_role.description
  },
  {
    name: 'flags_manager_role',
    key: Settings.FLAGS_MANAGER_ROLE,
    description: command.config.options.flags_manager_role.description
  },
  {
    name: 'links_manager_role',
    key: Settings.LINKS_MANAGER_ROLE,
    description: command.config.options.links_manager_role.description
  }
];

export default class ConfigCommand extends Command {
  public constructor() {
    super('config', {
      category: 'config',
      userPermissions: ['ManageGuild'],
      clientPermissions: ['EmbedLinks'],
      channel: 'guild',
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: {
      color_code?: string;
      webhook_limit?: number;
      manager_role?: Role;
      roster_manager_role?: Role;
      flags_manager_role?: Role;
      links_manager_role?: Role;
      account_linked_role?: Role;
      account_verified_role?: Role;
      auto_update_roles?: boolean;
      verified_only_clan_roles?: boolean;
      role_removal_delays?: string;
      role_addition_delays?: string;
      always_force_refresh_roles?: boolean;
      /** @deprecated */
      maintenance_notification_channel?: string;
      autorole_allow_not_linked?: boolean;
    }
  ) {
    if (args.color_code) {
      await this.client.settings.set(interaction.guild, Settings.COLOR, this.getColor(args.color_code));
    }

    if (args.webhook_limit) {
      const webhookLimit = Math.max(3, Math.min(8, args.webhook_limit));
      await this.client.settings.set(interaction.guild, Settings.WEBHOOK_LIMIT, webhookLimit);
    }

    if (args.manager_role) {
      await this.client.settings.push(interaction.guild, Settings.MANAGER_ROLE, [args.manager_role.id]);
    }

    if (args.roster_manager_role) {
      await this.client.settings.push(interaction.guild, Settings.ROSTER_MANAGER_ROLE, [args.roster_manager_role.id]);
    }

    if (args.flags_manager_role) {
      await this.client.settings.push(interaction.guild, Settings.FLAGS_MANAGER_ROLE, [args.flags_manager_role.id]);
    }

    if (args.links_manager_role) {
      await this.client.settings.push(interaction.guild, Settings.LINKS_MANAGER_ROLE, [args.links_manager_role.id]);
    }

    if (args.account_linked_role) {
      await this.client.settings.set(interaction.guild, Settings.ACCOUNT_LINKED_ROLE, args.account_linked_role.id);
    }

    if (args.account_verified_role) {
      await this.client.settings.set(interaction.guild, Settings.ACCOUNT_VERIFIED_ROLE, args.account_verified_role.id);
    }

    if (typeof args.verified_only_clan_roles === 'boolean') {
      await this.client.settings.set(interaction.guild, Settings.VERIFIED_ONLY_CLAN_ROLES, args.verified_only_clan_roles);
    }

    if (typeof args.auto_update_roles === 'boolean') {
      await this.client.settings.set(interaction.guild, Settings.USE_AUTO_ROLE, args.auto_update_roles);
    }

    if (typeof args.always_force_refresh_roles === 'boolean') {
      await this.client.settings.set(interaction.guild, Settings.FORCE_REFRESH_ROLES, args.always_force_refresh_roles);
    }

    if (args.maintenance_notification_channel) {
      return interaction.editReply(`This option has been moved to ${this.client.commands.get('/setup utility')}`);
    }

    if (typeof args.autorole_allow_not_linked === 'boolean') {
      await this.client.settings.set(interaction.guild, Settings.AUTO_ROLE_ALLOW_NOT_LINKED, args.autorole_allow_not_linked);
    }

    if (args.role_removal_delays) {
      await this.client.settings.set(interaction.guild, Settings.ROLE_REMOVAL_DELAYS, ms(args.role_removal_delays));
    }

    if (args.role_addition_delays) {
      await this.client.settings.set(interaction.guild, Settings.ROLE_ADDITION_DELAYS, ms(args.role_addition_delays));
    }

    const validOptions = this.getOptions();
    const embed = this.fallback(interaction);

    const customIds = {
      manage: this.client.uuid(interaction.user.id),
      menu: this.client.uuid(interaction.user.id),
      [Settings.MANAGER_ROLE]: this.client.uuid(interaction.user.id),
      [Settings.ROSTER_MANAGER_ROLE]: this.client.uuid(interaction.user.id),
      [Settings.FLAGS_MANAGER_ROLE]: this.client.uuid(interaction.user.id),
      [Settings.LINKS_MANAGER_ROLE]: this.client.uuid(interaction.user.id)
    };

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setLabel('Manage Permissions').setStyle(ButtonStyle.Success).setCustomId(customIds.manage)
    );
    const menuOptions = new StringSelectMenuBuilder()
      .setCustomId(customIds.menu)
      .setPlaceholder('What would you like to set?')
      .addOptions(validOptions);
    const optionMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menuOptions);

    const roleKeys = [Settings.MANAGER_ROLE, Settings.FLAGS_MANAGER_ROLE, Settings.ROSTER_MANAGER_ROLE, Settings.LINKS_MANAGER_ROLE];

    const message = await interaction.editReply({ embeds: [embed], components: [row] });
    createInteractionCollector({
      message,
      customIds,
      interaction,
      onClick: (action) => {
        const validOptions = this.getOptions().map((op) => ({ ...op, default: false }));
        menuOptions.setOptions(validOptions);

        return action.update({
          embeds: [],
          content: ['### Select an option to set Permissions', ...roleKeys.map((key) => `- ${title(key)}`)].join('\n'),
          components: [optionMenu]
        });
      },
      onSelect: async (action) => {
        const roleKey = action.values[0];

        const roleMenus: ActionRowBuilder<RoleSelectMenuBuilder>[] = [];
        for (const key of roleKeys) {
          if (key !== roleKey) continue;

          const roles = this.getRoles(interaction.guild, key);
          const roleMenu = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
            new RoleSelectMenuBuilder()
              .setCustomId(customIds[key as keyof typeof customIds])
              .setPlaceholder(`Select ${title(key)}`)
              .setMinValues(0)
              .setMaxValues(25)
              .setDefaultRoles(...unique(roles))
          );
          roleMenus.push(roleMenu);
        }

        const validOptions = this.getOptions().map((op) => ({ ...op, default: op.value === roleKey }));
        const opt = validOptions.find((op) => op.value === roleKey)!;
        menuOptions.setOptions(validOptions);

        return action.update({
          embeds: [],
          content: `### Select ${opt.label}s\n${opt.description}`,
          components: [optionMenu, ...roleMenus]
        });
      },
      onRoleSelect: async (action) => {
        const roleIds = unique(action.roles.map((role) => role.id));

        if (customIds.managerRole === action.customId) {
          if (roleIds.length) {
            await this.client.settings.set(interaction.guild, Settings.MANAGER_ROLE, roleIds);
          } else {
            await this.client.settings.delete(interaction.guild, Settings.MANAGER_ROLE);
          }
        }
        if (customIds.flagsManagerRole === action.customId) {
          if (roleIds.length) {
            await this.client.settings.set(interaction.guild, Settings.FLAGS_MANAGER_ROLE, roleIds);
          } else {
            await this.client.settings.delete(interaction.guild, Settings.FLAGS_MANAGER_ROLE);
          }
        }
        if (customIds.rosterManagerRole === action.customId) {
          if (roleIds.length) {
            await this.client.settings.set(interaction.guild, Settings.ROSTER_MANAGER_ROLE, roleIds);
          } else {
            await this.client.settings.delete(interaction.guild, Settings.ROSTER_MANAGER_ROLE);
          }
        }
        if (customIds.linksManagerRole === action.customId) {
          if (roleIds.length) {
            await this.client.settings.set(interaction.guild, Settings.LINKS_MANAGER_ROLE, roleIds);
          } else {
            await this.client.settings.delete(interaction.guild, Settings.LINKS_MANAGER_ROLE);
          }
        }

        return action.update({ embeds: [this.fallback(action)], components: [row] });
      }
    });
  }

  public fallback(interaction: CommandInteraction<'cached'> | MessageComponentInteraction<'cached'>) {
    const color = this.client.settings.get<number>(interaction.guild, Settings.COLOR, null);
    const channel = interaction.guild.channels.cache.get(
      this.client.settings.get<string>(interaction.guild, Settings.EVENTS_CHANNEL, null)
    );

    const managerRoles = this.getRoles(interaction.guild, Settings.MANAGER_ROLE);
    const flagsManagerRoles = this.getRoles(interaction.guild, Settings.FLAGS_MANAGER_ROLE);
    const rosterManagerRoles = this.getRoles(interaction.guild, Settings.ROSTER_MANAGER_ROLE);
    const linksManagerRoles = this.getRoles(interaction.guild, Settings.LINKS_MANAGER_ROLE);

    const verifiedOnlyClanRoles = this.client.settings.get<string>(interaction.guild, Settings.VERIFIED_ONLY_CLAN_ROLES, false);
    const useAutoRole = this.client.settings.get<string>(interaction.guild, Settings.USE_AUTO_ROLE, true);
    const roleRemovalDelays = this.client.settings.get<number>(interaction.guild, Settings.ROLE_REMOVAL_DELAYS, 0);
    const roleAdditionDelays = this.client.settings.get<number>(interaction.guild, Settings.ROLE_ADDITION_DELAYS, 0);
    const forceRefreshRoles = this.client.settings.get<boolean>(interaction.guild, Settings.FORCE_REFRESH_ROLES, false);
    const autoRoleAllowNotLinked = this.client.settings.get<boolean>(interaction.guild, Settings.AUTO_ROLE_ALLOW_NOT_LINKED, true);

    const embed = new EmbedBuilder()
      .setColor(this.client.embed(interaction))
      .setAuthor({ name: this.i18n('command.config.title', { lng: interaction.locale }) })
      .addFields([
        {
          name: 'Prefix',
          value: '/'
        },
        {
          name: 'Patreon Subscribed',
          value: this.client.patreonHandler.get(interaction.guild.id) ? 'Yes' : 'No'
        },
        {
          name: 'Manager Roles',
          value: `${managerRoles.map((id) => `<@&${id}>`).join(' ') || 'None'}`
        },
        {
          name: 'Roster Manager Roles',
          value: `${rosterManagerRoles.map((id) => `<@&${id}>`).join(' ') || 'None'}`
        },
        {
          name: 'Flags Manager Roles',
          value: `${flagsManagerRoles.map((id) => `<@&${id}>`).join(' ') || 'None'}`
        },
        {
          name: 'Links Manager Roles',
          value: `${linksManagerRoles.map((id) => `<@&${id}>`).join(' ') || 'None'}`
        },
        {
          name: 'Webhook Limit',
          value: `${this.client.settings.get<string>(interaction.guild, Settings.WEBHOOK_LIMIT, 8)}`
        },
        {
          name: 'Verified-Only Clan Roles',
          value: `${verifiedOnlyClanRoles ? 'Yes' : 'No'}`
        },
        {
          name: 'Auto Update Roles',
          value: `${useAutoRole ? 'Yes' : 'No'}`
        },
        {
          name: 'Role Removal Delays',
          value: `${roleRemovalDelays ? ms(roleRemovalDelays, { long: true }) : 'None'}`
        },
        {
          name: 'Role Addition Delays',
          value: `${roleAdditionDelays ? ms(roleAdditionDelays, { long: true }) : 'None'}`
        },
        {
          name: 'Force Refresh Roles',
          value: `${forceRefreshRoles ? 'Yes (individual user only)' : 'No'}`
        },
        {
          name: 'Allow Not Linked (AutoRole)',
          value: `${autoRoleAllowNotLinked ? 'Yes' : 'No'}`
        },
        {
          name: this.i18n('common.color_code', { lng: interaction.locale }),
          value: color ? `#${color.toString(16).toUpperCase()}` : 'None'
        },
        {
          name: this.i18n('command.config.maintenance_notification_channel', { lng: interaction.locale }),
          value: channel?.toString() ?? 'None'
        }
      ]);

    return embed;
  }

  private getColor(hex: string) {
    try {
      return resolveColor(hex as HexColorString);
    } catch {
      return null;
    }
  }

  private getRoles(guild: Guild, key: Settings) {
    const value = this.client.settings.get<string[]>(guild, key, []);
    if (typeof value === 'string') return [value];
    return value;
  }

  private getOptions() {
    return options.map((op) => ({ label: title(op.name), value: op.key, description: op.description }));
  }
}
