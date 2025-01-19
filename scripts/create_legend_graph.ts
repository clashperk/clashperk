process.env.TZ = 'UTC';
import { Collections } from '@app/constants';
import 'dotenv/config';
import { writeFileSync } from 'fs';
import moment from 'moment';
import { mongoClient } from '../src/struct/database.js';
import { createLegendGraph } from '../src/struct/image-helper.js';
import { Season, Util } from '../src/util/toolkit.js';

function getLastMondayOfMonth(month: number, year: number): Date {
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const lastMonday = new Date(lastDayOfMonth);
  lastMonday.setDate(lastMonday.getDate() - ((lastMonday.getDay() + 6) % 7));
  lastMonday.setHours(5, 0, 0, 0);
  return lastMonday;
}

async function graph(data: {
  tag: string;
  name: string;
  townHallLevel: number;
  trophies: number;
  clan: {
    name: string;
    tag: string;
  };
}) {
  await mongoClient.connect().then(() => console.log('MongoDB Connected!'));
  const db = mongoClient.db('clashperk');
  const lastDayEnd = Util.getCurrentLegendTimestamp().startTime;
  const seasonIds = Array(Math.min(3))
    .fill(0)
    .map((_, m) => {
      const now = new Date(Season.ID);
      now.setHours(0, 0, 0, 0);
      now.setMonth(now.getMonth() - (m - 1), 0);
      return getLastMondayOfMonth(now.getMonth(), now.getFullYear());
    })
    .reverse();
  const [, seasonStart, seasonEnd] = seasonIds;
  const [lastSeasonStart, lastSeasonEnd] = seasonIds;

  const result = await db
    .collection(Collections.LEGEND_ATTACKS)
    .aggregate<{
      _id: string;
      logs: {
        timestamp: Date;
        trophies: number | null;
      }[];
      avgGain: number;
      avgOffense: number;
      avgDefense: number;
    }>([
      {
        $match: {
          tag: data.tag,
          seasonId: {
            $in: seasonIds.map((id) => Season.generateID(id))
          }
        }
      },
      {
        $unwind: {
          path: '$logs'
        }
      },
      {
        $set: {
          ts: {
            $toDate: '$logs.timestamp'
          }
        }
      },
      {
        $set: {
          ts: {
            $dateTrunc: {
              date: '$ts',
              unit: 'day',
              timezone: '-05:00'
            }
          }
        }
      },
      {
        $sort: {
          ts: 1
        }
      },
      {
        $addFields: {
          gain: {
            $subtract: ['$logs.end', '$logs.start']
          },
          offense: {
            $cond: {
              if: {
                $gt: ['$logs.inc', 0]
              },
              then: '$logs.inc',
              else: 0
            }
          },
          defense: {
            $cond: {
              if: {
                $lte: ['$logs.inc', 0]
              },
              then: '$logs.inc',
              else: 0
            }
          }
        }
      },
      {
        $group: {
          _id: '$ts',
          seasonId: {
            $first: '$seasonId'
          },
          trophies: {
            $last: '$logs.end'
          },
          gain: {
            $sum: '$gain'
          },
          offense: {
            $sum: '$offense'
          },
          defense: {
            $sum: '$defense'
          },
          count: {
            $sum: 1
          }
        }
      },
      {
        $sort: {
          _id: 1
        }
      },
      {
        $group: {
          _id: '$seasonId',
          logs: {
            $push: {
              timestamp: '$_id',
              trophies: '$trophies',
              defense: '$defense',
              offense: '$offense',
              gain: '$gain',
              count: '$count'
            }
          }
        }
      },
      {
        $set: {
          filtered_logs: {
            $filter: {
              input: '$logs',
              as: 'log',
              cond: {
                $or: [
                  {
                    $lt: [
                      '$$log.timestamp',
                      {
                        $toDate: lastDayEnd
                      }
                    ]
                  },
                  {
                    $gte: ['$$log.count', 16]
                  }
                ]
              }
            }
          }
        }
      },
      {
        $project: {
          avgOffense: {
            $avg: {
              $cond: {
                if: {
                  $gt: [{ $size: '$filtered_logs' }, 0]
                },
                then: '$filtered_logs.offense',
                else: '$logs.offense'
              }
            }
          },
          avgDefense: {
            $avg: {
              $cond: {
                if: {
                  $gt: [{ $size: '$filtered_logs' }, 0]
                },
                then: '$filtered_logs.defense',
                else: '$logs.defense'
              }
            }
          },
          avgGain: {
            $avg: {
              $cond: {
                if: {
                  $gt: [{ $size: '$filtered_logs' }, 0]
                },
                then: '$filtered_logs.gain',
                else: '$logs.gain'
              }
            }
          },
          logs: 1,
          _id: 1
        }
      },
      {
        $sort: {
          _id: -1
        }
      }
    ])
    .toArray();
  if (!result.length) return null;

  const season = result.at(0)!;
  const lastSeason = result.at(1);
  const prevFinalTrophies = lastSeason?.logs.at(-1)?.trophies ?? '';

  if (season._id !== Season.ID) return null;

  const labels = Array.from({ length: moment(seasonEnd).diff(seasonStart, 'days') + 1 }, (_, i) =>
    moment(seasonStart).add(i, 'days').toDate()
  );

  for (const label of labels) {
    const log = season.logs.find((log) => moment(log.timestamp).isSame(label, 'day'));
    if (!log) season.logs.push({ timestamp: label, trophies: null });
  }
  season.logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const lastSeasonLabels = Array.from({ length: moment(lastSeasonEnd).diff(lastSeasonStart, 'days') + 1 }, (_, i) =>
    moment(lastSeasonStart).add(i, 'days').toDate()
  );

  if (lastSeason) {
    lastSeasonLabels.forEach((label, idx) => {
      const log = lastSeason.logs.find((log) => moment(log.timestamp).isSame(label, 'day'));
      if (!log) lastSeason.logs.push({ timestamp: label, trophies: lastSeason.logs[idx - 1]?.trophies ?? null });
    });

    lastSeason.logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    lastSeason.logs = lastSeason.logs.slice(-season.logs.length);
  }

  return createLegendGraph({
    datasets: result.slice(0, 2),
    data: {
      name: data.name,
      townHallLevel: data.townHallLevel,
      trophies: data.trophies
    },
    labels,
    prevFinalTrophies,
    season,
    seasonEnd,
    seasonStart,
    lastSeason
  });
}

(async () => {
  const result = await graph({
    name: 'Nishchay',
    clan: {
      name: 'Mutant X',
      tag: '#28P220JCV'
    },
    tag: '#888VV8Y2J',
    trophies: 5619,
    townHallLevel: 17
  });
  if (!result) return;

  writeFileSync('legend.jpeg', result.file);
  mongoClient.close();
})();
