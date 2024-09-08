import { APIClan, APIPlayer } from 'clashofclans.js';
import { BaseInteraction, CommandInteraction, User } from 'discord.js';
import { ObjectId } from 'mongodb';
import { unique } from 'radash';
import { ClanStoresEntity } from '../entities/clan-stores.entity.js';
import { PlayerLinksEntity } from '../entities/player-links.entity.js';
import {
  Collections,
  DISCORD_ID_REGEX,
  DISCORD_MENTION_REGEX,
  ESCAPE_CHAR_REGEX,
  ElasticIndex,
  PATREON_LINK,
  Settings,
  TAG_REGEX,
  getHttpStatusText
} from '../util/constants.js';
import { i18n } from '../util/i18n.js';
import Client from './client.js';
import { ElasticIndexer } from './indexer.js';

export default class Resolver {
  private readonly indexer: ElasticIndexer;

  public constructor(private readonly client: Client) {
    this.indexer = new ElasticIndexer(client);
  }

  public async resolvePlayer(interaction: BaseInteraction, args?: string): Promise<(APIPlayer & { user?: User }) | null> {
    args = (args?.replace(ESCAPE_CHAR_REGEX, '') ?? '').trim();
    const parsed = await this.parseArgument(interaction, args);

    if (parsed.isTag) return this.getPlayer(interaction, args);
    if (!parsed.user) {
      return this.fail(interaction, `**${getHttpStatusText(404, interaction.locale)}**`);
    }

    const { user } = parsed;
    const linkedPlayerTag = await this.getLinkedPlayerTag(user.id);
    if (linkedPlayerTag) return this.getPlayer(interaction, linkedPlayerTag, user);

    if (interaction.user.id === user.id) {
      return this.fail(interaction, i18n('common.no_player_tag', { lng: interaction.locale, command: this.client.commands.LINK_CREATE }));
    }

    return this.fail(
      interaction,
      i18n('common.player_not_linked', {
        lng: interaction.locale,
        user: parsed.user.displayName,
        command: this.client.commands.LINK_CREATE
      })
    );
  }

  private async clanAlias(guildId: string | null, alias: string) {
    if (!guildId) return null;

    return this.client.db
      .collection<{ name: string; tag: string }>(Collections.CLAN_STORES)
      .findOne({ guild: guildId, alias }, { collation: { strength: 2, locale: 'en' }, projection: { tag: 1, name: 1 } });
  }

  public async resolveClan(interaction: BaseInteraction, args?: string): Promise<APIClan | null> {
    args = (args?.replace(ESCAPE_CHAR_REGEX, '') ?? '').trim();
    const parsed = await this.parseArgument(interaction, args);

    const clan = await this.clanAlias(interaction.guildId, args.trim());
    if (parsed.isTag) return this.getClan(interaction, clan && !args.startsWith('#') ? clan.tag : args, true);

    if (!parsed.user) {
      if (clan) return this.getClan(interaction, clan.tag);
      return this.fail(interaction, `**${getHttpStatusText(404, interaction.locale)}**`);
    }

    if (parsed.matched) {
      const linkedClanTag = await this.getLinkedUserClan(parsed.user.id, false);
      if (linkedClanTag) return this.getClan(interaction, linkedClanTag);
    } else {
      const linkedClanTag = await this.getLinkedClanTag(interaction, parsed.user.id);
      if (linkedClanTag) return this.getClan(interaction, linkedClanTag);
    }

    if (interaction.user.id === parsed.user.id) {
      return this.fail(interaction, i18n('common.no_clan_tag', { lng: interaction.locale, command: this.client.commands.LINK_CREATE }));
    }

    return this.fail(
      interaction,
      i18n('common.clan_not_linked', {
        lng: interaction.locale,
        user: parsed.user.displayName,
        command: this.client.commands.LINK_CREATE
      })
    );
  }

  public async getPlayer(interaction: BaseInteraction, tag: string, user?: User): Promise<(APIPlayer & { user?: User }) | null> {
    const { body, res } = await this.client.http.getPlayer(tag);
    if (res.ok) this.updateLastSearchedPlayer(interaction.user, body);

    if (res.ok) return { ...body, user };

    return this.fail(interaction, `**${getHttpStatusText(res.status, interaction.locale)}**`);
  }

  public async getClan(interaction: BaseInteraction, tag: string, checkAlias = false): Promise<APIClan | null> {
    const { body, res } = await this.client.http.getClan(tag);
    if (res.ok) this.updateLastSearchedClan(interaction.user, body);

    if (res.ok) return body;

    if (checkAlias && res.status === 404 && !tag.startsWith('#')) {
      const clan = await this.clanAlias(interaction.guildId, tag);
      if (clan) return this.getClan(interaction, clan.tag);
    }

    return this.fail(interaction, `**${getHttpStatusText(res.status, interaction.locale)}**`);
  }

  private async updateLastSearchedPlayer(user: User, player: APIPlayer) {
    await this.client.db.collection(Collections.USERS).updateOne(
      { userId: user.id },
      {
        $set: {
          lastSearchedPlayerTag: player.tag,
          discriminator: user.discriminator,
          displayName: user.displayName,
          username: user.username
        }
      },
      { upsert: true }
    );
    return this.indexer.index({ name: player.name, tag: player.tag, userId: user.id }, ElasticIndex.RECENT_PLAYERS);
  }

  private async updateLastSearchedClan(user: User, clan: APIClan) {
    await this.client.db.collection(Collections.USERS).updateOne(
      { userId: user.id },
      {
        $set: {
          lastSearchedClanTag: clan.tag,
          discriminator: user.discriminator,
          displayName: user.displayName,
          username: user.username
        }
      },
      { upsert: true }
    );
    return this.indexer.index({ name: clan.name, tag: clan.tag, userId: user.id }, ElasticIndex.RECENT_CLANS);
  }

  private async fail(interaction: BaseInteraction, content: string) {
    if (interaction.isCommand()) {
      return interaction.editReply({ content }).then(() => null);
    } else if (interaction.isMessageComponent()) {
      return interaction.followUp({ content, ephemeral: true }).then(() => null);
    }
    return null;
  }

  private async parseArgument(interaction: BaseInteraction, args: string) {
    if (!args) return { user: interaction.user, matched: false, isTag: false };

    const id = DISCORD_MENTION_REGEX.exec(args)?.[1] ?? DISCORD_ID_REGEX.exec(args)?.[0];
    if (id) {
      const user = this.client.users.cache.get(id) ?? (await this.client.users.fetch(id).catch(() => null));
      if (user) return { user, matched: true, isTag: false };
      return { user: null, matched: true, isTag: false };
    }

    return { user: null, matched: false, isTag: TAG_REGEX.test(args) };
  }

  private async getLinkedClanTag(interaction: BaseInteraction, userId: string) {
    const [guildLinkedClan, userLinkedClanTag] = await Promise.all([
      interaction.guildId && interaction.channelId
        ? this.client.db.collection(Collections.CLAN_STORES).findOne({ channels: interaction.channelId, guild: interaction.guildId })
        : null,
      this.getLinkedUserClan(userId, true)
    ]);

    return guildLinkedClan?.tag ?? userLinkedClanTag;
  }

  private async getLinkedPlayerTag(userId: string) {
    const [linkedPlayer, lastSearchedPlayerTag] = await Promise.all([
      this.client.db.collection<PlayerLinksEntity>(Collections.PLAYER_LINKS).findOne({ userId }, { sort: { order: 1 } }),
      this.getLastSearchedPlayerTag(userId)
    ]);

    if (!linkedPlayer) {
      const externalLinks = await this.client.http.getPlayerTags(userId);
      return externalLinks.at(0) ?? lastSearchedPlayerTag;
    }

    return linkedPlayer?.tag ?? lastSearchedPlayerTag;
  }

  private async getLinkedUserClan(userId: string, withLastSearchedClan = false) {
    const user = await this.client.db.collection(Collections.USERS).findOne({ userId });
    return user?.clan?.tag ?? (withLastSearchedClan ? user?.lastSearchedClanTag : null) ?? null;
  }

  private async getLastSearchedPlayerTag(userId: string) {
    const user = await this.client.db.collection(Collections.USERS).findOne({ userId });
    return user?.lastSearchedPlayerTag ?? null;
  }

  public async getLinkedPlayerTags(userId: string) {
    const [players, others] = await Promise.all([
      this.client.db.collection(Collections.PLAYER_LINKS).find({ userId }).toArray(),
      this.client.http.getPlayerTags(userId)
    ]);
    return Array.from(new Set([...players.map((en) => en.tag), ...others.map((tag) => tag)]));
  }

  public async getLinkedUsersMap(players: { tag: string }[]) {
    const fetched = await Promise.all([
      this.client.http.getDiscordLinks(players),
      this.client.db
        .collection<PlayerLinksEntity>(Collections.PLAYER_LINKS)
        .find({ tag: { $in: players.map((player) => player.tag) } })
        .toArray()
    ]);

    const result = fetched.flat().map((link) => {
      return { tag: link.tag, userId: link.userId, verified: link.verified, displayName: link.displayName, username: link.username };
    });

    return result.reduce<Record<string, { userId: string; tag: string; verified: boolean; displayName: string; username: string }>>(
      (acc, link) => {
        acc[link.tag] ??= link; // eslint-disable-line
        const prev = acc[link.tag];

        if (!prev.verified && link.verified) acc[link.tag].verified = true;

        if (prev.username === 'unknown' && link.username !== 'unknown') {
          acc[link.tag].username = link.username;
          acc[link.tag].displayName = link.displayName;
        }

        if (prev.userId !== link.userId) acc[link.tag] = link;
        return acc;
      },
      {}
    );
  }

  public async getLinkedUsers(players: { tag: string }[]) {
    const users = await this.getLinkedUsersMap(players);
    return Object.values(users);
  }

  public async getUser(playerTag: string) {
    const link = await this.client.db.collection(Collections.PLAYER_LINKS).findOne({ tag: playerTag });
    if (!link) return null;
    return this.client.users.fetch(link.userId).catch(() => null);
  }

  public async getPlayers(userId: string, limit = 25): Promise<(APIPlayer & { verified: boolean })[]> {
    const [players, others] = await Promise.all([
      this.client.db.collection(Collections.PLAYER_LINKS).find({ userId }).sort({ order: 1 }).toArray(),
      this.client.http.getPlayerTags(userId)
    ]);

    const verifiedPlayersMap = players.reduce<Record<string, boolean>>((prev, curr) => {
      prev[curr.tag] = Boolean(curr.verified);
      return prev;
    }, {});

    const playerTagSet = new Set([...players.map((en) => en.tag), ...others.map((tag) => tag)]);
    const playerTags = Array.from(playerTagSet)
      .slice(0, limit)
      .map((tag) => this.client.http.getPlayer(tag));

    const result = (await Promise.all(playerTags)).filter(({ res }) => res.ok).map(({ body }) => body);
    return result.map((player) => ({ ...player, verified: verifiedPlayersMap[player.tag] }));
  }

  private async getClansFromCategory(guildId: string, categoryId: string) {
    const clans = await this.client.db
      .collection<ClanStoresEntity>(Collections.CLAN_STORES)
      .find({ guild: guildId, categoryId: ObjectId.isValid(categoryId) ? new ObjectId(categoryId) : null })
      .toArray();
    return clans.map((clan) => clan.tag);
  }

  public async resolveArgs(args?: string) {
    if (!args || args === '*') return [];

    if (/^ARGS/.test(args)) {
      const tags = await this.client.redis.connection.get(args);
      if (tags) return tags.split(/\W+/).map((tag) => (TAG_REGEX.test(tag) ? this.client.http.fixTag(tag) : tag));
    }

    if (/^CATEGORY:/.test(args)) {
      const [, guildId, categoryId] = args.split(':');
      return this.getClansFromCategory(guildId, categoryId);
    }

    return args.split(/\W+/).map((tag) => (TAG_REGEX.test(tag) ? this.client.http.fixTag(tag) : tag));
  }

  public async enforceSecurity(
    interaction: CommandInteraction<'cached'>,
    {
      collection,
      tag
    }: {
      tag?: string;
      collection: Collections;
    }
  ) {
    if (!tag) {
      await interaction.editReply(i18n('common.no_clan_tag_first_time', { lng: interaction.locale }));
      return null;
    }
    const data = await this.getClan(interaction, tag, true);
    if (!data) return null;

    const memberCount = interaction.guild.memberCount;
    const [features, clans] = await Promise.all([
      this.client.storage.getEnabledFeatures(interaction.guildId),
      this.client.storage.find(interaction.guildId)
    ]);

    const max = this.client.settings.get<number>(interaction.guildId, Settings.CLAN_LIMIT, 2);
    const isPatron = this.client.patreonHandler.get(interaction.guildId);
    const featuresPerClan = unique(features.map((clan) => clan.clanTag));
    const allowedClans = clans.filter((clan) => featuresPerClan.includes(clan.tag)).map((clan) => clan.name);

    if (
      collection !== Collections.CLAN_STORES &&
      featuresPerClan.length >= max &&
      !featuresPerClan.includes(data.tag) &&
      // make me invincible
      !this.client.isOwner(interaction.user) &&
      !this.client.isOwner(interaction.guild.ownerId)
    ) {
      if (isPatron) {
        await interaction.editReply(
          '### You have reached the maximum limit of automation. Please [contact us](https://discord.gg/ppuppun) to increase the limit.'
        );
      } else {
        await interaction.editReply({
          content: [
            `### The maximum number of clans has been reached. Please consider supporting us through our [Patreon](${PATREON_LINK}) to add more than ${max} clans (${allowedClans.join(', ')})`,
            '',
            `### Already subscribed? Use the ${this.client.commands.REDEEM} command.`
          ].join('\n')
          // content: this.client.i18n('common.clan_limit', { lng: interaction.locale, command: this.client.commands.REDEEM })
        });
      }
      return null;
    }

    const links = await this.client.db.collection(Collections.PLAYER_LINKS).find({ userId: interaction.user.id }).toArray();
    const count = await this.client.db
      .collection(Collections.CLAN_STORES)
      .countDocuments({ tag: data.tag, guild: { $ne: interaction.guildId } });
    const code = ['CP', interaction.guild.id.slice(-2)].join('');
    const clan = clans.find((clan) => clan.tag === data.tag);

    if (
      (count > 5 || clans.length >= this.clanLimit(memberCount, data.tag, clans)) &&
      !isPatron &&
      !clan?.verified &&
      !this.verifyClan(code, data, links) &&
      // make me invincible
      !this.client.isOwner(interaction.user) &&
      !this.client.isOwner(interaction.guild.ownerId)
    ) {
      await interaction.editReply({
        content: this.client.i18n('common.clan_verification', {
          lng: interaction.locale,
          code,
          command: this.client.commands.VERIFY
        })
      });
      return null;
    }

    return data;
  }

  private verifyClan(code: string, clan: APIClan, tags: { tag: string; verified: boolean }[]) {
    const verifiedTags = tags.filter((en) => en.verified).map((en) => en.tag);
    return (
      clan.memberList.filter((m) => ['coLeader', 'leader'].includes(m.role)).some((m) => verifiedTags.includes(m.tag)) ||
      clan.description.toUpperCase().includes(code)
    );
  }

  private clanLimit(memberCount: number, tag: string, clans: { tag: string; active: boolean }[]) {
    const existing = clans
      .filter((clan) => clan.active)
      .map((clan) => clan.tag)
      .includes(tag);

    if (memberCount < 10 && !existing) return 2;
    if (memberCount < 50 && !existing) return 5;
    if (memberCount < 100 && !existing) return 20;
    return 100;
  }
}
