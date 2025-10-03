import { Collections } from '@app/constants';
import { LegendAttacksEntity } from '@app/entities';
import moment from 'moment';
import { container } from 'tsyringe';
import { Client } from '../struct/client.js';
import { Season, Util } from '../util/toolkit.js';

export const getLegendTimestampAgainstDay = (day?: number) => {
  if (!day) return { ...Util.getCurrentLegendTimestamp(), day: Util.getLegendDay() };

  const days = Util.getLegendDays();
  const num = Math.min(days.length, Math.max(day, 1));
  return { ...days[num - 1], day };
};

const _getLegendAttacks = async (...playerTags: string[]) => {
  const client = container.resolve(Client);
  const seasonId = new Date() <= new Date('2025-10-06T05:00:00.000Z') ? { $in: ['2025-09', '2025-10'] } : Season.oldId;

  if (typeof seasonId == 'string') {
    const result = await client.db.collection(Collections.LEGEND_ATTACKS).findOne({ tag: { $in: playerTags }, seasonId });
    return result ? [result] : [];
  }

  return client.db
    .collection(Collections.LEGEND_ATTACKS)
    .aggregate<LegendAttacksEntity>([
      {
        $match: {
          tag: { $in: playerTags },
          seasonId
        }
      },
      {
        $unwind: {
          path: '$logs'
        }
      },
      {
        $group: {
          _id: '$tag',
          logs: {
            $push: '$logs'
          },
          streak: {
            $last: '$streak'
          },
          name: {
            $last: '$name'
          },
          tag: {
            $last: '$tag'
          },
          trophies: {
            $last: '$trophies'
          },
          initial: {
            $first: '$initial'
          },
          seasonId: {
            $last: '$seasonId'
          },
          attack_logs_last: {
            $last: '$attackLogs'
          },
          attack_logs_first: {
            $first: '$attackLogs'
          },
          defense_logs_last: {
            $last: '$defenseLogs'
          },
          defense_logs_first: {
            $first: '$defenseLogs'
          }
        }
      },
      {
        $set: {
          defenseLogs: {
            $mergeObjects: ['$defense_logs_first', '$defense_logs_last']
          },
          attackLogs: {
            $mergeObjects: ['$attack_logs_first', '$attack_logs_last']
          }
        }
      },
      {
        $unset: ['attack_logs_last', 'attack_logs_first', 'defense_logs_first', 'defense_logs_last']
      }
    ])
    .toArray();
};

export const getLegendAttack = async (playerTag: string) => {
  const result = await _getLegendAttacks(playerTag);
  return result.length ? result[0] : null;
};

export const aggregateLegendAttacks = async (playerTag: string) => {
  const client = container.resolve(Client);
  const seasonId = new Date() <= new Date('2025-10-06T05:00:00.000Z') ? { $in: ['2025-09', '2025-10'] } : Season.oldId;
  const lastDayEnd = Util.getCurrentLegendTimestamp().startTime;

  if (typeof seasonId == 'string') {
    const seasonIds = Util.getSeasons().slice(0, 3).reverse();
    const [, seasonStart, seasonEnd] = seasonIds;
    const [, lastSeasonEnd] = seasonIds;

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
              $in: seasonIds.map((id) => moment(id).format('YYYY-MM'))
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
  }

  const currentCursor = client.db.collection(Collections.LEGEND_ATTACKS).aggregate<{
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
          $in: ['2025-09', '2025-10']
        }
      }
    },
    {
      $unwind: {
        path: '$logs'
      }
    },
    {
      $group: {
        _id: '$tag',
        logs: {
          $push: '$logs'
        },
        streak: {
          $last: '$streak'
        },
        name: {
          $last: '$name'
        },
        tag: {
          $last: '$tag'
        },
        trophies: {
          $last: '$trophies'
        },
        initial: {
          $first: '$initial'
        },
        seasonId: {
          $last: '$seasonId'
        },
        attack_logs_last: {
          $last: '$attackLogs'
        },
        attack_logs_first: {
          $first: '$attackLogs'
        },
        defense_logs_last: {
          $last: '$defenseLogs'
        },
        defense_logs_first: {
          $first: '$defenseLogs'
        }
      }
    },
    {
      $set: {
        defenseLogs: {
          $mergeObjects: ['$defense_logs_first', '$defense_logs_last']
        },
        attackLogs: {
          $mergeObjects: ['$attack_logs_first', '$attack_logs_last']
        }
      }
    },
    {
      $unset: ['attack_logs_last', 'attack_logs_first', 'defense_logs_first', 'defense_logs_last']
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
  ]);

  const prevCursor = client.db.collection(Collections.LEGEND_ATTACKS).aggregate<{
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
          $in: ['2025-08']
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
  ]);

  const [current, prev] = await Promise.all([currentCursor.toArray(), prevCursor.toArray()]);

  return {
    items: [...current, ...prev],
    seasonStart: new Date('2025-08-25T05:00:00.000Z'),
    seasonEnd: new Date('2025-10-06T05:00:00.000Z'),
    lastSeasonEnd: new Date('2025-08-25T05:00:00.000Z')
  };
};
