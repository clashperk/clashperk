import { FeatureFlags, Settings } from '@app/constants';
import { CommandInteraction, Role, User } from 'discord.js';
import { Command } from '../../lib/index.js';

export default class WhitelistCommand extends Command {
  public constructor() {
    super('whitelist', {
      category: 'whitelist',
      userPermissions: ['ManageGuild'],
      clientPermissions: ['EmbedLinks'],
      channel: 'guild',
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: {
      command: string;
      user_or_role: User | Role;
      clear?: boolean;
      list?: boolean;
    }
  ) {
    const isWhitelistEnabled = await this.client.isFeatureEnabled(FeatureFlags.COMMAND_WHITELIST, interaction.guildId);
    if (!isWhitelistEnabled) {
      return interaction.editReply({
        content: 'Your server is not enabled for the experimental whitelist feature, contact support for more information.'
      });
    }

    if (args.clear) {
      await this.client.settings.removeFromWhiteList(interaction.guild, { commandId: args.command, userOrRoleId: args.user_or_role.id });
      return interaction.editReply({
        content: `### Successfully cleared the whitelist for ${args.user_or_role.toString()} on ${this.client.commands.get(args.command)}`
      });
    }

    if (args.list) {
      const commandWhitelist = this.client.settings.get<{ key: string; userOrRoleId: string; commandId: string; isRole: boolean }[]>(
        interaction.guild,
        Settings.COMMAND_WHITELIST,
        []
      );

      const content = commandWhitelist.map((whitelist) => {
        const userOrRole = whitelist.isRole
          ? interaction.guild.roles.cache.get(whitelist.userOrRoleId)?.toString()
          : interaction.guild.members.cache.get(whitelist.userOrRoleId)?.toString();
        return `**${whitelist.commandId}** - ${userOrRole}`;
      });

      return interaction.editReply({
        allowedMentions: { parse: [] },
        content: [
          `### Whitelist for ${this.client.commands.get(args.command)}`,
          content.join('\n') || 'No whitelisted users or roles.'
        ].join('\n')
      });
    }

    if (!args.user_or_role || !args.command)
      return interaction.editReply({ content: 'You must provide a user or role and a command to whitelist.' });

    const isBot = args.user_or_role instanceof User && args.user_or_role.bot;
    if (isBot) return interaction.editReply({ content: 'You cannot whitelist a bot.' });

    await this.client.settings.addToWhiteList(interaction.guild, {
      commandId: args.command,
      userOrRoleId: args.user_or_role.id,
      isRole: args.user_or_role instanceof Role
    });

    return interaction.editReply({
      allowedMentions: { parse: [] },
      content: [
        `### Successfully whitelisted ${args.user_or_role.toString()} for ${this.client.commands.get(args.command)}`,
        '- You can whitelist a role or a user. Once you whitelist a command, only that role or user will be able to use it. The command will be restricted for others, blocking them from using it unless they have other managerial roles or permissions.',
        '- The whitelist function is limited to commands and does not extend to buttons or select menus. For better control over both commands and buttons, utilize manager roles.'
      ].join('\n')
    });
  }
}
