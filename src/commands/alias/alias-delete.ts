import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/handlers.js';
import { Collections } from '../../util/constants.js';

export default class AliasDeleteCommand extends Command {
  public constructor() {
    super('alias-delete', {
      category: 'setup',
      channel: 'guild',
      userPermissions: ['ManageGuild'],
      ephemeral: true,
      defer: true
    });
  }

  private parseTag(tag?: string) {
    return tag ? `#${tag.toUpperCase().replace(/O/g, '0').replace(/^#/g, '')}` : null;
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { alias?: string }) {
    if (!args.alias) return interaction.editReply(this.i18n('command.alias.delete.no_name', { lng: interaction.locale }));

    const deleted = await this.client.db.collection(Collections.CLAN_STORES).findOneAndUpdate(
      {
        guild: interaction.guild.id,
        alias: { $exists: true },
        $or: [{ tag: this.parseTag(args.alias)! }, { alias: args.alias.trim() }]
      },
      { $unset: { alias: true } }
    );

    if (!deleted) {
      return interaction.editReply(this.i18n('command.alias.delete.no_result', { lng: interaction.locale, name: args.alias }));
    }

    return interaction.editReply(this.i18n('command.alias.delete.success', { lng: interaction.locale, name: deleted.alias! }));
  }
}
