import { Collections, FeatureFlags, calculateCWLMedals } from '@app/constants';
import { ClanLogType, ClanLogsEntity } from '@app/entities';
import { APIClanWar, APIClanWarAttack, APIClanWarMember, APIWarClan } from 'clashofclans.js';
import {
  APIMessage,
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  Collection,
  EmbedBuilder,
  PermissionsString,
  WebhookClient,
  WebhookMessageCreateOptions,
  escapeMarkdown,
  time
} from 'discord.js';
import moment from 'moment';
import { ObjectId, UpdateFilter, WithId } from 'mongodb';
import { cluster } from 'radash';
import { aggregateRoundsForRanking, calculateLeagueRanking } from '../helper/cwl.helper.js';
import { getCWLSummaryImage } from '../struct/image-helper.js';
import { BLUE_NUMBERS, EMOJIS, ORANGE_NUMBERS, TOWN_HALLS, WAR_STARS } from '../util/emojis.js';
import { padStart } from '../util/helper.js';
import { Season, Util } from '../util/toolkit.js';
import { Enqueuer } from './enqueuer.js';
import { RootLog } from './root-log.js';

const states: { [key: string]: number } = {
  preparation: 16745216,
  inWar: 16345172
};

const results: { [key: string]: number } = {
  won: 3066993,
  lost: 15158332,
  tied: 5861569
};

export class ClanWarLog extends RootLog {
  declare public cached: Collection<string, Cache>;

  public constructor(private enqueuer: Enqueuer) {
    super(enqueuer.client);
    this.client = enqueuer.client;
  }

  public override get collection() {
    return this.client.db.collection<ClanLogsEntity>(Collections.CLAN_LOGS);
  }

  public override get permissions(): PermissionsString[] {
    return ['ReadMessageHistory', 'SendMessages', 'EmbedLinks', 'UseExternalEmojis', 'ViewChannel'];
  }

  public override async handleMessage(cache: Cache, webhook: WebhookClient, data: Feed) {
    let messageId: string | null = null;
    if (data.warTag) {
      messageId =
        cache.rounds[data.round]?.warTag === data.warTag ? cache.rounds[data.round].message : null;
    } else {
      messageId = (data.uid === cache.uid ? cache.message : null) ?? null;
    }

    // CWL SUMMARY
    if (data.type === 'CWL_ENDED') {
      if (cache.logType !== ClanLogType.CWL_MONTHLY_SUMMARY_LOG) return null;

      const result = await this.getSummaryImage(cache.tag);
      if (!result) return null;

      return this.send(cache, webhook, {
        files: [result.attachment],
        threadId: cache.threadId
      });
    }

    // MISSED ATTACK LOG
    if (
      data.state === 'warEnded' &&
      [ClanLogType.WAR_MISSED_ATTACKS_LOG, ClanLogType.CWL_MISSED_ATTACKS_LOG].includes(
        cache.logType
      )
    ) {
      if (data.warTag && cache.logType !== ClanLogType.CWL_MISSED_ATTACKS_LOG) return null;
      if (!data.warTag && cache.logType !== ClanLogType.WAR_MISSED_ATTACKS_LOG) return null;

      const isEnabled = this.client.isFeatureEnabled(
        FeatureFlags.ALLOW_NO_MISSED_ATTACKS_LOG,
        cache.guild
      );
      if (!isEnabled && !data.remaining.length) return null;

      const embed = this.getRemaining(data);
      return this.send(cache, webhook, { embeds: [embed], threadId: cache.threadId });
    }

    // LINEUP CHANGE LOG
    if (
      (data.oldMembers?.length || data.newMembers?.length) &&
      cache.logType === ClanLogType.CWL_LINEUP_CHANGE_LOG
    ) {
      const embed = this.getLineupChangeEmbed(data);
      return this.send(cache, webhook, { embeds: [embed], threadId: cache.threadId });
    }

    // WAR ATTACK LOG
    if (
      (data.newAttacks?.length || data.newDefenses?.length) &&
      cache.logType === ClanLogType.WAR_ATTACK_LOG
    ) {
      const content = this.getAttackLogMessage(data);
      return this.send(cache, webhook, { content, threadId: cache.threadId });
    }

    if (data.warTag && cache.logType !== ClanLogType.CWL_EMBED_LOG) return null;
    if (!data.warTag && cache.logType !== ClanLogType.WAR_EMBED_LOG) return null;

    const embed = this.embed(data);

    if (!messageId) {
      const msg = await this.send(cache, webhook, {
        embeds: [embed],
        threadId: cache.threadId,
        components: data.state === 'preparation' ? [] : [this._components(data)]
      });

      return this.mutate(cache, data, msg);
    }

    cache.message = messageId;
    const msg = await this.edit(cache, webhook, {
      embeds: [embed],
      threadId: cache.threadId,
      components: data.state === 'preparation' ? [] : [this._components(data)]
    });

    return this.mutate(cache, data, msg);
  }

  private async send(cache: Cache, webhook: WebhookClient, payload: WebhookMessageCreateOptions) {
    try {
      return await super.sendMessage(cache, webhook, payload);
    } catch (error) {
      this.client.logger.error(`${error.toString()} {${cache._id.toString()}}`, {
        label: ClanWarLog.name
      });
      console.log(error);
      return null;
    }
  }

  private async edit(cache: Cache, webhook: WebhookClient, payload: WebhookMessageCreateOptions) {
    try {
      return await super.editMessage(cache, webhook, payload);
    } catch (error) {
      this.client.logger.error(`${error.toString()} {${cache._id.toString()}}`, {
        label: ClanWarLog.name
      });
      console.log(error);
      return null;
    }
  }

  private _components(data: Feed) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('Attacks')
        .setEmoji(EMOJIS.SWORD)
        .setStyle(ButtonStyle.Primary)
        .setCustomId(
          JSON.stringify({ cmd: 'war', war_id: data.id, tag: data.clan.tag, attacks: true })
        ),
      new ButtonBuilder()
        .setLabel('Defenses')
        .setEmoji(EMOJIS.SHIELD)
        .setStyle(ButtonStyle.Danger)
        .setCustomId(
          JSON.stringify({ cmd: 'war', war_id: data.id, tag: data.opponent.tag, attacks: true })
        )
    );

    if (data.state !== 'warEnded') {
      row.addComponents(
        new ButtonBuilder()
          .setLabel('Open Bases')
          .setEmoji(EMOJIS.EMPTY_STAR)
          .setStyle(ButtonStyle.Secondary)
          .setCustomId(
            JSON.stringify({ cmd: 'war', war_id: data.id, tag: data.clan.tag, openBases: true })
          )
      );
    }

    return row;
  }

  private async mutate(cache: Cache, data: Feed, message: APIMessage | null) {
    if (!message) {
      if (cache.message) delete cache.message;

      const update: UpdateFilter<ClanLogsEntity> = {
        $set: { 'metadata.uid': data.uid, 'updatedAt': new Date() },
        $inc: { failed: 1 },
        $unset: { messageId: true }
      };

      if (data.warTag && cache.rounds[data.round]?.warTag === data.warTag) {
        delete cache.rounds[data.round];
        update.$unset = { ...update.$unset, [`metadata.rounds.${data.round}`]: true };
      }

      return this.collection.updateOne({ _id: cache._id }, update);
    }

    if (data.warTag) {
      cache.rounds[data.round] = { warTag: data.warTag, message: message.id };

      return this.collection.updateOne(
        { _id: cache._id },
        {
          $set: {
            updatedAt: new Date(),
            failed: 0,
            [`metadata.rounds.${data.round}`]: { warTag: data.warTag, message: message.id }
          }
        }
      );
    }

    cache.uid = data.uid;
    cache.message = message.id;
    return this.collection.updateOne(
      { _id: cache._id },
      {
        $set: {
          'messageId': message.id,
          'metadata.uid': data.uid,
          'updatedAt': new Date(),
          'failed': 0
        }
      }
    );
  }

  private embed(data: Feed) {
    if (data.warTag) return this.getLeagueWarEmbed(data);
    return this.getRegularWarEmbed(data);
  }

  private getRegularWarEmbed(data: Feed) {
    const embed = new EmbedBuilder()
      .setTitle(`${data.clan.name} (${data.clan.tag})`)
      .setURL(this.clanURL(data.clan.tag))
      .setThumbnail(data.clan.badgeUrls.small);
    if (data.state === 'preparation') {
      const startTimestamp = new Date(moment(data.startTime).toDate());
      embed
        .setColor(states[data.state])
        .setDescription(
          [
            '**War Against**',
            `**[${escapeMarkdown(data.opponent.name)} (${data.opponent.tag})](${this.clanURL(data.opponent.tag)})**`,
            '',
            '**War State**',
            'Preparation Day',
            `War Start Time: ${time(startTimestamp, 'R')}`,
            '',
            '**War Size**',
            `${data.teamSize} vs ${data.teamSize}`
          ].join('\n')
        );
      embed.setTimestamp();
    }

    if (data.state === 'inWar') {
      const endTimestamp = new Date(moment(data.endTime).toDate());
      embed
        .setColor(states[data.state])
        .setDescription(
          [
            '**War Against**',
            `**[${escapeMarkdown(data.opponent.name)} (${data.opponent.tag})](${this.clanURL(data.opponent.tag)})**`,
            '',
            '**War State**',
            'Battle Day',
            `End Time: ${time(endTimestamp, 'R')}`,
            '',
            '**War Size**',
            `${data.teamSize} vs ${data.teamSize}`,
            '',
            '**War Stats**',
            `${this.getLeaderBoard(data.clan, data.opponent)}`
          ].join('\n')
        );

      if (data.recent?.length) {
        const max = Math.max(...data.recent.map((atk) => atk.attacker.destructionPercentage));
        const pad = max === 100 ? 4 : 3;
        embed.addFields([
          {
            name: 'Recent Attacks',
            value: [
              ...data.recent.map(({ attacker, defender }) => {
                const name = escapeMarkdown(attacker.name);
                const stars = this.getStars(attacker.oldStars, attacker.stars);
                const destruction: string = Math.floor(attacker.destructionPercentage)
                  .toString()
                  .concat('%')
                  .padStart(pad, ' ');
                return `${stars} \`\u200e${destruction}\` ${BLUE_NUMBERS[attacker.mapPosition]!}${ORANGE_NUMBERS[
                  attacker.townHallLevel
                ]!}${EMOJIS.VS}${BLUE_NUMBERS[defender.mapPosition]!}${ORANGE_NUMBERS[defender.townHallLevel]!} ${name}`;
              })
            ].join('\n')
          }
        ]);
      }
      embed.setTimestamp();
    }

    if (data.state === 'warEnded') {
      embed
        .setColor(results[data.result])
        .setDescription(
          [
            '**War Against**',
            `**[${escapeMarkdown(data.opponent.name)} (${data.opponent.tag})](${this.clanURL(data.opponent.tag)})**`,
            '',
            '**War State**',
            'War Ended',
            '',
            '**War Size**',
            `${data.teamSize} vs ${data.teamSize}`,
            '',
            '**War Stats**',
            `${this.getLeaderBoard(data.clan, data.opponent)}`
          ].join('\n')
        );
      embed.setFooter({ text: 'Ended' }).setTimestamp();
    }

    embed.setDescription(
      [
        embed.data.description,
        '',
        '**Rosters**',
        `${escapeMarkdown(data.clan.name)}`,
        `${this.getRoster(data.clan.rosters)}`,
        '',
        `${escapeMarkdown(data.opponent.name)}`,
        `${this.getRoster(data.opponent.rosters)}`
      ].join('\n')
    );

    return embed;
  }

  private getRemaining(data: Feed) {
    const embed = new EmbedBuilder()
      .setTitle(`${data.clan.name} (${data.clan.tag})`)
      .setThumbnail(data.clan.badgeUrls.small)
      .setURL(this.clanURL(data.clan.tag))
      .setDescription(
        [
          `**War Against ${data.warTag ? `(CWL Round ${data.round})` : ''}**`,
          `**[${escapeMarkdown(data.opponent.name)} (${data.opponent.tag})](${this.clanURL(data.opponent.tag)})**`,
          '',
          data.remaining.length ? '' : 'No Missed Attacks'
        ].join('\n')
      );

    const twoRem = data.remaining
      .filter((m) => !m.attacks)
      .sort((a, b) => a.mapPosition - b.mapPosition)
      .map((m) => `\u200e${BLUE_NUMBERS[m.mapPosition]!} ${escapeMarkdown(m.name)}`);
    const oneRem = data.remaining
      .filter((m) => m.attacks?.length === 1)
      .sort((a, b) => a.mapPosition - b.mapPosition)
      .map((m) => `\u200e${BLUE_NUMBERS[m.mapPosition]!} ${escapeMarkdown(m.name)}`);

    const friendly = data.attacksPerMember === 1;
    if (twoRem.length) {
      const chunks = Util.splitMessage(twoRem.join('\n'), { maxLength: 1000 });
      embed.addFields(
        chunks.map((chunk, i) => ({
          name: i === 0 ? `${friendly ? 1 : 2} Missed Attacks` : '\u200b',
          value: chunk
        }))
      );
    }

    if (oneRem.length && !friendly) {
      const chunks = Util.splitMessage(oneRem.join('\n'), { maxLength: 1000 });
      embed.addFields(
        chunks.map((chunk, i) => ({ name: i === 0 ? '1 Missed Attacks' : '\u200b', value: chunk }))
      );
    }

    return embed;
  }

  private getLineupChangeEmbed(data: Feed) {
    const embed = new EmbedBuilder()
      .setTitle(`${data.clan.name} (${data.clan.tag})`)
      .setThumbnail(data.clan.badgeUrls.small)
      .setURL(this.clanURL(data.clan.tag))
      .setDescription(
        [
          `**War Against ${data.warTag ? `(CWL Round ${data.round})` : ''}**`,
          `**[${escapeMarkdown(data.opponent.name)} (${data.opponent.tag})](${this.clanURL(data.opponent.tag)})**`,
          '',
          '**Members Added**',
          ...data.newMembers.map(
            (m) => `\u200e${BLUE_NUMBERS[m.mapPosition]} ${escapeMarkdown(m.name)}`
          ),
          '',
          '**Members Removed**',
          ...data.oldMembers.map(
            (m) => `\u200e${BLUE_NUMBERS[m.mapPosition]} ${escapeMarkdown(m.name)}`
          )
        ].join('\n')
      );

    return embed;
  }

  private getAttackLogMessage(data: Feed) {
    return [...data.newAttacks, ...data.newDefenses]
      .map((attacker) => {
        const isClanMember = data.clan.tag === attacker.clanTag;
        const name = escapeMarkdown(isClanMember ? attacker.name : attacker.defender.name);

        const stars = this.getStars(attacker.attack.oldStars, attacker.attack.stars, !isClanMember);
        const destruction = padStart(`${Math.floor(attacker.attack.destructionPercentage)}%`, 4);

        const attackerMap =
          BLUE_NUMBERS[isClanMember ? attacker.mapPosition : attacker.defender.mapPosition];
        const defenderMap =
          BLUE_NUMBERS[isClanMember ? attacker.defender.mapPosition : attacker.mapPosition];
        const attackerTh =
          ORANGE_NUMBERS[isClanMember ? attacker.townhallLevel : attacker.defender.townhallLevel];
        const defenderTh =
          ORANGE_NUMBERS[isClanMember ? attacker.defender.townhallLevel : attacker.townhallLevel];
        const vs = isClanMember ? WAR_STARS.ARROW_RIGHT : WAR_STARS.ARROW_LEFT;

        return `${stars} \`${destruction}\` ${attackerMap}${
          attackerTh
        } \u200e${name} ${vs}${defenderMap}${defenderTh}`;
      })
      .join('\n');
  }

  private getLeagueWarEmbed(data: Feed) {
    const { clan, opponent } = data;
    const embed = new EmbedBuilder()
      .setTitle(`\u200e${clan.name} (${clan.tag})`)
      .setURL(this.clanURL(clan.tag))
      .setThumbnail(clan.badgeUrls.small)
      .addFields([
        {
          name: 'War Against',
          value: `\u200e[${escapeMarkdown(opponent.name)} (${opponent.tag})](${this.clanURL(opponent.tag)})`
        },
        {
          name: 'Team Size',
          value: `${data.teamSize}`
        }
      ]);

    if (data.state === 'inWar') {
      const endTimestamp = new Date(moment(data.endTime).toDate());
      embed.setColor(states[data.state]);
      embed.addFields([
        {
          name: 'War State',
          value: ['Battle Day', `End Time: ${time(endTimestamp, 'R')}`].join('\n')
        },
        { name: 'War Stats', value: this.getLeaderBoard(clan, opponent) }
      ]);
    }

    if (data.state === 'preparation') {
      const startTimestamp = new Date(moment(data.startTime).toDate());
      embed.setColor(states[data.state]);
      embed.addFields([
        {
          name: 'War State',
          value: ['Preparation Day', `War Start Time: ${time(startTimestamp, 'R')}`].join('\n')
        }
      ]);
    }

    if (data.state === 'warEnded') {
      embed.setColor(results[data.result]);
      embed.addFields([
        {
          name: 'War State',
          value: 'War Ended'
        },
        {
          name: 'War Stats',
          value: this.getLeaderBoard(clan, opponent)
        }
      ]);
    }

    const rosters = [
      `\u200e${clan.name}`,
      `${this.getRoster(clan.rosters)}`,
      '',
      `\u200e${opponent.name}`,
      `${this.getRoster(opponent.rosters)}`
    ];

    if (rosters.join('\n').length > 1024) {
      embed.addFields([
        { name: 'Rosters', value: rosters.slice(0, 2).join('\n') },
        { name: '\u200e', value: rosters.slice(-2).join('\n') }
      ]);
    } else {
      embed.addFields([{ name: 'Rosters', value: rosters.join('\n') }]);
    }

    if (data.recent?.length) {
      const max = Math.max(...data.recent.map((atk) => atk.attacker.destructionPercentage));
      const pad = max === 100 ? 4 : 3;
      embed.addFields([
        {
          name: 'Recent Attacks',
          value: [
            ...data.recent.map(({ attacker, defender }) => {
              const name = escapeMarkdown(attacker.name);
              const stars = this.getStars(attacker.oldStars, attacker.stars);
              const destruction: string = Math.floor(attacker.destructionPercentage)
                .toString()
                .concat('%')
                .padStart(pad, ' ');
              return `${stars} \`\u200e${destruction}\` ${BLUE_NUMBERS[attacker.mapPosition]!}${ORANGE_NUMBERS[
                attacker.townHallLevel
              ]!}${EMOJIS.VS}${BLUE_NUMBERS[defender.mapPosition]!}${ORANGE_NUMBERS[defender.townHallLevel]!} ${name}`;
            })
          ].join('\n')
        }
      ]);
    }

    embed.setFooter({ text: `Round #${data.round}` }).setTimestamp();
    return embed;
  }

  private async getSummaryImage(clanTag: string) {
    const leagueGroup = await this.client.storage.getWarTags(clanTag, Season.monthId);
    if (!leagueGroup) return null;

    const body = await this.client.coc.aggregateClanWarLeague(clanTag, leagueGroup, true);
    if (!body) return null;

    const leagueId = body.leagues?.[clanTag];
    if (!leagueId) return null;

    const ranks = calculateLeagueRanking(aggregateRoundsForRanking(body.wars), leagueId);
    const rankIndex = ranks.findIndex((a) => a.tag === clanTag);
    const medals = calculateCWLMedals(leagueId.toString(), 8, rankIndex + 1);

    const { file, name } = await getCWLSummaryImage({
      activeRounds: body.rounds,
      leagueId,
      medals,
      rankIndex,
      ranks,
      season: body.season,
      totalRounds: body.clans.length - 1
    });

    return {
      attachment: new AttachmentBuilder(file, { name })
    };
  }

  private clanURL(tag: string) {
    return `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(tag)}`;
  }

  private getLeaderBoard(clan: APIWarClan, opponent: APIWarClan) {
    return [
      `\`\u200e${clan.stars.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${EMOJIS.STAR} \u2002 \`\u200e ${opponent.stars
        .toString()
        .padEnd(8, ' ')}\u200f\``,
      `\`\u200e${clan.attacks.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${EMOJIS.SWORD} \u2002 \`\u200e ${opponent.attacks
        .toString()
        .padEnd(8, ' ')}\u200f\``,
      `\`\u200e${`${clan.destructionPercentage.toFixed(2)}%`.padStart(8, ' ')} \u200f\`\u200e \u2002 ${
        EMOJIS.FIRE
      } \u2002 \`\u200e ${`${opponent.destructionPercentage.toFixed(2)}%`.padEnd(8, ' ')}\u200f\``
    ].join('\n');
  }

  private getStars(oldStars: number, newStars: number, isDefense = false) {
    const newStar = isDefense ? WAR_STARS.RED_NEW : WAR_STARS.YELLOW_NEW;
    const oldStar = isDefense ? WAR_STARS.RED_EMPTY : WAR_STARS.YELLOW_EMPTY;
    const emptyStar = WAR_STARS.EMPTY;

    if (oldStars > newStars) {
      const stars = [oldStar.repeat(newStars), emptyStar.repeat(3 - newStars)];
      return stars.filter(Boolean).join('');
    }

    const stars = [
      oldStar.repeat(oldStars),
      newStar.repeat(newStars - oldStars),
      emptyStar.repeat(3 - newStars)
    ];

    return stars.filter(Boolean).join('');
  }

  private getRoster(
    townHalls: {
      total: number;
      level: number;
    }[]
  ) {
    return cluster(townHalls, 5)
      .map((chunks) => {
        const list = chunks.map((th) => `${TOWN_HALLS[th.level]!} ${ORANGE_NUMBERS[th.total]!}`);
        return list.join(' ');
      })
      .join('\n');
  }

  public async init() {
    const guildIds = this.client.guilds.cache.map((guild) => guild.id);
    for await (const data of this.collection.find({
      guildId: { $in: guildIds },
      logType: { $in: this.logTypes },
      isEnabled: true
    })) {
      this.setCache(data);
    }
  }

  public async add(guildId: string) {
    for await (const data of this.collection.find({
      guildId,
      logType: { $in: this.logTypes },
      isEnabled: true
    })) {
      this.setCache(data);
    }
  }

  private get logTypes() {
    return [
      ClanLogType.WAR_EMBED_LOG,
      ClanLogType.CWL_EMBED_LOG,
      ClanLogType.WAR_ATTACK_LOG,
      ClanLogType.CWL_MISSED_ATTACKS_LOG,
      ClanLogType.WAR_MISSED_ATTACKS_LOG,
      ClanLogType.CWL_LINEUP_CHANGE_LOG,
      ClanLogType.CWL_MONTHLY_SUMMARY_LOG
    ];
  }

  private setCache(data: WithId<ClanLogsEntity>) {
    this.cached.set(data._id.toHexString(), {
      _id: data._id,
      guild: data.guildId,
      channel: data.channelId,
      message: data.messageId,
      tag: data.clanTag,
      deepLink: data.deepLink,
      logType: data.logType,
      retries: 0,
      uid: data.metadata?.uid,
      rounds: data.metadata?.rounds ?? {},
      webhook: data.webhook?.id ? new WebhookClient(data.webhook) : null
    });
  }
}

interface Feed extends APIClanWar {
  recent?: {
    attacker: {
      name: string;
      stars: number;
      oldStars: number;
      mapPosition: number;
      townHallLevel: number;
      destructionPercentage: number;
    };
    defender: {
      mapPosition: number;
      townHallLevel: number;
    };
  }[];
  result: string;
  round: number;
  uid: string;
  id: number;
  warTag?: string;
  attacksPerMember: number;
  remaining: APIClanWarMember[];
  clan: APIWarClan & {
    rosters: {
      total: number;
      level: number;
    }[];
  };
  opponent: APIWarClan & {
    rosters: {
      total: number;
      level: number;
    }[];
  };
  oldMembers: APIClanWarMember[];
  newMembers: APIClanWarMember[];
  newAttacks: (Pick<APIClanWarMember, 'name' | 'tag' | 'mapPosition' | 'townhallLevel'> & {
    clanTag: string;
    attack: APIClanWarAttack & { oldStars: number };
    defender: Pick<APIClanWarMember, 'name' | 'tag' | 'mapPosition' | 'townhallLevel'>;
  })[];
  newDefenses: (Pick<APIClanWarMember, 'name' | 'tag' | 'mapPosition' | 'townhallLevel'> & {
    clanTag: string;
    attack: APIClanWarAttack & { oldStars: number };
    defender: Pick<APIClanWarMember, 'name' | 'tag' | 'mapPosition' | 'townhallLevel'>;
  })[];
  type?: 'CWL_ENDED';
}

interface Cache {
  _id: ObjectId;
  tag: string;
  webhook: WebhookClient | null;
  deleted?: boolean;
  role?: string;
  channel: string;
  message?: string | null;
  guild: string;
  color?: number;
  threadId?: string;
  logType: ClanLogType;
  deepLink?: string;
  retries: number;
  // metadata
  uid: string;
  rounds: Record<number, { warTag: string; message: string }>;
}
