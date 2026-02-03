import { Collections } from '@app/constants';
import { CommandInteraction, Guild, Role } from 'discord.js';
import { Command } from '../../lib/handlers.js';

export default class AutoClanRoleCommand extends Command {
  public constructor() {
    super('setup-war-roles', {
      aliases: ['autorole-wars'],
      category: 'roles',
      channel: 'guild',
      userPermissions: ['ManageGuild'],
      clientPermissions: ['EmbedLinks', 'ManageRoles'],
      defer: true,
      ephemeral: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { role: Role; clan: string }) {
    const clan = await this.client.db
      .collection(Collections.CLAN_STORES)
      .findOne({ guild: interaction.guild.id, tag: this.client.coc.fixTag(args.clan) });
    if (!clan) {
      return interaction.editReply(
        this.i18n('common.no_clans_linked', {
          lng: interaction.locale,
          command: this.client.commands.SETUP_CLAN
        })
      );
    }

    if ([args.role].some((role) => this.isSystemRole(role, interaction.guild))) {
      return interaction.editReply(
        `${this.i18n('command.autorole.no_system_roles', { lng: interaction.locale })} (${args.role.id})`
      );
    }

    if ([args.role].some((role) => this.isHigherRole(role, interaction.guild))) {
      return interaction.editReply(
        this.i18n('command.autorole.no_higher_roles', { lng: interaction.locale })
      );
    }

    const roleInUse = await this.client.db
      .collection(Collections.CLAN_STORES)
      .findOne({ tag: { $ne: clan.tag }, guild: interaction.guild.id, warRole: args.role.id });

    if (roleInUse) {
      return interaction.editReply('This role is already in use by another clan.');
    }

    await this.client.db.collection(Collections.CLAN_STORES).updateMany(
      { tag: clan.tag, guild: interaction.guild.id },
      {
        $set: {
          warRole: args.role.id
        }
      }
    );

    this.client.storage.updateClanLinks(interaction.guildId);
    // TODO: Refresh Roles

    return interaction.editReply('Clan war role successfully enabled.');
  }

  private isSystemRole(role: Role, guild: Guild) {
    return role.managed || role.id === guild.id;
  }

  private isHigherRole(role: Role, guild: Guild) {
    return role.position > guild.members.me!.roles.highest.position;
  }
}
