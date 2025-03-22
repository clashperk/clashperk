import { Settings } from '@app/constants';
import { CommandInteraction, EmbedBuilder } from 'discord.js';
import ms from 'ms';
import { camel, title } from 'radash';
import { ExclusionListConfig } from '../../core/roles-manager.js';
import { Command } from '../../lib/handlers.js';

export default class AutoRoleConfigCommand extends Command {
  public constructor() {
    super('autorole-config', {
      category: 'roles',
      userPermissions: ['ManageGuild'],
      clientPermissions: ['EmbedLinks'],
      channel: 'guild',
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: {
      auto_update_roles?: boolean;
      verified_only_clan_roles?: boolean;
      role_removal_delays?: string;
      role_addition_delays?: string;
      always_force_refresh_roles?: boolean;
      allow_not_linked?: boolean;
      delay_exclusion_roles?: 'town-hall-roles' | 'builder-hall-roles' | 'league-roles' | 'builder-league-roles' | 'guest-role';
    }
  ) {
    if (typeof args.verified_only_clan_roles === 'boolean') {
      await this.client.settings.set(interaction.guild, Settings.VERIFIED_ONLY_CLAN_ROLES, args.verified_only_clan_roles);
    }

    if (typeof args.auto_update_roles === 'boolean') {
      await this.client.settings.set(interaction.guild, Settings.USE_AUTO_ROLE, args.auto_update_roles);
    }

    if (typeof args.always_force_refresh_roles === 'boolean') {
      await this.client.settings.set(interaction.guild, Settings.FORCE_REFRESH_ROLES, args.always_force_refresh_roles);
    }

    if (typeof args.allow_not_linked === 'boolean') {
      await this.client.settings.set(interaction.guild, Settings.AUTO_ROLE_ALLOW_NOT_LINKED, args.allow_not_linked);
    }

    if (args.role_removal_delays) {
      await this.client.settings.set(interaction.guild, Settings.ROLE_REMOVAL_DELAYS, ms(args.role_removal_delays));
    }

    if (args.role_addition_delays) {
      await this.client.settings.set(interaction.guild, Settings.ROLE_ADDITION_DELAYS, ms(args.role_addition_delays));
    }

    const verifiedOnlyClanRoles = this.client.settings.get(interaction.guild, Settings.VERIFIED_ONLY_CLAN_ROLES, false);
    const autoUpdateRoles = this.client.settings.get(interaction.guild, Settings.USE_AUTO_ROLE, false);
    const alwaysForceRefreshRoles = this.client.settings.get(interaction.guild, Settings.FORCE_REFRESH_ROLES, false);
    const allowNotLinked = this.client.settings.get(interaction.guild, Settings.AUTO_ROLE_ALLOW_NOT_LINKED, false);
    const roleRemovalDelays = this.client.settings.get<number>(interaction.guild, Settings.ROLE_REMOVAL_DELAYS, 0);
    const roleAdditionDelays = this.client.settings.get<number>(interaction.guild, Settings.ROLE_ADDITION_DELAYS, 0);
    const exclusionList = this.client.settings.get<ExclusionListConfig>(interaction.guild, Settings.DELAY_EXCLUSION_LIST, {});

    if (args.delay_exclusion_roles) {
      const key = camel(args.delay_exclusion_roles) as keyof ExclusionListConfig;

      if (exclusionList[key]) {
        delete exclusionList[key];
      } else {
        exclusionList[key] = true;
      }

      await this.client.settings.set(interaction.guild, Settings.DELAY_EXCLUSION_LIST, exclusionList);
    }

    const embed = new EmbedBuilder().setColor(this.client.embed(interaction));
    embed.setTitle('AutoRole Settings');
    embed.addFields(
      {
        name: 'Auto Update Roles',
        value: autoUpdateRoles ? 'Enabled' : 'Disabled'
      },
      {
        name: 'Verified Only Clan Roles',
        value: verifiedOnlyClanRoles ? 'Enabled' : 'Disabled'
      },
      {
        name: 'Always Force Refresh Roles',
        value: alwaysForceRefreshRoles ? 'Enabled' : 'Disabled'
      },
      {
        name: 'Allow Not Linked',
        value: allowNotLinked ? 'Enabled' : 'Disabled'
      },
      {
        name: 'Role Removal Delays',
        value: roleRemovalDelays ? ms(roleRemovalDelays, { long: true }) : 'Disabled'
      },
      {
        name: 'Role Addition Delays',
        value: roleAdditionDelays ? ms(roleAdditionDelays, { long: true }) : 'Disabled'
      },
      {
        name: 'Delay Exclusion List',
        value: ['- Verified Role', '- Account Linked Role', ...Object.keys(exclusionList).map((k) => `- ${title(k)}`)].join('\n')
      }
    );

    return interaction.editReply({ embeds: [embed] });
  }
}
