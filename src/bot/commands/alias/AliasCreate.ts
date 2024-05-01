import { CommandInteraction } from 'discord.js';
import { ClanStoresEntity } from '../../entities/clan-stores.entity.js';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';

export default class AliasCreateCommand extends Command {
  public constructor() {
    super('alias-create', {
      category: 'setup',
      channel: 'guild',
      userPermissions: ['ManageGuild'],
      defer: true,
      ephemeral: true
    });
  }

  private parseTag(tag?: string) {
    return tag ? `#${tag.toUpperCase().replace(/O/g, '0').replace(/^#/g, '')}` : null;
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { clan: string; alias_name?: string; clan_nickname?: string }) {
    if (!args.alias_name && !args.clan_nickname) {
      return interaction.editReply(this.i18n('command.alias.create.no_name', { lng: interaction.locale }));
    }
    if (args.alias_name?.startsWith('#')) {
      return interaction.editReply(this.i18n('command.alias.create.no_hash', { lng: interaction.locale }));
    }
    if (args.alias_name && /\s+/g.test(args.alias_name)) {
      return interaction.editReply(this.i18n('command.alias.create.no_whitespace', { lng: interaction.locale }));
    }

    const tag = this.parseTag(args.clan);
    if (!tag) {
      return interaction.editReply(this.i18n('command.alias.create.no_clan', { lng: interaction.locale }));
    }

    if (args.alias_name) {
      const clan = await this.client.db
        .collection(Collections.CLAN_STORES)
        .findOne({ guild: interaction.guild.id, alias: args.alias_name });
      if (clan && clan.tag !== tag) {
        return interaction.editReply(this.i18n('command.alias.create.exists', { lng: interaction.locale, name: args.alias_name }));
      }
    }

    const record: Partial<ClanStoresEntity> = {};
    if (args.clan_nickname) record.nickname = args.clan_nickname.trim();
    if (args.alias_name) record.alias = args.alias_name.trim();

    const updated = await this.client.db
      .collection<ClanStoresEntity>(Collections.CLAN_STORES)
      .updateOne({ guild: interaction.guild.id, tag }, { $set: record });

    if (!updated.matchedCount) {
      return interaction.editReply(this.i18n('command.alias.create.clan_not_linked', { lng: interaction.locale }));
    }

    return interaction.editReply(this.i18n('command.alias.create.success', { lng: interaction.locale }));
  }
}
