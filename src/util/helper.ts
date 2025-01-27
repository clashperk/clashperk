import { PlayerSeasonsEntity } from '@app/entities';
import { APIClan, APIPlayer } from 'clashofclans.js';
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ComponentType, StringSelectMenuBuilder } from 'discord.js';
import { AnyBulkWriteOperation, ObjectId } from 'mongodb';
import { title, unique } from 'radash';
import { container } from 'tsyringe';
import { Client } from '../struct/client.js';
import { Collections, FeatureFlags, Settings } from './constants.js';
import { Util } from './toolkit.js';

export const hexToNanoId = (hex: ObjectId) => {
  return hex.toHexString().slice(-5).toUpperCase();
};

export const makeAbbr = (text: string) => {
  return title(text)
    .split(/\s+/)
    .map((word) => word[0].toUpperCase())
    .join('');
};

export const trimTag = (tag: string) => {
  return tag.replace('#', '');
};

export const padStart = (str: string | number, length: number) => {
  return `${str}`.padStart(length, ' ');
};

export const padEnd = (str: string | number, length: number) => {
  return `${str}`.padEnd(length, ' ');
};

export const escapeBackTick = (text: string) => {
  return text.replace(/`/g, '');
};

export const localeSort = (a: string, b: string) => {
  return a.replace(/[^\x00-\xF7]+/g, '').localeCompare(b.replace(/[^\x00-\xF7]+/g, ''));
};

export const lastSeenTimestampFormat = (timestamp: number) => {
  if (!timestamp) return padStart('', 7);
  return padStart(Util.duration(timestamp + 1e3), 7);
};

export const clanGamesMaxPoints = (month: number) => {
  const client = container.resolve(Client);
  const exceptionalMonths = client.settings.get<number[]>('global', Settings.CLAN_GAMES_EXCEPTIONAL_MONTHS, []);
  if (exceptionalMonths.includes(month)) return 5000;
  return 4000;
};

export const isNullish = (value: unknown) => typeof value === 'undefined' || value === null;

export const sumHeroes = (player: APIPlayer) => {
  return player.heroes.reduce((prev, curr) => {
    if (curr.village === 'builderBase') return prev;
    return curr.level + prev;
  }, 0);
};

export const nullsLastSortAlgo = (a: unknown, b: unknown) => {
  if (isNullish(a) && isNullish(b)) {
    return 0;
  } else if (isNullish(a)) {
    return 1;
  } else if (isNullish(b)) {
    return -1;
  }

  return 10;
};

export const clanGamesSortingAlgorithm = (a: number, b: number) => {
  if (a === b) return 0;
  if (a === 0) return 1;
  if (b === 0) return -1;
  return a - b;
};

export const clanGamesLatestSeasonId = () => {
  const currentDate = new Date();
  if (currentDate.getDate() < 20) currentDate.setMonth(currentDate.getMonth() - 1);
  return currentDate.toISOString().slice(0, 7);
};

/**
 * @param sheet must be `spreadsheet.data`
 */
export const getExportComponents = (sheet: { spreadsheetUrl: string; spreadsheetId: string }) => {
  return [
    new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Google Sheet').setURL(sheet.spreadsheetUrl),
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Open in Web').setURL(sheet.spreadsheetUrl.replace('edit', 'pubhtml'))
    ),
    new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel('Download')
        .setURL(`https://docs.google.com/spreadsheets/export?id=${sheet.spreadsheetId}&exportFormat=xlsx`)
    )
  ];
};

export const getMenuFromMessage = (interaction: ButtonInteraction, selected: string, customId: string) => {
  const _components = interaction.message.components;
  const mainIndex = _components.findIndex(({ components }) => components.length === 4);
  const components = _components.slice(mainIndex + 1);
  const component = components.at(0)?.components.at(0);

  if (component && component.type === ComponentType.StringSelect) {
    const menu = StringSelectMenuBuilder.from(component.toJSON());
    const options = component.options.map((op) => ({
      ...op,
      default: op.value === selected
    }));
    menu.setOptions(options);
    menu.setCustomId(customId);
    return [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)];
  }

  return [];
};

export const recoverDonations = async (clan: APIClan, seasonId: string) => {
  const client = container.resolve(Client);
  const { endTime, startTime } = client.coc.util.getSeason(new Date(seasonId));

  const isEnabled = await client.isFeatureEnabled(FeatureFlags.DONATIONS_RECOVERY, 'global');
  if (!isEnabled) return;

  const redisKey = `RECOVERY:${seasonId}:${clan.tag}`;
  if (await client.redis.connection.get(redisKey)) return;

  client.logger.log(`Recovering donations for ${clan.tag}...`, { label: 'DonationRecovery' });

  const { aggregations } = await client.elastic.search({
    query: {
      bool: {
        filter: [
          {
            term: {
              clan_tag: clan.tag
            }
          },
          {
            range: {
              created_at: {
                gte: startTime.toISOString()
              }
            }
          },
          {
            range: {
              created_at: {
                lte: endTime.toISOString()
              }
            }
          }
        ]
      }
    },
    from: 0,
    size: 0,
    aggs: {
      players: {
        terms: {
          field: 'tag',
          size: 10000
        },
        aggs: {
          donated: {
            filter: {
              term: {
                op: 'DONATED'
              }
            },
            aggs: {
              total: {
                sum: {
                  field: 'value'
                }
              }
            }
          },
          received: {
            filter: {
              term: {
                op: 'RECEIVED'
              }
            },
            aggs: {
              total: {
                sum: {
                  field: 'value'
                }
              }
            }
          }
        }
      }
    }
  });

  const membersMap = clan.memberList.reduce<Record<string, { donated: number; received: number }>>((record, mem) => {
    record[mem.tag] = {
      donated: mem.donations,
      received: mem.donationsReceived
    };
    return record;
  }, {});

  const { buckets } = (aggregations?.players ?? []) as { buckets: AggsBucket[] };
  const playersMap = buckets.reduce<Record<string, { donated: number; received: number }>>((acc, cur) => {
    const member = membersMap[cur.key] ?? { donated: 0, received: 0 };

    acc[cur.key] = {
      donated: Math.max(cur.donated.total.value, member.donated),
      received: Math.max(cur.received.total.value, member.received)
    };

    return acc;
  }, {});

  const tags = Object.keys(playersMap);
  if (!tags.length) return;

  const collection = client.db.collection(Collections.PLAYER_SEASONS);
  const cursor = await collection
    .find({ tag: { $in: unique(tags) }, season: seasonId })
    .project({ tag: 1, name: 1, clans: 1, _id: 1, season: seasonId })
    .toArray();

  const ops: AnyBulkWriteOperation<PlayerSeasonsEntity>[] = [];
  for (const player of cursor) {
    if (!player.clans?.[clan.tag]) continue;

    const record = playersMap[player.tag];
    const donations = Math.max(player.clans[clan.tag].donations.total, record.donated);
    const received = Math.max(player.clans[clan.tag].donationsReceived.total, record.received);

    ops.push({
      updateOne: {
        filter: { _id: player._id },
        update: {
          $set: {
            [`clans.${clan.tag}.donations.total`]: donations,
            [`clans.${clan.tag}.donationsReceived.total`]: received
          }
        }
      }
    });
  }

  if (ops.length) await collection.bulkWrite(ops);

  return client.redis.set(redisKey, '-0-', 60 * 60 * 24);
};

export const unitsFlatten = (data: APIPlayer, { withEquipment = true }) => {
  const heroEquipment = withEquipment ? data.heroEquipment : [];
  return [
    ...data.troops.map((u) => ({
      name: u.name,
      level: u.level,
      maxLevel: u.maxLevel,
      type: 'troop',
      village: u.village
    })),
    ...data.heroes.map((u) => ({
      name: u.name,
      level: u.level,
      maxLevel: u.maxLevel,
      type: 'hero',
      village: u.village
    })),
    ...data.spells.map((u) => ({
      name: u.name,
      level: u.level,
      maxLevel: u.maxLevel,
      type: 'spell',
      village: u.village
    })),
    ...heroEquipment.map((u) => ({
      name: u.name,
      level: u.level,
      maxLevel: u.maxLevel,
      type: 'equipment',
      village: u.village
    }))
  ];
};

interface AggsBucket {
  key: string;
  doc_count: number;
  donated: {
    total: {
      value: number;
    };
  };
  received: {
    total: {
      value: number;
    };
  };
}
