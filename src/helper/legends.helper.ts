import { Util } from '../util/toolkit.js';

export const getLegendTimestampAgainstDay = (day?: number) => {
  if (!day) return { ...Util.getCurrentLegendTimestamp(), day: Util.getLegendDay() };

  const days = Util.getLegendDays();
  const num = Math.min(days.length, Math.max(day, 1));
  return { ...days[num - 1], day };
};
