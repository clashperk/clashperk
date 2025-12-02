import { Collections } from '@app/constants';
import { ClanStoresEntity } from '@app/entities';
import { CommandInteraction } from 'discord.js';
import { UpdateFilter } from 'mongodb';
import { Command } from '../../lib/handlers.js';

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

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: { clan: string; alias_name?: string; clan_nickname?: string }
  ) {
    if (!args.alias_name && !args.clan_nickname) {
      return interaction.editReply(
        this.i18n('command.alias.create.no_name', { lng: interaction.locale })
      );
    }
    if (args.alias_name?.startsWith('#')) {
      return interaction.editReply(
        this.i18n('command.alias.create.no_hash', { lng: interaction.locale })
      );
    }
    if (args.alias_name && /\s+/g.test(args.alias_name)) {
      return interaction.editReply(
        this.i18n('command.alias.create.no_whitespace', { lng: interaction.locale })
      );
    }

    const tag = this.parseTag(args.clan);
    if (!tag) {
      return interaction.editReply(
        this.i18n('command.alias.create.no_clan', { lng: interaction.locale })
      );
    }

    if (args.alias_name) {
      const clan = await this.client.db
        .collection(Collections.CLAN_STORES)
        .findOne({ guild: interaction.guild.id, alias: args.alias_name });
      if (clan && clan.tag !== tag) {
        return interaction.editReply(
          this.i18n('command.alias.create.exists', {
            lng: interaction.locale,
            name: args.alias_name
          })
        );
      }
    }

    const record: UpdateFilter<ClanStoresEntity> = {};
    if (args.clan_nickname) {
      if (!/^none$/i.test(args.clan_nickname)) {
        record.$set = { nickname: args.clan_nickname.trim() };
      } else {
        record.$unset = { nickname: true };
      }
    }

    if (args.alias_name) {
      if (!/^none$/i.test(args.alias_name)) {
        record.$set = { ...record.$set, alias: args.alias_name.trim() };
      } else {
        record.$unset = { ...record.$unset, alias: true };
      }
    }

    const updated = await this.client.db
      .collection<ClanStoresEntity>(Collections.CLAN_STORES)
      .updateOne({ guild: interaction.guild.id, tag }, record);

    if (!updated.matchedCount) {
      return interaction.editReply(
        this.i18n('command.alias.create.clan_not_linked', { lng: interaction.locale })
      );
    }

    return interaction.editReply(
      this.i18n('command.alias.create.success', { lng: interaction.locale })
    );
  }
}
