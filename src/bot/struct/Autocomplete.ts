import { AutocompleteInteraction } from 'discord.js';
import { Filter } from 'mongodb';
import { nanoid } from 'nanoid';
import { sift, unique } from 'radash';
import { ClanCategoriesEntity } from '../entities/clan-categories.entity.js';
import { FlagsEntity } from '../entities/flags.entity.js';
import { PlayerModel, UserInfoModel } from '../types/index.js';
import { Collections } from '../util/Constants.js';
import Client from './Client.js';

export class Autocomplete {
  public constructor(private readonly client: Client) {}

  public handle(interaction: AutocompleteInteraction<'cached'>) {
    const args = this.client.commandHandler.rawArgs(interaction);
    return this.exec(interaction, args);
  }

  public exec(interaction: AutocompleteInteraction<'cached'>, args: Record<string, unknown>) {
    const command = this.client.commandHandler.getCommand(args.commandName as string);
    if (!command) return null;
    return command.autocomplete(interaction, args);
  }

  public async flagSearchAutoComplete(
    interaction: AutocompleteInteraction<'cached'>,
    args: { player_tag?: string; flag_type?: 'ban' | 'strike' }
  ) {
    const filter: Filter<FlagsEntity> = {
      guild: interaction.guild.id,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
    };
    if (args.flag_type) filter.flagType = args.flag_type;

    if (args.player_tag) {
      const text = args.player_tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (this.client.http.isValidTag(text)) {
        filter.$or = [{ tag: this.client.http.fixTag(text) }, { name: { $regex: `.*${text}.*`, $options: 'i' } }];
      } else {
        filter.name = { $regex: `.*${text}.*`, $options: 'i' };
      }
    }

    const cursor = this.client.db.collection<FlagsEntity>(Collections.FLAGS).find(filter);
    if (!args.player_tag) cursor.sort({ _id: -1 });

    const flags = await cursor.limit(24).toArray();
    const players = flags.filter((flag, index) => flags.findIndex((f) => f.tag === flag.tag) === index);
    return interaction.respond(players.map((flag) => ({ name: `${flag.name} (${flag.tag})`, value: flag.tag })));
  }

  public async clanCategoriesAutoComplete(interaction: AutocompleteInteraction<'cached'>) {
    const categories = await this.client.storage.getOrCreateDefaultCategories(interaction.guildId);
    return interaction.respond(categories.slice(0, 25));
  }

  public async globalClanAutoComplete(interaction: AutocompleteInteraction<'cached'>, args: { player_tag?: string }) {
    const clans = await this.client.storage.find(interaction.guildId);
    const query: Filter<PlayerModel> = {
      'clan.tag': { $in: clans.map((clan) => clan.tag) }
    };

    if (args.player_tag) {
      const text = args.player_tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [{ name: { $regex: `.*${text}.*`, $options: 'i' } }, { tag: { $regex: `.*${text}.*`, $options: 'i' } }];
    }

    const cursor = this.client.db.collection<PlayerModel>(Collections.PLAYERS).find(query, { projection: { name: 1, tag: 1 } });
    if (!args.player_tag) cursor.sort({ lastSeen: -1 });
    const players = await cursor.limit(24).toArray();

    if (!players.length && args.player_tag) {
      const text = args.player_tag.slice(0, 100).trim();
      return interaction.respond([{ name: text, value: text }]);
    }
    if (!players.length) return interaction.respond([{ name: 'No players found.', value: '0' }]);

    const choices = players.map((player) => ({
      name: `${player.name} (${player.tag})`,
      value: player.tag
    }));

    return interaction.respond(choices);
  }

  public async clanAutoComplete(
    interaction: AutocompleteInteraction<'cached'>,
    { withCategory, isMulti }: { isMulti: boolean; withCategory: boolean }
  ) {
    const [clans, userClans] = await Promise.all([
      this.client.storage.find(interaction.guildId),
      this.getUserLinkedClan(interaction.user.id)
    ]);

    const choices = unique(
      [...userClans, ...clans].map((clan) => ({ value: clan.tag, name: `${clan.name} (${clan.tag})` })),
      (e) => e.value
    );

    if (withCategory) {
      const categoryIds = sift(clans.map((clan) => clan.categoryId));
      const categories = await this.client.db
        .collection<ClanCategoriesEntity>(Collections.CLAN_CATEGORIES)
        .find({ guildId: interaction.guildId, _id: { $in: categoryIds } }, { sort: { order: 1 }, limit: 10 })
        .toArray();
      if (categories.length) {
        choices.unshift(
          ...categories.map((category) => ({
            value: `CATEGORY:${interaction.guildId}:${category._id.toHexString()}`,
            name: `${category.displayName} (Category)`
          }))
        );
      }
    }

    if (!choices.length) return interaction.respond([{ name: 'Enter a clan tag.', value: '0' }]);

    if (isMulti) {
      choices.unshift({ value: '*', name: `All of these (${clans.length})` });
    }

    return interaction.respond(choices.slice(0, 25));
  }

  public async generateArgs(query: string) {
    query = query.trim();
    if (query.length > 100) {
      const key = `ARGS:${nanoid()}`;
      await this.client.redis.set(key, query, 60 * 60);
      return key;
    }
    return query;
  }

  private async getUserLinkedClan(userId: string) {
    const user = await this.client.db.collection<UserInfoModel>(Collections.USERS).findOne({ userId });
    if (!user?.clan) return [];
    return [{ name: user.clan.name ?? 'Unknown', tag: user.clan.tag }];
  }
}
