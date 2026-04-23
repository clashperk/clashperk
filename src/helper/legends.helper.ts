import moment from 'moment';
import { api, encode } from '../api/axios.js';
import { BattleLogDailyDto, BattleLogDto } from '../api/generated.js';
import { Util } from '../util/toolkit.js';

export const getLegendTimestampAgainstDay = (day?: number) => {
  if (!day) return { ...Util.getCurrentLegendTimestamp(), day: Util.getLegendDay() };

  const days = Util.getLegendDays();
  const num = Math.min(days.length, Math.max(day, 1));
  return { ...days[num - 1], day };
};

export const getLegendBattleLog = async (playerTag: string): Promise<BattleLogDto[]> => {
  const result = await api.players.getBattleLog({ playerTag: encode(playerTag) });
  if (!result?.data?.items) return [];
  return result.data.items.filter((b) => b.battleType === 'legend');
};

export const getLegendBattleLogAggregate = async (
  playerTag: string
): Promise<BattleLogDailyDto[]> => {
  const result = await api.players.getBattleLogAggregate({ playerTag: encode(playerTag) });
  if (!result?.data?.items) return [];
  return result.data.items;
};

export const aggregateLegendBattleLog = (dailyItems: BattleLogDailyDto[]) => {
  const seasons = Util.getSeasons().slice(0, 3).reverse();
  const [prevPrev, prevSeason, currentSeason] = seasons;

  const seasonStart = new Date(prevSeason.endTime);
  const seasonEnd = new Date(currentSeason.endTime);
  const lastSeasonEnd = new Date(prevSeason.endTime);

  const groupBySeason = (startMs: number, endMs: number) =>
    dailyItems.filter((item) => {
      const t = moment(item.battleDate).add(6, 'hours').toDate().getTime();
      return t >= startMs && t < endMs;
    });

  const buildSeasonEntry = (seasonId: string, startDate: Date, endDate: Date) => {
    const items = groupBySeason(startDate.getTime(), endDate.getTime());
    const logs = items.map((item) => ({
      timestamp: new Date(item.battleDate),
      trophies: Number(item.trophies) as number | null
    }));
    const avgGain = items.length ? items.reduce((s, i) => s + Number(i.gain), 0) / items.length : 0;
    const avgOffense = items.length
      ? items.reduce((s, i) => s + Number(i.offense), 0) / items.length
      : 0;
    const avgDefense = items.length
      ? items.reduce((s, i) => s + Number(i.defense), 0) / items.length
      : 0;
    return { _id: seasonId, logs, avgGain, avgOffense, avgDefense };
  };

  const currentEntry = buildSeasonEntry(
    currentSeason.seasonId,
    new Date(prevSeason.endTime),
    new Date(currentSeason.endTime)
  );
  const prevEntry = buildSeasonEntry(
    prevSeason.seasonId,
    new Date(prevPrev.endTime),
    new Date(prevSeason.endTime)
  );

  const items = [currentEntry, prevEntry].filter((s) => s.logs.length > 0);

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
  // Exception: 0 stars means no trophies are lost by the defender
  if (isLegendLeague) {
    return stars === 0 ? 0 : -attackerGain;
  }

  // In Ranked, the defender GAINS the remainder of the 40 pool
  // 0-star defense always gives full 40 to defender
  if (stars === 0) {
    return 40;
  }

  return 40 - attackerGain;
};
