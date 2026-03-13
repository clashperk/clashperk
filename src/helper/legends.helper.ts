import { Collections } from '@app/constants';
import { container } from 'tsyringe';
import { Client } from '../struct/client.js';
import { Season, Util } from '../util/toolkit.js';

export const getLegendTimestampAgainstDay = (day?: number) => {
  if (!day) return { ...Util.getCurrentLegendTimestamp(), day: Util.getLegendDay() };

  const days = Util.getLegendDays();
  const num = Math.min(days.length, Math.max(day, 1));
  return { ...days[num - 1], day };
};

export const getLegendAttack = async (playerTag: string) => {
  const client = container.resolve(Client);
  return await client.db
    .collection(Collections.LEGEND_ATTACKS)
    .findOne({ tag: playerTag, seasonId: Season.ID });
};

export const aggregateLegendAttacks = async (playerTag: string) => {
  const client = container.resolve(Client);
  const lastDayEnd = Util.getCurrentLegendTimestamp().startTime;

  const seasons = Util.getSeasons().slice(0, 3).reverse();
  const [, seasonStart, seasonEnd] = seasons.map(({ endTime }) => endTime);
  const [, lastSeasonEnd] = seasons.map(({ endTime }) => endTime);

  const items = await client.db
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
          tag: playerTag,
          seasonId: {
            $in: seasons.map(({ seasonId }) => seasonId)
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

  return { items, seasonStart, seasonEnd, lastSeasonEnd };
};

export const calculateTrophies = (
  stars: number,
  destruction: number,
  isAttack: boolean,
  isLegendLeague: boolean
): number => {
  let attackerGain = 0;

  if (stars === 3) {
    // 3 stars always awards the full pool
    attackerGain = 40;
  } else if (stars === 2) {
    // 16 base + 1 per 3% over 50%
    attackerGain = 16 + Math.floor((destruction - 50) / 3);
  } else if (stars === 1) {
    // 5 base + 1 per 9% destruction
    attackerGain = 5 + Math.floor(destruction / 9);
  } else {
    // 0 stars: 1 trophy per 10% destruction (minimum 10% required)
    if (destruction >= 10) {
      attackerGain = Math.floor(destruction / 10);
    }
  }

  // Cap at 40 (standard trophy pool)
  if (attackerGain > 40) {
    attackerGain = 40;
  }

  if (isAttack) {
    return attackerGain;
  }

  // In Legend League, the defender LOSES what the attacker gains
  if (isLegendLeague) {
    return -attackerGain;
  }

  // In Ranked, the defender GAINS the remainder of the 40 pool
  // 0-star defense always gives full 40 to defender
  if (stars === 0) {
    return 40;
  }

  return 40 - attackerGain;
};
