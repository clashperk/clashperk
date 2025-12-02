import { PLAYER_LEAGUE_NAMES, Settings, TROPHY_ROLES } from '@app/constants';
import { CommandInteraction, Guild, MessageFlags, Role } from 'discord.js';
import { TrophyRolesConfig } from '../../core/roles-manager.js';
import { Args, Command } from '../../lib/handlers.js';

const TROPHY_RANGE_KEYS = TROPHY_ROLES.map((range) => `${range.min}_${range.max}`);

export default class AutoLeagueRoleCommand extends Command {
  public constructor() {
    super('setup-league-roles', {
      aliases: ['autorole-leagues'],
      category: 'roles',
      channel: 'guild',
      userPermissions: ['ManageGuild'],
      clientPermissions: ['EmbedLinks', 'ManageRoles'],
      defer: true,
      ephemeral: true
    });
  }

  public args(): Args {
    return {
      allow_non_family_accounts: {
        id: 'allowExternal',
        match: 'BOOLEAN'
      }
    };
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: {
      allowExternal: boolean;
    } & Record<string, Role | null>
  ) {
    const clans = await this.client.storage.find(interaction.guildId);
    if (!clans.length) {
      return interaction.editReply(
        this.i18n('common.no_clans_linked', {
          lng: interaction.locale,
          command: this.client.commands.SETUP_ENABLE
        })
      );
    }

    const trophyRanges: Record<string, Role> = {};
    for (const key in args) {
      if (TROPHY_RANGE_KEYS.includes(key)) {
        const range = TROPHY_ROLES.find((range) => `${range.min}_${range.max}` === key);
        if (range && args[key]) {
          trophyRanges[key] = args[key];
        }
      }
    }

    const rolesMap: Record<string, Role> = {};
    for (const key in args) {
      if (PLAYER_LEAGUE_NAMES.includes(key)) {
        rolesMap[key] = args[key]!;
      }
    }

    const selectedLeagueRoles = Object.entries(rolesMap).map(([league, role]) => ({
      league,
      role
    }));
    const selectedTrophyRoles = Object.entries(trophyRanges).map(([key, role]) => {
      const [min, max] = key.split('_').map(Number);
      return { min, max, role, key };
    });
    const selectedRoles = [...selectedLeagueRoles, ...selectedTrophyRoles];

    if (typeof args.allowExternal === 'boolean') {
      await this.client.settings.set(
        interaction.guildId,
        Settings.ALLOW_EXTERNAL_ACCOUNTS_LEAGUE,
        Boolean(args.allowExternal)
      );
      if (!selectedRoles.length) {
        return interaction.editReply('League roles settings updated.');
      }
    }

    if (!selectedRoles.length) {
      return interaction.followUp({
        content: 'You must select at least one role.',
        flags: MessageFlags.Ephemeral
      });
    }

    if (selectedRoles.some((r) => this.isSystemRole(r.role, interaction.guild))) {
      const systemRoles = selectedRoles.filter(({ role }) =>
        this.isSystemRole(role, interaction.guild)
      );
      return interaction.editReply(
        `${this.i18n('command.autorole.no_system_roles', { lng: interaction.locale })} (${systemRoles
          .map((r) => `<@&${r.role.id}>`)
          .join(', ')})`
      );
    }

    if (selectedRoles.some((r) => this.isHigherRole(r.role, interaction.guild))) {
      return interaction.editReply(
        this.i18n('command.autorole.no_higher_roles', { lng: interaction.locale })
      );
    }

    const leagueRolesConfig = this.client.settings.get<Record<string, string>>(
      interaction.guildId,
      Settings.LEAGUE_ROLES,
      {}
    );
    const trophyRolesConfig = this.client.settings.get<Record<string, TrophyRolesConfig>>(
      interaction.guildId,
      Settings.TROPHY_ROLES,
      {}
    );

    Object.assign(
      leagueRolesConfig,
      Object.fromEntries(selectedLeagueRoles.map((selected) => [selected.league, selected.role.id]))
    );
    Object.assign(
      trophyRolesConfig,
      Object.fromEntries(
        selectedTrophyRoles.map((selected) => [
          selected.key,
          { key: selected.key, min: selected.min, max: selected.max, roleId: selected.role.id }
        ])
      )
    );

    await this.client.settings.set(interaction.guildId, Settings.LEAGUE_ROLES, leagueRolesConfig);
    await this.client.settings.set(interaction.guildId, Settings.TROPHY_ROLES, trophyRolesConfig);

    this.client.storage.updateClanLinks(interaction.guildId);
    // TODO: Refresh Roles

    const leagueRoles = PLAYER_LEAGUE_NAMES.map((league) => ({
      league,
      role: leagueRolesConfig[league]
    }));
    const trophyRoles = TROPHY_ROLES.map((range) => {
      const key = `${range.min}_${range.max}`;
      return {
        key,
        min: range.min,
        max: range.max,
        role: trophyRolesConfig[key]?.roleId
      };
    });

    return interaction.editReply({
      allowedMentions: { parse: [] },
      content: [
        '**League Roles**',
        leagueRoles
          .map(
            ({ league, role }) =>
              `${league.replace(/\b(\w)/g, (char) => char.toUpperCase())} ${role ? `<@&${role}>` : ''}`
          )
          .join('\n'),
        '',
        '**Trophy Roles**',
        trophyRoles
          .map(({ min, max, role }) => `${min} - ${max} ${role ? `<@&${role}>` : ''}`)
          .join('\n'),
        '',
        args.allowExternal ? '' : '(Family Only) Roles will be given to family members only.'
      ].join('\n')
    });
  }

  private isSystemRole(role: Role, guild: Guild) {
    return role.managed || role.id === guild.id;
  }

  private isHigherRole(role: Role, guild: Guild) {
    return role.position > guild.members.me!.roles.highest.position;
  }
}
