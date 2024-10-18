import { Collections, Settings } from '@app/constants';
import {
  ClanCategoriesEntity,
  ClanStoresEntity,
  ClanWarLeagueGroupsEntity,
  ClanWarRemindersEntity,
  PlayerLinksEntity
} from '@app/entities';
import { APIClanWarLeagueGroup } from 'clashofclans.js';
import { ButtonInteraction, CommandInteraction, ForumChannel, Guild, MediaChannel, NewsChannel, TextChannel } from 'discord.js';
import moment from 'moment';
import { Collection, ObjectId, WithId } from 'mongodb';
import { createHash } from 'node:crypto';
import { cluster, unique } from 'radash';
import { i18n } from '../util/i18n.js';
import { Client } from './client.js';

const defaultCategories = ['War', 'CWL', 'Farming', 'Esports', 'Events'];

export class StorageHandler {
  public collection: Collection<ClanStoresEntity>;

  public constructor(private readonly client: Client) {
    this.collection = client.db.collection(Collections.CLAN_STORES);
  }

  public async find(guildId: string) {
    const key = this.client.settings.get<string>(guildId, Settings.CLANS_SORTING_KEY, 'name');
    return this.collection.find({ guild: guildId }, { sort: { [key]: 1 } }).toArray();
  }

  public async getClan(params: { guildId: string; clanTag: string }) {
    return this.collection.findOne({ guild: params.guildId, tag: params.clanTag });
  }

  public async getEnabledFeatures(guildId: string) {
    return this.client.db
      .collection(Collections.CLAN_LOGS)
      .aggregate<{ clanTag: string }>([
        { $match: { guildId } },
        { $lookup: { from: Collections.CLAN_STORES, localField: 'clanId', foreignField: '_id', as: 'root' } },
        { $unwind: { path: '$root', preserveNullAndEmptyArrays: true } },
        { $match: { root: { $exists: true } } },
        { $project: { clanTag: 1 } }
      ])
      .toArray();
  }

  public async cleanUpDeletedLogs(collection: Collections) {
    const result = await this.client.db
      .collection(collection)
      .aggregate([
        { $lookup: { from: Collections.CLAN_STORES, localField: 'clanId', foreignField: '_id', as: 'root' } },
        { $unwind: { path: '$root', preserveNullAndEmptyArrays: true } },
        { $match: { root: { $exists: false } } }
      ])
      .toArray();
    await this.client.db.collection(collection).deleteMany({ _id: { $in: result.map((doc) => doc._id) } });
  }

  public async search(guildId: string, query: string[]): Promise<WithId<ClanStoresEntity>[]> {
    if (!query.length) return [];
    return this.collection
      .find(
        {
          $or: [
            {
              tag: { $in: query.map((tag) => this.fixTag(tag)) }
            },
            {
              alias: { $in: query.map((alias) => alias) }
            }
          ],
          guild: guildId
        },
        { collation: { locale: 'en', strength: 2 }, sort: { name: 1 } }
      )
      .toArray();
  }

  public async getNickname(guildId: string, clanTag: string, defaultName: string): Promise<string> {
    const clan = await this.collection.findOne({ guild: guildId, tag: clanTag });
    return clan?.nickname ?? defaultName;
  }

  public async handleSearch(
    interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>,
    { args, required }: { args?: string; required?: boolean }
  ) {
    const tags = args === '*' ? [] : await this.client.resolver.resolveArgs(args);
    const isTotal = args === '*' || !args;

    if (!args && required) {
      await interaction.editReply(i18n('common.no_clan_tag', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE }));
      return { clans: null };
    }

    const clans =
      args === '*' || !args
        ? await this.client.storage.find(interaction.guildId)
        : await this.client.storage.search(interaction.guildId, tags);

    if (!clans.length && tags.length) {
      await interaction.editReply(i18n('common.no_clans_found', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE }));
      return { clans: null, isTotal };
    }

    if (!clans.length) {
      await interaction.editReply(i18n('common.no_clans_linked', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE }));
      return { clans: null, isTotal };
    }

    return { clans, isTotal, resolvedArgs: args === '*' ? '*' : tags.join(',') };
  }

  public formatCategoryName(name: string) {
    return name.toLowerCase().trim().replace(/\s+/g, '_');
  }

  public async findOrCreateCategory({ guildId, category }: { guildId: string; category?: string }) {
    if (!category) return null;

    const collection = this.client.db.collection<ClanCategoriesEntity>(Collections.CLAN_CATEGORIES);

    const formattedName = this.formatCategoryName(category);
    if (ObjectId.isValid(category)) {
      const result = await collection.findOne({ guildId, _id: new ObjectId(category) });

      return result?._id ?? null;
    }

    const lastCategory = await collection.findOne({ guildId }, { sort: { order: -1 } });

    const value = await collection.findOneAndUpdate(
      { guildId, name: formattedName },
      {
        $set: { displayName: category.trim(), guildId, name: formattedName, order: (lastCategory?.order ?? 0) + 1 }
      },
      { upsert: true, returnDocument: 'after' }
    );
    return value?._id ?? null;
  }

  public async getOrCreateDefaultCategories(guildId: string) {
    const categories = await this.client.db
      .collection<ClanCategoriesEntity>(Collections.CLAN_CATEGORIES)
      .find({ guildId })
      .sort({ order: 1 })
      .toArray();

    if (!categories.length) {
      const payload = defaultCategories.map((name, i) => ({
        _id: new ObjectId(),
        guildId,
        order: i + 1,
        name: name.toLowerCase(),
        displayName: name
      }));
      await this.client.db.collection<ClanCategoriesEntity>(Collections.CLAN_CATEGORIES).insertMany(payload);
      return payload.map((result) => ({ value: result._id.toHexString(), name: result.displayName, order: result.order }));
    }

    return categories.map((result) => ({ value: result._id.toHexString(), name: result.displayName, order: result.order }));
  }

  private fixTag(tag: string) {
    return `#${tag.toUpperCase().replace(/^#/g, '').replace(/O/g, '0')}`;
  }

  public async register(interaction: CommandInteraction<'cached'>, data: Record<string, any>) {
    const [_total, _clan, _lastClan] = await Promise.all([
      this.collection.countDocuments({ guild: interaction.guildId }),
      this.collection.findOne({ tag: data.tag }),
      this.collection.find().sort({ uniqueId: -1 }).limit(1).next()
    ]);

    const clan = await this.collection.findOneAndUpdate(
      { tag: data.tag, guild: data.guild },
      {
        $set: {
          name: data.name,
          tag: data.tag,
          guild: interaction.guildId,
          paused: false,
          active: true,
          verified: true,
          order: _clan?.order ?? _total + 1,
          ...(data.hexCode ? { color: data.hexCode } : {}),
          ...(data.categoryId ? { categoryId: data.categoryId } : {}),
          patron: this.client.patreonHandler.get(interaction.guildId)
        },
        $setOnInsert: {
          uniqueId: _clan?.uniqueId ?? (_lastClan?.uniqueId ?? 1000) + 1,
          createdAt: new Date()
        }
      },
      { upsert: true, returnDocument: 'after' }
    );

    return clan!._id.toHexString();
  }

  public async delete(clanId: string) {
    await Promise.all([
      this.client.db.collection(Collections.CLAN_STORES).deleteOne({ _id: new ObjectId(clanId) }),
      this.client.db.collection(Collections.CLAN_LOGS).deleteMany({ clanId: new ObjectId(clanId) })
    ]);
  }

  public async deleteReminders(clanTag: string, guild: string) {
    const reminders = [
      {
        reminder: Collections.WAR_REMINDERS,
        scheduler: Collections.WAR_SCHEDULERS
      },
      {
        reminder: Collections.RAID_REMINDERS,
        scheduler: Collections.RAID_SCHEDULERS
      },
      {
        reminder: Collections.CLAN_GAMES_REMINDERS,
        scheduler: Collections.CLAN_GAMES_SCHEDULERS
      }
    ];

    for (const { reminder, scheduler } of reminders) {
      const reminders = await this.client.db.collection(reminder).find({ guild, clans: clanTag }).toArray();
      for (const rem of reminders) {
        await this.client.db.collection(scheduler).deleteMany({ reminderId: rem._id });
        if (rem.clans.length === 1) {
          await this.client.db.collection(reminder).deleteOne({ _id: rem._id });
        } else {
          await this.client.db.collection<ClanWarRemindersEntity>(reminder).updateOne({ _id: rem._id }, { $pull: { clans: clanTag } });
        }
      }
    }
  }

  public async getWebhookWorkloads(guildId: string) {
    const [result] = await this.client.db
      .collection(Collections.CLAN_STORES)
      .aggregate<Record<string, { name: string; tag: string; webhook: { id: string; token: string } }[]>>([
        { $match: { guild: guildId } },
        {
          $facet: {
            [Collections.CLAN_LOGS]: [
              {
                $lookup: {
                  from: Collections.CLAN_LOGS,
                  localField: '_id',
                  foreignField: 'clanId',
                  as: 'webhook'
                }
              },
              {
                $unwind: '$webhook'
              },
              {
                $project: {
                  tag: 1,
                  name: 1,
                  webhook: 1
                }
              }
            ]
          }
        }
      ])
      .toArray();

    return Object.values(result ?? {}).flat();
  }

  public async getWebhook(channel: TextChannel | NewsChannel | ForumChannel | MediaChannel | MediaChannel) {
    const channelWebhooks = await channel.fetchWebhooks();

    const clans = await this.getWebhookWorkloads(channel.guild.id);
    const estimated = channelWebhooks
      .filter((webhook) => webhook.applicationId === this.client.user!.id)
      .map((webhook) => webhook.id)
      .map((webhookId) => {
        const count = clans.reduce((counter, clan) => {
          if (clan.webhook.id === webhookId) counter += 1;
          return counter;
        }, 0);
        return { webhookId, count };
      })
      .sort((a, b) => a.count - b.count)
      .at(0);

    const webhookLimit = this.client.settings.get<number>(channel.guildId, Settings.WEBHOOK_LIMIT, 8);
    if (estimated && (estimated.count <= 6 || channelWebhooks.size >= Math.max(3, Math.min(8, webhookLimit)))) {
      return channelWebhooks.get(estimated.webhookId)!;
    }

    if (channelWebhooks.size >= 10) return null;

    const webhook = await channel.createWebhook({
      name: this.client.user!.displayName,
      avatar: this.client.user!.displayAvatarURL({ extension: 'png', size: 512, forceStatic: true })
    });
    this.client.logger.debug(`Created webhook for ${channel.guild.name}#${channel.name}`, { label: 'HOOK' });
    return webhook;
  }

  public async getWarTags(tag: string, season?: string | null): Promise<ClanWarLeagueGroupsEntity | null> {
    const data = await this.client.db
      .collection(Collections.CWL_GROUPS)
      .findOne(season ? { 'clans.tag': tag, season } : { 'clans.tag': tag }, { sort: { _id: -1 } });
    if (!data) return null;

    if (season) return data as unknown as ClanWarLeagueGroupsEntity;
    // if (data.warTags?.[tag]?.length !== data.clans.length - 1) return null;

    const seasonFormat = 'YYYY-MM';
    const isInSameSeason = moment().format(seasonFormat) === moment(data.season as string).format(seasonFormat);
    const isInPreviousSeason = moment(data.season as string).format(seasonFormat) === moment().subtract(1, 'month').format(seasonFormat);

    if (isInSameSeason || (isInPreviousSeason && moment().day() <= 8)) return data as unknown as ClanWarLeagueGroupsEntity;

    return null;
  }

  public async pushWarTags(tag: string, body: APIClanWarLeagueGroup) {
    const rounds = body.rounds.filter((r) => !r.warTags.includes('#0'));
    if (rounds.length !== body.clans.length - 1) return null;

    const data = await this.client.db.collection(Collections.CWL_GROUPS).findOne({ 'clans.tag': tag }, { sort: { _id: -1 } });
    if (data?.season === this.seasonID) return null;
    if (data && new Date().getMonth() <= new Date(data.season as string).getMonth()) return null;

    const warTags = body.clans.reduce<{ [key: string]: string[] }>((pre, clan) => {
      pre[clan.tag] = [];
      return pre;
    }, {});

    for (const round of rounds) {
      for (const warTag of round.warTags) {
        const { body: data, res } = await this.client.coc.getClanWarLeagueRound(warTag);
        if (!res.ok) continue;
        if (!warTags[data.clan.tag].includes(warTag)) warTags[data.clan.tag]!.push(warTag);
        if (!warTags[data.opponent.tag].includes(warTag)) warTags[data.opponent.tag]!.push(warTag);
      }
    }

    // return this.pushToDB(tag, body.clans, warTags, rounds, body.season);
  }

  private md5(id: string) {
    return createHash('md5').update(id).digest('hex');
  }

  private async pushToDB(clanTag: string, clans: { tag: string; name: string }[], warTags: any, rounds: any[], season: string) {
    const uid = this.md5(
      `${season}-${clans
        .map((clan) => clan.tag)
        .sort((a, b) => a.localeCompare(b))
        .join('-')}`
    );

    const result = await this.leagueIds(clanTag, season);
    if (!result) return null;

    const { leagues, clans: _clans } = result;
    if (clans.length !== _clans.length) return null;

    return this.client.db.collection(Collections.CWL_GROUPS).updateOne(
      { uid },
      {
        $set: {
          warTags,
          rounds
        },
        $setOnInsert: {
          uid,
          season,
          id: await this.uuid(),
          clans: clans.map((clan) => ({ tag: clan.tag, name: clan.name, leagueId: leagues[clan.tag] })),
          leagues,
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
  }

  public async restoreLeagueGroup(clanTag: string, season: string) {
    const result = await this.leagueIds(clanTag, season);
    if (!result) return null;

    const { leagues, clans, warTags, rounds } = result;

    const uid = this.md5(
      `${season}-${clans
        .map((clan) => clan.tag)
        .sort((a, b) => a.localeCompare(b))
        .join('-')}`
    );

    return this.client.db.collection(Collections.CWL_GROUPS).updateOne(
      { uid },
      {
        $setOnInsert: {
          uid,
          season,
          id: await this.uuid(),
          clans: clans.map((clan) => ({ name: clan.name, tag: clan.tag, leagueId: leagues[clan.tag] })),
          leagues,
          warTags,
          rounds,
          isDelayed: true,
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
  }

  private async leagueIds(clanTag: string, seasonId: string) {
    const group = await this.client.coc.getDataFromArchive(clanTag, seasonId);
    if (!group) return null;

    const leagues: Record<string, number> = {};
    for (const clan of group.clans) {
      const res = await fetch(`https://clan-war-league-api-production.up.railway.app/clans/${encodeURIComponent(clan.tag)}/cwl/seasons`);
      const seasons = (await res.json()) as { leagueId: string; seasonId: string }[];
      const season = seasons.find((season) => season.seasonId === seasonId);
      if (!season?.leagueId) continue;
      leagues[clan.tag] = Number(season.leagueId);
    }
    Object.assign(Object.fromEntries(group.clans.map((clan) => [clan.tag, group.leagueId])), leagues);

    const rounds: { warTags: string[] }[] = [];
    for (const _rounds of cluster(group.wars, 4)) {
      const warTags = _rounds.map((round) => round.warTag);
      rounds.push({ warTags });
    }

    const warTags: Record<string, string[]> = {};
    for (const round of group.wars) {
      warTags[round.clan.tag] ??= [];
      warTags[round.opponent.tag] ??= [];

      warTags[round.clan.tag].push(round.warTag);
      warTags[round.opponent.tag].push(round.warTag);
    }

    const clans = group.clans.map((clan) => ({ name: clan.name, tag: clan.tag, leagueId: leagues[clan.tag] }));
    return { clans, leagues, rounds, warTags, season: seasonId };
  }

  public async makeAutoBoard({
    channelId,
    guild,
    boardType,
    props = {}
  }: {
    guild: Guild;
    boardType: string;
    channelId: string;
    props?: Partial<Record<string, number | string>>;
  }) {
    const value = await this.client.db.collection(Collections.AUTO_BOARDS).findOneAndUpdate(
      { guildId: guild.id, boardType },
      {
        $set: {
          name: guild.name,
          channelId,
          color: this.client.embed(guild.id),
          updatedAt: new Date(),
          ...props
        },
        $unset: {
          disabled: '',
          webhook: '',
          messageId: ''
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { returnDocument: 'after', upsert: true }
    );

    return this.client.enqueuer.addAutoBoard(value!._id.toHexString());
  }

  public async updateClanLinks(guildId: string) {
    const conflicts = [];

    const clans = await this.find(guildId);
    for (const clan of clans) {
      const { res, body: data } = await this.client.coc.getClan(clan.tag);
      if (!res.ok) continue;

      const result = await this.updatePlayerLinks(data.memberList);
      conflicts.push(...result);
    }

    if (conflicts.length) {
      this.client.logger.debug(
        conflicts.map(({ playerTag }) => playerTag),
        { label: 'AccountConflicts' }
      );
    }
  }

  public async updatePlayerLinks(players: { tag: string; name?: string }[]) {
    const conflicts = [];

    const collection = this.client.db.collection<PlayerLinksEntity>(Collections.PLAYER_LINKS);
    const _links = await collection.find({ tag: { $in: players.map((mem) => mem.tag) } }).toArray();
    const _discordLinks = await this.client.coc.getDiscordLinks(players);

    const userIds = unique([..._links.map((link) => link.userId), ..._discordLinks.map((link) => link.userId)]);
    const links = await collection.find({ userId: { $in: userIds } }).toArray();
    const discordLinks = await this.client.coc.getDiscordLinks(userIds.map((id) => ({ tag: id })));

    for (const { userId, tag } of discordLinks) {
      if (links.find((mem) => mem.tag === tag && mem.userId === userId)) continue;
      const lastAccount = await collection.findOne({ userId }, { sort: { order: -1 } });

      const player = players.find((mem) => mem.tag === tag && mem.name) ?? (await this.client.coc.getPlayer(tag).then(({ body }) => body));
      if (!player?.name) continue;

      const user = await this.client.users.fetch(userId).catch(() => null);
      if (!user || user.bot) continue;

      const dirtyLink = links.find((link) => link.tag === tag && link.userId !== userId && link.source === 'api');

      try {
        if (dirtyLink) await collection.deleteOne({ tag: dirtyLink.tag });

        await collection.insertOne({
          userId: user.id,
          username: user.username,
          displayName: user.displayName,
          discriminator: user.discriminator,
          tag,
          name: player.name,
          verified: false,
          order: (lastAccount?.order ?? 0) + 1,
          source: 'api',
          linkedBy: 'bot',
          createdAt: new Date()
        });
      } catch {
        conflicts.push({ userId: user.id, playerTag: tag });
      }
    }

    return conflicts;
  }

  private async uuid() {
    const cursor = this.client.db.collection(Collections.CWL_GROUPS).find().sort({ id: -1 }).limit(1);
    const uuid: number = (await cursor.next())?.id ?? 0;
    return uuid + 1;
  }

  private get seasonID() {
    return new Date().toISOString().slice(0, 7);
  }
}
