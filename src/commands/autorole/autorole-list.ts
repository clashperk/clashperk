import { Settings } from '@app/constants';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder } from 'discord.js';
import ms from 'ms';
import { title } from 'radash';
import { Command } from '../../lib/handlers.js';

const _rolesMap: Record<string, string> = {
  admin: 'elder',
  coLeader: 'co-leader',
  leader: 'leader',
  member: 'member',
  everyone: 'everyone',
  warRole: 'war'
};

const _rolesPriority: Record<string, number> = {
  leader: 1,
  coLeader: 2,
  admin: 3,
  member: 4,
  everyone: 5,
  warRole: 6
};

export default class AutoRoleListCommand extends Command {
  public constructor() {
    super('autorole-list', {
      category: 'setup',
      channel: 'guild',
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { expand?: boolean }) {
    const clans = await this.client.storage.find(interaction.guildId);
    const rolesMap = await this.client.rolesManager.getGuildRolesMap(interaction.guildId);

    const allowNonFamilyTownHallRoles = this.client.settings.get<boolean>(interaction.guild, Settings.ALLOW_EXTERNAL_ACCOUNTS, false);
    const allowNonFamilyLeagueRoles = this.client.settings.get<boolean>(
      interaction.guildId,
      Settings.ALLOW_EXTERNAL_ACCOUNTS_LEAGUE,
      false
    );

    const leagueRoles = Array.from(new Set(Object.values(rolesMap.leagueRoles).filter((id) => id)));
    const builderLeagueRoles = Array.from(new Set(Object.values(rolesMap.builderLeagueRoles).filter((id) => id)));
    const townHallRoles = Array.from(new Set(Object.values(rolesMap.townHallRoles).filter((id) => id)));
    const builderHallRoles = Array.from(new Set(Object.values(rolesMap.builderHallRoles).filter((id) => id)));

    const _clanRolesAggregated = Object.values(rolesMap.clanRoles ?? {})
      .map((_rMap) => Object.entries(_rMap.roles))
      .flat()
      .map(([role, roleId]) => ({ role, roleId }))
      .sort((a, b) => _rolesPriority[a.role] - _rolesPriority[b.role])
      .reduce<Record<string, { roleIds: string[]; role: string }>>((prev, { role, roleId }) => {
        if (role && roleId && role in _rolesPriority) {
          prev[role] ??= { role, roleIds: [] };
          if (!prev[role].roleIds.includes(roleId)) prev[role].roleIds.push(roleId);
        }
        return prev;
      }, {});
    const _clanRoles = Object.values(_clanRolesAggregated);

    const warRoles = Array.from(
      new Set(
        Object.values(rolesMap.clanRoles ?? {})
          .map((_rMap) => _rMap.warRoleId)
          .flat()
          .filter((id) => id)
      )
    );

    const clanRoleList = clans
      .map((clan) => {
        const roleSet = rolesMap.clanRoles[clan.tag];
        const flattenRolesMap = Object.entries({ ...(roleSet?.roles ?? {}), warRole: roleSet?.warRoleId })
          .sort(([a], [b]) => _rolesPriority[a] - _rolesPriority[b])
          .reduce<Record<string, { roleId: string; roles: string[] }>>((prev, [role, roleId]) => {
            if (role && roleId && role in _rolesPriority) {
              prev[roleId] ??= { roleId, roles: [] };
              prev[roleId].roles.push(role);
            }
            return prev;
          }, {});

        return {
          name: `${clan.nickname || clan.name} (${clan.tag})`,
          roles: Object.values(flattenRolesMap)
        };
      })
      .filter((roleSet) => roleSet.roles.length);

    const embed = new EmbedBuilder();
    embed.setColor(this.client.embed(interaction));
    embed.setURL('https://docs.clashperk.com/features/auto-role');
    embed.setTitle('AutoRole Settings');

    if (args.expand && clanRoleList.length) {
      embed.setDescription(
        [
          clanRoleList
            .map((clan) => {
              return [
                `${clan.name}`,
                `${clan.roles.map(({ roles, roleId }) => `- <@&${roleId}> (${roles.map((r) => _rolesMap[r]).join(', ')})`).join('\n')}`
              ];
            })
            .flat()
            .join('\n')
        ].join('\n')
      );
    } else {
      embed.setDescription(
        [
          '**Clan Roles**',
          _clanRoles
            .map(({ role, roleIds }) => {
              return `*${title(_rolesMap[role])} Roles*\n${roleIds.map((id) => `<@&${id}>`).join(' ')}`;
            })
            .join('\n') || 'None'
        ].join('\n')
      );

      embed.addFields({ name: 'War Roles', value: warRoles.map((id) => `<@&${id}>`).join(' ') || 'None' });
      embed.addFields({
        name: 'TownHall Roles' + (townHallRoles.length && !allowNonFamilyTownHallRoles ? ' (Family Only)' : ''),
        value: [townHallRoles.map((id) => `<@&${id}>`).join(' ') || 'None'].join(' ')
      });
      embed.addFields({
        name: 'BuilderHall Roles' + (builderHallRoles.length && !allowNonFamilyTownHallRoles ? ' (Family Only)' : ''),
        value: [builderHallRoles.map((id) => `<@&${id}>`).join(' ') || 'None'].join(' ')
      });
      embed.addFields({
        name: 'League Roles' + (leagueRoles.length && !allowNonFamilyLeagueRoles ? ' (Family Only)' : ''),
        value: [leagueRoles.map((id) => `<@&${id}>`).join(' ') || 'None'].join(' ')
      });
      embed.addFields({
        name: 'Builder League Roles' + (builderLeagueRoles.length && !allowNonFamilyLeagueRoles ? ' (Family Only)' : ''),
        value: [builderLeagueRoles.map((id) => `<@&${id}>`).join(' ') || 'None'].join(' ')
      });
      embed.addFields({
        name: 'Family Leaders Roles',
        value: rolesMap.familyLeadersRoles.map((id) => this.getRoleOrNone(id)).join(', ') || 'None'
      });
      embed.addFields({ name: 'Family Role', value: this.getRoleOrNone(rolesMap.familyRoleId) });
      embed.addFields({ name: 'Exclusive Family Role', value: this.getRoleOrNone(rolesMap.exclusiveFamilyRoleId) });
      embed.addFields({
        name: 'EOS Push Role',
        value:
          rolesMap.eosPushClans.length && rolesMap.eosPushClanRoles
            ? rolesMap.eosPushClanRoles.map((id) => this.getRoleOrNone(id)).join(', ')
            : 'None'
      });
      embed.addFields({ name: 'Guest Role', value: this.getRoleOrNone(rolesMap.guestRoleId) });
      embed.addFields({ name: 'Verified Role', value: this.getRoleOrNone(rolesMap.verifiedRoleId) });
    }

    const roleRemovalDelays = this.client.settings.get<number>(interaction.guild, Settings.ROLE_REMOVAL_DELAYS, 0);
    const roleAdditionDelays = this.client.settings.get<number>(interaction.guild, Settings.ROLE_ADDITION_DELAYS, 0);
    const useAutoRole = this.client.settings.get<boolean>(interaction.guild, Settings.USE_AUTO_ROLE, true);
    const requiresVerification = this.client.settings.get<boolean>(interaction.guildId, Settings.VERIFIED_ONLY_CLAN_ROLES, false);

    const footerTexts: string[] = [];
    if (roleAdditionDelays) {
      footerTexts.push(`* ${ms(roleAdditionDelays, { long: true })} role addition delay.`);
    }
    if (roleRemovalDelays) {
      footerTexts.push(`* ${ms(roleRemovalDelays, { long: true })} role removal delay.`);
    }
    if (requiresVerification) {
      footerTexts.push('* Clan role requires in-game API Token verification.');
    }
    if (!useAutoRole) {
      footerTexts.push('* Auto updating is disabled! Use /config to enable it.');
    }
    if (footerTexts.length) embed.setFooter({ text: footerTexts.join('\n') });

    const customId = this.createId({ cmd: this.id, expand: !args.expand });
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Primary)
        .setCustomId(customId)
        .setLabel(args.expand ? 'All Roles' : 'Clan Specific Roles')
    );

    return interaction.editReply({ embeds: [embed], components: clanRoleList.length ? [row] : [] });
  }

  private getRoleOrNone(id?: string | null) {
    return id ? `<@&${id}>` : 'None';
  }
}
