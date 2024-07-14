import { ClanLogsEntity, ClanLogType } from '@app/entities';
import { AnyBulkWriteOperation } from 'mongodb';
import Client from '../struct/client-module.js';
import { Collections } from '../util/constants.js';

const query = { tag: '#YL2VRJPV', guild: { $in: ['509784317598105619', '1016659402817814620'] } };

export class Migrator {
  public constructor(private client: Client) {}

  get collection() {
    return this.client.db.collection(Collections.CLAN_LOGS);
  }

  async migrate() {
    // await this.migrateClanFeedLog();
    // await this.migrateDonationLog();
    // await this.migrateClanEmbed();
    // await this.migrateCapitalLog();
    // await this.migrateClanGamesLog();
    // await this.migrateClanWarLogs();
    // await this.migrateLastSeenLogs();
    // await this.migrateLegendLogs();
  }

  async migrateClanFeedLog() {
    this.client.logger.info('Migrating donation logs', { label: 'Migrator' });
    const logs = await this.client.db.collection(Collections.CLAN_FEED_LOGS).find(query).toArray();

    const ops: AnyBulkWriteOperation<ClanLogsEntity>[] = [];
    for (const log of logs) {
      for (const logType of [
        ClanLogType.MEMBER_JOIN_LEAVE_LOG,
        ClanLogType.TOWN_HALL_UPGRADE_LOG,
        // ClanLogType.ROLE_CHANGE_LOG,
        ClanLogType.WAR_PREFERENCE_LOG,
        ClanLogType.NAME_CHANGE_LOG,
        ClanLogType.CLAN_ACHIEVEMENTS_LOG
      ] as ClanLogType[]) {
        const extra: Partial<ClanLogsEntity> = {};
        if (logType === ClanLogType.MEMBER_JOIN_LEAVE_LOG && log.role) {
          extra.flagAlertRoleId = log.role;
        }

        ops.push({
          updateOne: {
            filter: { clanTag: log.tag, guildId: log.guild, logType },
            update: {
              $set: {
                guildId: log.guild,
                channelId: log.channel,
                clanId: log.clanId,
                clanTag: log.tag,
                color: log.color,
                createdAt: log.createdAt,
                updatedAt: log.updatedAt ?? new Date(),
                deepLink: log.deepLink,
                isEnabled: true,
                lastPostedAt: new Date(),
                messageId: null,
                metadata: {},
                webhook: log.webhook,
                ...extra
              }
            },
            upsert: true
          }
        });
      }
    }

    if (ops.length) await this.collection.bulkWrite(ops, { ordered: false });

    this.client.logger.info('Clan feed logs migrated', { label: 'Migrator' });
  }

  async migrateDonationLog() {
    this.client.logger.info('Migrating donation logs', { label: 'Migrator' });
    const logs = await this.client.db.collection(Collections.DONATION_LOGS).find(query).toArray();

    const ops: AnyBulkWriteOperation<ClanLogsEntity>[] = [];
    for (const log of logs) {
      const intervalList = (log.interval ?? ['INSTANT']) as string[];
      for (const interval of intervalList) {
        const maps: Record<string, string> = {
          WEEKLY: 'weeklyLastPosted',
          MONTHLY: 'monthlyLastPosted',
          DAILY: 'dailyLastPosted'
        };

        const logTypeMaps: Record<string, ClanLogType> = {
          WEEKLY: ClanLogType.WEEKLY_DONATION_LOG,
          MONTHLY: ClanLogType.MONTHLY_DONATION_LOG,
          DAILY: ClanLogType.DAILY_DONATION_LOG,
          INSTANT: ClanLogType.CONTINUOUS_DONATION_LOG
        };

        ops.push({
          updateOne: {
            filter: { clanTag: log.tag, guildId: log.guild, logType: logTypeMaps[interval] },
            update: {
              $set: {
                guildId: log.guild,
                channelId: log.channel,
                clanId: log.clanId,
                clanTag: log.tag,
                color: log.color,
                createdAt: log.createdAt,
                updatedAt: log.updatedAt ?? new Date(),
                deepLink: log.deepLink,
                isEnabled: true,
                lastPostedAt: maps[interval] ? log[maps[interval]] : log.updatedAt ?? new Date(),
                logType: logTypeMaps[interval],
                messageId: null,
                metadata: {},
                webhook: log.webhook
              }
            },
            upsert: true
          }
        });
      }
    }

    if (ops.length) await this.collection.bulkWrite(ops, { ordered: false });

    this.client.logger.info('Donation logs migrated', { label: 'Migrator' });
  }

  async migrateClanEmbed() {
    this.client.logger.info('Migrating clan embed logs', { label: 'Migrator' });
    const logs = await this.client.db.collection(Collections.CLAN_EMBED_LOGS).find(query).toArray();

    const ops: AnyBulkWriteOperation<ClanLogsEntity>[] = [];
    for (const log of logs) {
      ops.push({
        updateOne: {
          filter: { clanTag: log.tag, guildId: log.guild, logType: ClanLogType.CLAN_EMBED_LOG },
          update: {
            $set: {
              guildId: log.guild,
              channelId: log.channel,
              clanId: log.clanId,
              clanTag: log.tag,
              color: log.color,
              createdAt: log.createdAt,
              updatedAt: log.updatedAt ?? new Date(),
              deepLink: log.deepLink,
              isEnabled: true,
              lastPostedAt: log.updatedAt ?? new Date(),
              logType: ClanLogType.CLAN_EMBED_LOG,
              messageId: log.message,
              metadata: log.embed,
              webhook: log.webhook
            }
          },
          upsert: true
        }
      });
    }

    if (ops.length) await this.collection.bulkWrite(ops, { ordered: false });

    this.client.logger.info('Clan Embed logs migrated', { label: 'Migrator' });
  }

  async migrateCapitalLog() {
    this.client.logger.info('Migrating capital logs', { label: 'Migrator' });
    const logs = await this.client.db.collection(Collections.CAPITAL_LOGS).find(query).toArray();

    const ops: AnyBulkWriteOperation<ClanLogsEntity>[] = [];
    for (const log of logs) {
      ops.push({
        updateOne: {
          filter: { clanTag: log.tag, guildId: log.guild, logType: ClanLogType.CLAN_CAPITAL_WEEKLY_SUMMARY_LOG },
          update: {
            $set: {
              guildId: log.guild,
              channelId: log.channel,
              clanId: log.clanId,
              clanTag: log.tag,
              color: log.color,
              createdAt: log.createdAt,
              updatedAt: log.updatedAt ?? new Date(),
              deepLink: log.deepLink,
              isEnabled: true,
              lastPostedAt: log.lastPosted ?? new Date(),
              logType: ClanLogType.CLAN_CAPITAL_WEEKLY_SUMMARY_LOG,
              messageId: log.message,
              metadata: {},
              webhook: log.webhook
            }
          },
          upsert: true
        }
      });
    }

    if (ops.length) await this.collection.bulkWrite(ops, { ordered: false });

    this.client.logger.info('Capital logs migrated', { label: 'Migrator' });
  }

  async migrateClanGamesLog() {
    this.client.logger.info('Migrating clan games logs', { label: 'Migrator' });
    const logs = await this.client.db.collection(Collections.CLAN_GAMES_LOGS).find(query).toArray();

    const ops: AnyBulkWriteOperation<ClanLogsEntity>[] = [];
    for (const log of logs) {
      ops.push({
        updateOne: {
          filter: { clanTag: log.tag, guildId: log.guild, logType: ClanLogType.CLAN_GAMES_EMBED_LOG },
          update: {
            $set: {
              guildId: log.guild,
              channelId: log.channel,
              clanId: log.clanId,
              clanTag: log.tag,
              color: log.color,
              createdAt: log.createdAt,
              updatedAt: log.updatedAt ?? new Date(),
              deepLink: log.deepLink,
              isEnabled: true,
              lastPostedAt: log.lastPosted ?? new Date(),
              logType: ClanLogType.CLAN_GAMES_EMBED_LOG,
              messageId: log.message,
              metadata: {},
              webhook: log.webhook
            }
          },
          upsert: true
        }
      });
    }

    if (ops.length) await this.collection.bulkWrite(ops, { ordered: false });

    this.client.logger.info('Clan games logs migrated', { label: 'Migrator' });
  }

  async migrateClanWarLogs() {
    this.client.logger.info('Migrating clan war logs', { label: 'Migrator' });
    const logs = await this.client.db.collection(Collections.CLAN_WAR_LOGS).find(query).toArray();

    const ops: AnyBulkWriteOperation<ClanLogsEntity>[] = [];
    for (const log of logs) {
      [
        ClanLogType.WAR_EMBED_LOG,
        ClanLogType.CWL_EMBED_LOG,
        ClanLogType.CWL_MISSED_ATTACKS_LOG,
        ClanLogType.WAR_MISSED_ATTACKS_LOG
      ].forEach((logType) => {
        ops.push({
          updateOne: {
            filter: { clanTag: log.tag, guildId: log.guild, logType },
            update: {
              $set: {
                guildId: log.guild,
                channelId: log.channel,
                clanId: log.clanId,
                clanTag: log.tag,
                color: log.color,
                createdAt: log.createdAt,
                updatedAt: log.updatedAt ?? new Date(),
                deepLink: log.deepLink,
                isEnabled: true,
                lastPostedAt: log.lastPosted ?? new Date(),
                logType,
                messageId: log.message,
                metadata: {
                  uid: log.uid,
                  rounds: log.rounds
                },
                webhook: log.webhook
              }
            },
            upsert: true
          }
        });
      });
    }

    if (ops.length) await this.collection.bulkWrite(ops, { ordered: false });

    this.client.logger.info('Clan war logs migrated', { label: 'Migrator' });
  }

  async migrateLastSeenLogs() {
    this.client.logger.info('Migrating last seen logs', { label: 'Migrator' });

    const logs = await this.client.db.collection(Collections.LAST_SEEN_LOGS).find(query).toArray();

    const ops: AnyBulkWriteOperation<ClanLogsEntity>[] = [];
    for (const log of logs) {
      ops.push({
        updateOne: {
          filter: { clanTag: log.tag, guildId: log.guild, logType: ClanLogType.LAST_SEEN_EMBED_LOG },
          update: {
            $set: {
              guildId: log.guild,
              channelId: log.channel,
              clanId: log.clanId,
              clanTag: log.tag,
              color: log.color,
              createdAt: log.createdAt,
              updatedAt: log.updatedAt ?? new Date(),
              deepLink: log.deepLink,
              isEnabled: true,
              lastPostedAt: log.lastPosted ?? new Date(),
              logType: ClanLogType.LAST_SEEN_EMBED_LOG,
              messageId: log.message,
              metadata: {},
              webhook: log.webhook
            }
          },
          upsert: true
        }
      });
    }

    if (ops.length) await this.collection.bulkWrite(ops, { ordered: false });

    this.client.logger.info('Last seen logs migrated', { label: 'Migrator' });
  }

  async migrateLegendLogs() {
    this.client.logger.info('Migrating legend logs', { label: 'Migrator' });

    const logs = await this.client.db.collection(Collections.LEGEND_LOGS).find(query).toArray();

    const ops: AnyBulkWriteOperation<ClanLogsEntity>[] = [];
    for (const log of logs) {
      ops.push({
        updateOne: {
          filter: { clanTag: log.tag, guildId: log.guild, logType: ClanLogType.LEGEND_ATTACKS_DAILY_SUMMARY_LOG },
          update: {
            $set: {
              guildId: log.guild,
              channelId: log.channel,
              clanId: log.clanId,
              clanTag: log.tag,
              color: log.color,
              createdAt: log.createdAt,
              updatedAt: log.updatedAt ?? new Date(),
              deepLink: log.deepLink,
              isEnabled: true,
              lastPostedAt: log.lastPosted ?? new Date(),
              logType: ClanLogType.LEGEND_ATTACKS_DAILY_SUMMARY_LOG,
              messageId: log.message,
              metadata: {},
              webhook: log.webhook
            }
          },
          upsert: true
        }
      });
    }

    if (ops.length) await this.collection.bulkWrite(ops, { ordered: false });

    this.client.logger.info('Legend logs migrated', { label: 'Migrator' });
  }
}
