import { Collections, Settings } from '@app/constants';
import { ClanWarRemindersEntity, ClanWarSchedulersEntity } from '@app/entities';
import { APIClanWar } from 'clashofclans.js';
import {
  APIMessage,
  ForumChannel,
  MediaChannel,
  MessageMentionOptions,
  NewsChannel,
  TextChannel,
  WebhookClient,
  escapeMarkdown
} from 'discord.js';
import moment from 'moment';
import { Collection, ObjectId, WithId } from 'mongodb';
import { shuffle, unique } from 'radash';
import { ORANGE_NUMBERS } from '../util/emojis.js';
import { Util } from '../util/toolkit.js';
import { ReminderDeleteReasons } from './capital-raid-scheduler.js';
import { Client } from './client.js';

export class ClanWarScheduler {
  protected schedulers!: Collection<ClanWarSchedulersEntity>;
  protected reminders!: Collection<ClanWarRemindersEntity>;
  private readonly refreshRate: number;
  private readonly queued = new Map<string, NodeJS.Timeout>();

  public constructor(private readonly client: Client) {
    this.refreshRate = 5 * 60 * 1000;
    this.schedulers = this.client.db.collection(Collections.WAR_SCHEDULERS);
    this.reminders = this.client.db.collection(Collections.WAR_REMINDERS);
  }

  public async init() {
    const watchStream = this.schedulers.watch(
      [
        {
          $match: { operationType: { $in: ['insert', 'update', 'delete'] } }
        }
      ],
      { fullDocument: 'updateLookup' }
    );

    watchStream.on('change', (change) => {
      if (change.operationType === 'insert') {
        const schedule = change.fullDocument;
        if (schedule.timestamp.getTime() < Date.now() + this.refreshRate) {
          this.queue(schedule);
        }
      }

      if (change.operationType === 'delete') {
        const id: string = change.documentKey._id.toHexString();
        if (this.queued.has(id)) this.clear(id);
      }

      if (change.operationType === 'update') {
        const id: string = change.documentKey._id.toHexString();
        if (this.queued.has(id)) this.clear(id);
        const schedule = change.fullDocument;
        if (schedule && !schedule.triggered && schedule.timestamp.getTime() < Date.now() + this.refreshRate) {
          this.queue(schedule);
        }
      }
    });

    await this._refresh();
    setInterval(this._refresh.bind(this), this.refreshRate).unref();
  }

  public async restoreSchedulers(guildId: string) {
    const reminders = await this.reminders.find({ guild: guildId }).toArray();
    for (const reminder of reminders) {
      await this.schedulers.deleteMany({ reminderId: reminder._id, triggered: false });
      await this.create(reminder);
    }
    this.client.logger.log(`Schedular restored for ${guildId}`, { label: ClanWarScheduler.name });
  }

  public async create(reminder: ClanWarRemindersEntity) {
    for (const tag of reminder.clans) {
      const wars = await this.client.coc.getCurrentWars(tag);
      const rand = Math.random();
      for (const data of wars) {
        if (['notInWar', 'warEnded'].includes(data.state)) continue;
        const endTime = moment(data.endTime).toDate();

        const ms = endTime.getTime() - reminder.duration;
        if (Date.now() > new Date(ms).getTime()) continue;
        const key = `${data.clan.tag}-${reminder._id.toHexString()}-${reminder.duration}`;

        await this.schedulers.insertOne({
          _id: new ObjectId(),
          key,
          guild: reminder.guild,
          tag: data.clan.tag,
          name: data.clan.name,
          warTag: data.warTag,
          isFriendly: Boolean(data.isFriendly),
          duration: reminder.duration,
          reminderId: reminder._id,
          source: `bot_${rand}`,
          triggered: false,
          timestamp: new Date(ms),
          createdAt: new Date()
        });
      }
    }
  }

  public async reSchedule(reminder: ClanWarRemindersEntity) {
    await this.schedulers.deleteMany({ reminderId: reminder._id });
    return this.create(reminder);
  }

  private queue(schedule: ClanWarSchedulersEntity) {
    if (this.client.settings.hasCustomBot(schedule.guild) && !this.client.isCustom()) return;
    if (!this.client.guilds.cache.has(schedule.guild)) return;

    this.queued.set(
      schedule._id.toHexString(),
      setTimeout(() => {
        this.trigger(schedule);
      }, schedule.timestamp.getTime() - Date.now())
    );
  }

  private async delete(schedule: ClanWarSchedulersEntity, reason: string) {
    if (!this.client.guilds.cache.has(schedule.guild)) return;

    this.clear(schedule._id.toHexString());
    return this.schedulers.updateOne({ _id: schedule._id }, { $set: { triggered: true, reason } });
  }

  private clear(id: string) {
    const timeoutId = this.queued.get(id);
    if (timeoutId) clearTimeout(timeoutId);
    return this.queued.delete(id);
  }

  private async getClanMembers(tag: string) {
    const { body, res } = await this.client.coc.getClan(tag);
    return res.ok ? body.memberList : [];
  }

  private wasInMaintenance(schedule: ClanWarSchedulersEntity, data: APIClanWar) {
    const timestamp = moment(data.endTime).toDate().getTime() - schedule.duration;
    return timestamp > schedule.timestamp.getTime();
  }

  private earlyOrLate(ms: number) {
    return Math.abs(ms) <= 60 * 1000;
  }

  private async randomUsers({ limit, userIds, clanTag }: { limit: number; userIds: string[]; clanTag: string }) {
    if (!limit) return [];

    const redisKey = `RANDOM_SELECTION:${clanTag}`;
    const previouslyMentioned: string[] = await this.client.redis.connection.sMembers(redisKey);
    const eligibleMembers = userIds.filter((id) => !previouslyMentioned.includes(id));
    const randomUserIds = shuffle(eligibleMembers).slice(0, limit);

    if (randomUserIds.length) {
      await this.client.redis.connection
        .multi()
        .del(redisKey)
        .sAdd(redisKey, randomUserIds)
        .expire(redisKey, 60 * 60 * 24 * 3)
        .exec();
    }

    return randomUserIds;
  }

  public async getReminderText(
    reminder: Pick<
      ClanWarRemindersEntity,
      'roles' | 'remaining' | 'townHalls' | 'guild' | 'message' | 'smartSkip' | 'linkedOnly' | 'randomLimit'
    >,
    schedule: Pick<ClanWarSchedulersEntity, 'tag' | 'warTag'>,
    data: APIClanWar
  ): Promise<[string | null, string[]]> {
    const clanMembers = reminder.roles.length === 4 ? [] : await this.getClanMembers(schedule.tag);
    const clan = data.clan.tag === schedule.tag ? data.clan : data.opponent;
    const attacksPerMember = data.attacksPerMember ?? 1;
    if (reminder.smartSkip && clan.destructionPercentage >= 100) return [null, []];

    const members = clan.members
      .filter((mem) => {
        if (schedule.warTag && !mem.attacks?.length) return true;

        if (!reminder.remaining) return true;
        return reminder.remaining.includes(attacksPerMember - (mem.attacks?.length ?? 0));
      })
      .filter((mem) => (reminder.townHalls ? reminder.townHalls.includes(mem.townhallLevel) : true))
      .filter((mem) => {
        if (!reminder.roles || reminder.roles.length === 4) return true;
        const clanMember = clanMembers.find((m) => m.tag === mem.tag);
        return clanMember && reminder.roles.includes(clanMember.role);
      });
    if (!members.length) return [null, []];

    const links = await this.client.resolver.getLinkedUsers(members);

    const mentions: UserMention[] = [];

    for (const member of members) {
      const link = links.find((link) => link.tag === member.tag);
      if (!link && reminder.linkedOnly) continue;

      const mention = link ? `<@${link.userId}>` : '0x';
      mentions.push({
        id: link ? link.userId : '0x',
        mention: mention.toString(),
        name: member.name,
        tag: member.tag,
        position: member.mapPosition,
        townHallLevel: member.townhallLevel,
        attacks: member.attacks?.length ?? 0
      });
    }

    if (!mentions.length) return [null, []];

    const userIds = unique(mentions.map((m) => m.id).filter((id) => id !== '0x'));
    mentions.sort((a, b) => a.position - b.position);

    const randomUserIds = await this.randomUsers({
      clanTag: clan.tag,
      userIds,
      limit: reminder.randomLimit ?? 0
    });

    const users = Object.entries(
      mentions.reduce<{ [key: string]: UserMention[] }>((record, cur) => {
        if (randomUserIds.length && !randomUserIds.includes(cur.id)) return record;

        record[cur.mention] ??= [];
        record[cur.mention].push(cur);
        return record;
      }, {})
    );

    users.sort(([a], [b]) => {
      if (a === '0x') return 1;
      if (b === '0x') return -1;
      return 0;
    });

    const prefix = data.state === 'preparation' ? 'starts in' : 'ends in';
    const dur =
      moment(data.state === 'preparation' ? data.startTime : data.endTime)
        .toDate()
        .getTime() - Date.now();
    const warTiming = moment.duration(dur).format('H[h], m[m]', { trim: 'both mid' });
    const label = this.earlyOrLate(dur) ? `War started` : `War ${prefix} ${warTiming}`;

    const clanNick = await this.client.storage.getNickname(reminder.guild, clan.tag, clan.name);

    const text = [
      `\u200e🔔 **${clanNick} (${label})**`,
      `📨 ${reminder.message}`,
      '',
      ...users.map(([mention, members]) =>
        members
          .map((mem, i) => {
            const ping = i === 0 && mention !== '0x' ? ` ${mention}` : '';
            const hits = data.state === 'preparation' || attacksPerMember === 1 ? '' : ` (${mem.attacks}/${attacksPerMember})`;
            const prefix = mention === '0x' && i === 0 ? '\n' : '\u200e';
            return `${prefix}${ORANGE_NUMBERS[mem.townHallLevel]!}${ping} ${escapeMarkdown(mem.name)}${hits}`;
          })
          .join('\n')
      )
    ].join('\n');

    return [text, userIds];
  }

  private async warEndReminderText(
    reminder: Pick<ClanWarRemindersEntity, 'roles' | 'remaining' | 'townHalls' | 'guild' | 'message' | 'duration'>,
    schedule: Pick<ClanWarSchedulersEntity, 'tag' | 'warTag'>,
    data: APIClanWar
  ): Promise<[string | null, string[]]> {
    const prefix = data.state === 'preparation' ? 'starts in' : 'ends in';
    const dur =
      moment(data.state === 'preparation' ? data.startTime : data.endTime)
        .toDate()
        .getTime() - Date.now();
    const warTiming = moment.duration(dur).format('H[h], m[m]', { trim: 'both mid' });
    const clan = data.clan.tag === schedule.tag ? data.clan : data.opponent;

    const clanNick = await this.client.storage.getNickname(reminder.guild, clan.tag, clan.name);
    if (reminder.duration === 24 * 60 * 60 * 1000) {
      const text = [`\u200e🔔 **${clanNick} (War started)**`, `📨 ${reminder.message}`].join('\n');
      return [text, []];
    }

    if (reminder.duration === 0) {
      const text = [`\u200e🔔 **${clanNick} (War has ended)**`, `📨 ${reminder.message}`].join('\n');
      return [text, []];
    }

    const text = [`\u200e🔔 **${clanNick} (War ${prefix} ${warTiming})**`, `📨 ${reminder.message}`].join('\n');
    return [text, []];
  }

  private async trigger(schedule: ClanWarSchedulersEntity) {
    const id = schedule._id.toHexString();
    try {
      const reminder = await this.reminders.findOne({ _id: schedule.reminderId });
      if (!reminder) return await this.delete(schedule, ReminderDeleteReasons.REMINDER_NOT_FOUND);
      if (reminder.disabled) return await this.delete(schedule, ReminderDeleteReasons.REMINDER_DISABLED);

      if (!this.client.channels.cache.has(reminder.channel)) return await this.delete(schedule, ReminderDeleteReasons.CHANNEL_NOT_FOUND);

      const warType = schedule.warTag ? 'cwl' : schedule.isFriendly ? 'friendly' : 'normal';
      if (reminder.warTypes && !reminder.warTypes.includes(warType))
        return await this.delete(schedule, ReminderDeleteReasons.INVALID_WAR_TYPE);

      const { body: data, res } = schedule.warTag
        ? await this.client.coc.getClanWarLeagueRound(schedule.warTag)
        : await this.client.coc.getCurrentWar(schedule.tag);
      if (!res.ok) return this.clear(id);

      if (data.state === 'notInWar') return await this.delete(schedule, ReminderDeleteReasons.NOT_IN_WAR);
      if (data.state === 'warEnded' && schedule.duration !== 0) return await this.delete(schedule, ReminderDeleteReasons.WAR_ENDED);

      if (this.wasInMaintenance(schedule, data)) {
        this.client.logger.info(
          `Reminder shifted [${schedule.tag}] ${schedule.timestamp.toISOString()} => ${moment(data.endTime).toDate().toISOString()}`,
          { label: 'REMINDER' }
        );
        return await this.schedulers.updateOne(
          { _id: schedule._id },
          { $set: { timestamp: new Date(moment(data.endTime).toDate().getTime() - schedule.duration) } }
        );
      }

      const guild = this.client.guilds.cache.get(reminder.guild);
      if (!guild) return await this.delete(schedule, ReminderDeleteReasons.GUILD_NOT_FOUND);

      const [text, userIds] =
        schedule.duration === 0 || reminder.silent
          ? await this.warEndReminderText(reminder, schedule, data)
          : await this.getReminderText(reminder, schedule, data);
      if (!text) return await this.delete(schedule, ReminderDeleteReasons.NO_RECIPIENT);

      const channel = this.client.util.hasPermissions(reminder.channel, [
        'SendMessages',
        'UseExternalEmojis',
        'ViewChannel',
        'ManageWebhooks'
      ]);
      if (channel) {
        if (channel.isThread) reminder.threadId = channel.channel.id;
        const webhook = reminder.webhook ? new WebhookClient(reminder.webhook) : await this.webhook(channel.parent, reminder);

        for (const content of Util.splitMessage(`${text}\n\u200b`)) {
          if (webhook) await this.deliver({ reminder, channel: channel.parent, webhook, content, userIds });
        }
      } else {
        return await this.delete(schedule, ReminderDeleteReasons.CHANNEL_MISSING_PERMISSIONS);
      }
    } catch (error) {
      this.client.logger.error(error, { label: 'REMINDER' });
      return this.clear(id);
    }

    return this.delete(schedule, ReminderDeleteReasons.REMINDER_SENT_SUCCESSFULLY);
  }

  private async deliver({
    reminder,
    channel,
    content,
    userIds,
    webhook
  }: {
    reminder: WithId<ClanWarRemindersEntity>;
    webhook: WebhookClient;
    content: string;
    userIds: string[];
    channel: TextChannel | NewsChannel | ForumChannel | MediaChannel | null;
  }): Promise<APIMessage | null> {
    try {
      return await webhook.send({
        content,
        allowedMentions: this.allowedMentions(reminder, userIds),
        threadId: reminder.threadId
      });
    } catch (error: any) {
      // Unknown Webhook / Unknown Channel
      if ([10015, 10003].includes(error.code) && channel) {
        const webhook = await this.webhook(channel, reminder);
        if (webhook) {
          return webhook.send({
            content,
            allowedMentions: this.allowedMentions(reminder, userIds),
            threadId: reminder.threadId
          });
        }
      }
      throw error;
    }
  }

  private async webhook(channel: TextChannel | NewsChannel | ForumChannel | MediaChannel, reminder: WithId<ClanWarRemindersEntity>) {
    const webhook = await this.client.storage.getWebhook(channel).catch(() => null);
    if (webhook) {
      reminder.webhook = { id: webhook.id, token: webhook.token! };
      await this.reminders.updateOne({ _id: reminder._id }, { $set: { webhook: { id: webhook.id, token: webhook.token! } } });
      return new WebhookClient({ id: webhook.id, token: webhook.token! });
    }
    return null;
  }

  public allowedMentions(
    reminder: Pick<ClanWarRemindersEntity, 'guild' | 'duration' | 'silent'>,
    userIds: string[]
  ): MessageMentionOptions {
    if (reminder.duration === 0 || reminder.silent) return { parse: ['users', 'roles'] };

    const config = this.client.settings.get<{ type: 'optIn' | 'optOut'; wars: string; warsExclusionUserIds: string[] }>(
      reminder.guild,
      Settings.REMINDER_EXCLUSION,
      {
        type: 'optIn',
        warsExclusionUserIds: []
      }
    );

    const guild = this.client.guilds.cache.get(reminder.guild);
    if (!config.wars || !guild) return { parse: ['users'] };

    if (config.type === 'optIn') {
      return { parse: [], users: userIds.filter((id) => config.warsExclusionUserIds.includes(id)) };
    }

    return { parse: [], users: userIds.filter((id) => !config.warsExclusionUserIds.includes(id)) };
  }

  private async _refresh() {
    const cursor = this.schedulers.find({ timestamp: { $lt: new Date(Date.now() + this.refreshRate) } });

    const now = new Date().getTime();
    for await (const schedule of cursor) {
      if (schedule.triggered) continue;
      if (this.client.inMaintenance) continue;

      if (!this.client.guilds.cache.has(schedule.guild)) continue;
      if (this.queued.has(schedule._id.toHexString())) continue;

      if (this.client.settings.hasCustomBot(schedule.guild) && !this.client.isCustom()) continue;

      if (schedule.timestamp.getTime() < now) {
        this.trigger(schedule);
      } else {
        this.queue(schedule);
      }
    }
  }
}

interface UserMention {
  position: number;
  id: string;
  mention: string;
  name: string;
  tag: string;
  townHallLevel: number;
  attacks: number;
}
