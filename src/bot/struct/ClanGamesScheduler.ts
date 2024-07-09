import { ClanGamesRemindersEntity, ClanGamesSchedulersEntity } from '@app/entities';
import { APIClan } from 'clashofclans.js';
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
import { unique } from 'radash';
import { ClanGamesModel } from '../types/index.js';
import { ORANGE_NUMBERS } from '../util/_emojis.js';
import { Collections, Settings } from '../util/constants.js';
import { ClanGamesConfig, Util } from '../util/index.js';
import { ReminderDeleteReasons } from './CapitalRaidScheduler.js';
import { Client } from './Client.js';

// fetch links from our db
export default class ClanGamesScheduler {
  protected schedulers!: Collection<ClanGamesSchedulersEntity>;
  protected reminders!: Collection<ClanGamesRemindersEntity>;
  private readonly refreshRate: number;
  private readonly queued = new Map<string, NodeJS.Timeout>();

  public constructor(private readonly client: Client) {
    this.refreshRate = 5 * 60 * 1000;
    this.schedulers = this.client.db.collection(Collections.CG_SCHEDULERS);
    this.reminders = this.client.db.collection(Collections.CG_REMINDERS);
  }

  public timings() {
    const startTime = moment().startOf('month').add(21, 'days').add(8, 'hours');
    const endTime = startTime.clone().add(6, 'days');
    return { startTime: startTime.toDate().getTime(), endTime: endTime.toDate().getTime() };
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

    await this._insert();
    setInterval(this._insert.bind(this), this.refreshRate + 25 * 60 * 1000).unref();
  }

  private async _insert() {
    if ((this.client.shard?.ids[0] ?? 0) !== 0) return null;
    if (this.client.isCustom()) return null;

    const insertedSeasonId = this.client.settings.get('global', Settings.CLAN_GAMES_REMINDER_TIMESTAMP, '0');
    const currentSeasonId = this.getSeasonId();

    if (insertedSeasonId === currentSeasonId) return null;

    const { startTime, endTime } = this.timings();
    if (!(Date.now() >= startTime && Date.now() <= endTime)) return null;

    this.client.logger.info(`Inserting new clan games schedules for season ${currentSeasonId}`, { label: 'ClanGamesScheduler' });

    const cursor = this.reminders.find();
    for await (const reminder of cursor) {
      await this.create(reminder);
    }

    this.client.settings.set('global', Settings.CLAN_GAMES_REMINDER_TIMESTAMP, currentSeasonId);
    this.client.logger.info(`Inserted new clan games schedules for season ${currentSeasonId}`, { label: 'ClanGamesScheduler' });
  }

  public async create(reminder: ClanGamesRemindersEntity) {
    const { startTime, endTime } = this.timings();
    if (!(Date.now() >= startTime && Date.now() <= endTime)) return;

    for (const tag of reminder.clans) {
      const { res, body: clan } = await this.client.http.getClan(tag);
      if (!res.ok) continue;
      const rand = Math.random();

      const ms = endTime - reminder.duration;
      if (Date.now() > new Date(ms).getTime()) continue;

      await this.schedulers.insertOne({
        _id: new ObjectId(),
        guild: reminder.guild,
        tag: clan.tag,
        name: clan.name,
        duration: reminder.duration,
        reminderId: reminder._id,
        source: `bot_${this.client.shard?.ids[0] ?? 0}_${rand}`,
        triggered: false,
        timestamp: new Date(ms),
        createdAt: new Date()
      });
    }
  }

  private queue(schedule: ClanGamesSchedulersEntity) {
    if (this.client.settings.hasCustomBot(schedule.guild) && !this.client.isCustom()) return;
    if (!this.client.guilds.cache.has(schedule.guild)) return;

    this.queued.set(
      schedule._id.toHexString(),
      setTimeout(() => {
        this.trigger(schedule);
      }, schedule.timestamp.getTime() - Date.now())
    );
  }

  private async delete(schedule: ClanGamesSchedulersEntity, reason: string) {
    if (!this.client.guilds.cache.has(schedule.guild)) return;

    this.clear(schedule._id.toHexString());
    return this.schedulers.updateOne({ _id: schedule._id }, { $set: { triggered: true, reason } });
  }

  private clear(id: string) {
    const timeoutId = this.queued.get(id);
    if (timeoutId) clearTimeout(timeoutId);
    return this.queued.delete(id);
  }

  private getSeasonId() {
    const now = new Date();
    return now.toISOString().slice(0, 7);
  }

  private async query(clan: APIClan) {
    const fetched = await this.client.http._getPlayers(clan.memberList);
    const clanMembers = fetched.map((data) => {
      const value = data.achievements.find((a) => a.name === 'Games Champion')?.value ?? 0;
      return { tag: data.tag, name: data.name, points: value, role: data.role, townHallLevel: data.townHallLevel };
    });

    const dbMembers = await this.client.db
      .collection(Collections.CLAN_GAMES_POINTS)
      .aggregate<ClanGamesModel>([
        {
          $match: { tag: { $in: clan.memberList.map((mem) => mem.tag) }, season: this.getSeasonId() }
        },
        {
          $limit: 60
        }
      ])
      .toArray();

    const members = [];
    for (const member of clanMembers) {
      const mem = dbMembers.find((m) => m.tag === member.tag);
      if (mem && !mem.__clans.includes(clan.tag)) continue;

      members.push({
        ...member,
        points: mem ? member.points - mem.initial : 0
      });
    }

    return members;
  }

  public async getReminderText(
    reminder: Pick<ClanGamesRemindersEntity, 'roles' | 'guild' | 'message' | 'minPoints' | 'allMembers' | 'linkedOnly'>,
    schedule: Pick<ClanGamesSchedulersEntity, 'tag'>
  ): Promise<[string | null, string[]]> {
    const { res, body: clan } = await this.client.http.getClan(schedule.tag);
    if (res.status === 503) throw new Error('MaintenanceBreak');
    if (!res.ok) return [null, []];

    const clanMembers = await this.query(clan);
    const maxParticipants = clanMembers.filter((mem) => mem.points >= 1).length;

    const members = clanMembers
      .filter((mem) => {
        return mem.points < (reminder.minPoints === 0 ? ClanGamesConfig.MAX_POINT : reminder.minPoints);
      })
      .filter((m) => (reminder.allMembers ? m.points >= 0 : m.points >= 1))
      .filter((mem) => (maxParticipants >= 50 ? mem.points >= 1 : true))
      .filter((mem) => {
        if (reminder.roles.length === 4) return true;
        return reminder.roles.includes(mem.role!);
      });
    if (!members.length) return [null, []];

    const links = await this.client.resolver.getLinkedUsers(members);

    const mentions: UserMention[] = [];

    for (const member of members) {
      const link = links.find((link) => link.tag === member.tag);
      if (!link && reminder.linkedOnly) continue;

      mentions.push({
        id: link ? link.userId : '0x',
        mention: link ? (`<@${link.userId}>` as const) : '0x',
        name: member.name,
        townHallLevel: member.townHallLevel,
        tag: member.tag,
        points: member.points
      });
    }
    if (!mentions.length) return [null, []];

    const userIds = unique(mentions.map((m) => m.id).filter((id) => id !== '0x'));

    const users = Object.entries(
      mentions.reduce<{ [key: string]: UserMention[] }>((acc, cur) => {
        acc[cur.mention] ??= []; // eslint-disable-line
        acc[cur.mention].push(cur);
        return acc;
      }, {})
    );

    users.sort(([a], [b]) => {
      if (a === '0x') return 1;
      if (b === '0x') return -1;
      return 0;
    });

    const { endTime } = this.timings();
    const warTiming = moment.duration(endTime - Date.now()).format('D[d] H[h], m[m]', { trim: 'both mid' });

    const clanNick = await this.client.storage.getNickname(reminder.guild, clan.tag, clan.name);

    const text = [
      `\u200e🔔 **${clanNick} (Clan Games ends in ${warTiming})**`,
      `📨 ${reminder.message}`,
      '',
      users
        .map(([mention, members]) =>
          members
            .map((mem, i) => {
              const ping = i === 0 && mention !== '0x' ? ` ${mention}` : '';
              const hits = ` (${mem.points}/${reminder.minPoints === 0 ? ClanGamesConfig.MAX_POINT : reminder.minPoints})`;
              const prefix = mention === '0x' && i === 0 ? '\n' : '\u200e';
              return `${prefix}${ORANGE_NUMBERS[mem.townHallLevel]} ${ping} ${escapeMarkdown(mem.name)}${hits}`;
            })
            .join('\n')
        )
        .join('\n')
    ].join('\n');

    return [text, userIds];
  }

  private async trigger(schedule: ClanGamesSchedulersEntity) {
    const id = schedule._id.toHexString();
    try {
      const reminder = await this.reminders.findOne({ _id: schedule.reminderId });
      if (!reminder) return await this.delete(schedule, ReminderDeleteReasons.REMINDER_NOT_FOUND);

      if (!this.client.channels.cache.has(reminder.channel)) return await this.delete(schedule, ReminderDeleteReasons.CHANNEL_NOT_FOUND);

      const { endTime } = this.timings();
      if (endTime < Date.now()) return await this.delete(schedule, ReminderDeleteReasons.TOO_LATE);

      const guild = this.client.guilds.cache.get(reminder.guild);
      if (!guild) return await this.delete(schedule, ReminderDeleteReasons.GUILD_NOT_FOUND);

      const [text, userIds] = await this.getReminderText(reminder, schedule);
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

        for (const content of Util.splitMessage(text)) {
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
    reminder: WithId<ClanGamesRemindersEntity>;
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
        if (webhook)
          return webhook.send({
            content,
            allowedMentions: this.allowedMentions(reminder, userIds),
            threadId: reminder.threadId
          });
      }
      throw error;
    }
  }

  private async webhook(channel: TextChannel | NewsChannel | ForumChannel | MediaChannel, reminder: WithId<ClanGamesRemindersEntity>) {
    const webhook = await this.client.storage.getWebhook(channel).catch(() => null);
    if (webhook) {
      reminder.webhook = { id: webhook.id, token: webhook.token! };
      await this.reminders.updateOne({ _id: reminder._id }, { $set: { webhook: { id: webhook.id, token: webhook.token! } } });
      return new WebhookClient({ id: webhook.id, token: webhook.token! });
    }
    return null;
  }

  private allowedMentions(reminder: ClanGamesRemindersEntity, userIds: string[]): MessageMentionOptions {
    const config = this.client.settings.get<{ type: 'optIn' | 'optOut'; games: string; gamesExclusionUserIds: string[] }>(
      reminder.guild,
      Settings.REMINDER_EXCLUSION,
      {
        type: 'optIn',
        gamesExclusionUserIds: []
      }
    );

    const guild = this.client.guilds.cache.get(reminder.guild);
    if (!config.games || !guild) return { parse: ['users'] };

    if (config.type === 'optIn') {
      return { parse: [], users: userIds.filter((id) => config.gamesExclusionUserIds.includes(id)) };
    }

    return { parse: [], users: userIds.filter((id) => !config.gamesExclusionUserIds.includes(id)) };
  }

  private async _refresh() {
    const cursor = this.schedulers.find({ timestamp: { $lt: new Date(Date.now() + this.refreshRate) } });

    const now = new Date().getTime();
    for await (const schedule of cursor) {
      if (schedule.triggered) continue;
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
  id: string;
  mention: string;
  name: string;
  tag: string;
  townHallLevel: number;
  points: number;
}
