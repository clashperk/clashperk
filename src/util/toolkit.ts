import { Util as CocUtil } from 'clashofclans.js';
import moment from 'moment';

export class Util extends CocUtil {
  // Convert a JavaScript Date object to a Sheets serial date value
  public static dateToSerialDate(jsDate: Date) {
    const baseDate = new Date('1899-12-30').getTime();
    const diffDays = (jsDate.getTime() - baseDate) / (24 * 60 * 60 * 1000);
    return diffDays + 1;
  }

  // Convert a Sheets serial date value to a JavaScript Date object
  public static serialDateToDate(serialDate: number) {
    const baseDate = new Date('1899-12-30');
    const diffMs = (serialDate - 1) * 24 * 60 * 60 * 1000;
    return new Date(baseDate.getTime() + diffMs);
  }

  public static formatNumber(num = 0, fraction = 2) {
    // Nine Zeroes for Billions
    return Math.abs(num) >= 1.0e9
      ? `${(num / 1.0e9).toFixed(fraction)}B`
      : // Six Zeroes for Millions
        Math.abs(num) >= 1.0e6
        ? `${(num / 1.0e6).toFixed(fraction)}M`
        : // Three Zeroes for Thousands
          Math.abs(num) >= 1.0e3
          ? `${(num / 1.0e3).toFixed(fraction)}K`
          : num.toFixed(0);
  }

  public static clanGamesSeasonId() {
    const now = new Date();
    if (now.getDate() < 20) now.setMonth(now.getMonth() - 1);
    return now.toISOString().slice(0, 7);
  }

  public static getClanGamesMaxPoints(season?: string) {
    if ([0, 7, 11].includes(new Date(season || Date.now()).getMonth())) {
      return 5000;
    }
    return 4000;
  }

  public static geRaidWeekend(now: Date) {
    const start = moment(now);
    const day = start.day();
    const hour = start.hours();

    if (day === 1) {
      if (hour < 7) {
        start.day(-7).weekday(5);
      } else {
        start.weekday(5);
      }
    }

    if (day === 0) {
      start.day(-1).weekday(5);
    }

    if (day > 1 && day < 5) {
      start.weekday(5);
    }

    if (day === 6) {
      start.weekday(5);
    }

    start.hour(7).minute(0).second(0).millisecond(0);
    const end = moment(start).add(3, 'days');

    return { raidWeekStartTime: start.toDate(), raidWeekEndTime: end.toDate() };
  }

  public static getRaidWeekEndTimestamp() {
    const start = moment();
    const day = start.day();
    const hours = start.hours();
    const isRaidWeek = (day === 5 && hours >= 7) || [0, 6].includes(day) || (day === 1 && hours < 7);
    if (day < 5 || (day <= 5 && hours < 7)) start.day(-7);
    start.day(5);
    start.hours(7).minutes(0).seconds(0).milliseconds(0);
    return {
      startTime: start.toDate(),
      weekId: start.format('YYYY-MM-DD'),
      endTime: start.clone().add(3, 'days').toDate(),
      isRaidWeek
    };
  }

  public static raidWeekDateFormat(startDate: Date, endDate: Date) {
    if (startDate.getFullYear() !== endDate.getFullYear()) {
      return `${moment(startDate).format('DD MMM YYYY')} - ${moment(endDate).format('DD MMM YYYY')}`;
    }

    if (startDate.getMonth() !== endDate.getMonth()) {
      return `${moment(startDate).format('DD MMM')} - ${moment(endDate).format('DD MMM YYYY')}`;
    }

    return `${startDate.getDate()} - ${endDate.getDate()} ${moment(startDate).format('MMM YYYY')}`;
  }

  /** Returns today's start time and end time. */
  public static getCurrentLegendTimestamp() {
    const start =
      moment().hour() >= 5 ? moment().startOf('day').add(5, 'hours') : moment().startOf('day').subtract(1, 'day').add(5, 'hours');

    return { startTime: start.toDate().getTime(), endTime: start.clone().add(1, 'day').toDate().getTime() };
  }

  /** Returns the day count for today. */
  public static getLegendDay() {
    const { endTime } = this.getCurrentLegendTimestamp();
    return moment(endTime).diff(moment(Season.getSeason().startTime), 'days');
  }

  /** Returns the day count for previous day. */
  public static getPreviousLegendDay() {
    const { endTime } = this.getPreviousLegendTimestamp();
    const diff = moment(endTime).diff(moment(Season.getSeason().startTime), 'days');
    if (diff === 0) {
      const timestamp = moment(endTime).startOf('month').startOf('month').toDate();
      return moment(endTime).diff(moment(Season.getSeason(timestamp).endTime), 'days');
    }
    return diff;
  }

  /** Returns total number of days */
  public static getLegendDays() {
    return Array(Util.getLegendDay())
      .fill(0)
      .map((_, i) => {
        const startTime = moment(Season.getSeason().startTime).startOf('day').add(i, 'days').add(5, 'hours');
        const endTime = startTime.clone().add(1, 'day');
        return { startTime: startTime.toDate().getTime(), endTime: endTime.toDate().getTime() };
      });
  }

  /** Returns yesterday's start time and end time */
  public static getPreviousLegendTimestamp() {
    const { startTime } = this.getCurrentLegendTimestamp();
    const prevDay = moment(startTime).startOf('day').subtract(1, 'day').add(5, 'hours');
    const nextDay = prevDay.clone().add(1, 'day');
    return { startTime: prevDay.toDate().getTime(), endTime: nextDay.toDate().getTime() };
  }

  public static splitMessage(text: string, { maxLength = 2_000, char = '\n', prepend = '', append = '' } = {}) {
    if (text.length <= maxLength) return [text];
    let splitText = [text];
    if (Array.isArray(char)) {
      while (char.length > 0 && splitText.some((elem) => elem.length > maxLength)) {
        const currentChar = char.shift();
        if (currentChar instanceof RegExp) {
          splitText = splitText.flatMap((chunk) => chunk.match(currentChar)!);
        } else {
          splitText = splitText.flatMap((chunk) => chunk.split(currentChar));
        }
      }
    } else {
      splitText = text.split(char);
    }
    if (splitText.some((elem) => elem.length > maxLength)) throw new RangeError('SPLIT_MAX_LEN');
    const messages = [];
    let msg = '';
    for (const chunk of splitText) {
      if (msg && (msg + char + chunk + append).length > maxLength) {
        messages.push(msg + append);
        msg = prepend;
      }
      msg += (msg && msg !== prepend ? char : '') + chunk;
    }
    return messages.concat(msg).filter((m) => m);
  }

  public static escapeBackTick(name: string) {
    return name.replace(/`/g, '');
  }

  public static getSeasonIds(): string[] {
    const { seasonId } = Util.getSeason();
    return Array.from({ length: 18 }).map((_, idx) => {
      return moment(seasonId, 'YYYY-MM').subtract(idx, 'month').format('YYYY-MM');
    });
  }

  public static getSeasons() {
    const { seasonId } = Util.getSeason();
    return Array.from({ length: 6 }).map((_, idx) => {
      const lastSeasonId = moment(seasonId, 'YYYY-MM').subtract(idx, 'month').format('YYYY-MM');
      return Util.getSeasonById(lastSeasonId);
    });
  }

  public static getWeekIds(limit = 6) {
    const weekIds: { name: string; value: string }[] = [];
    const friday = moment().endOf('month').day('Friday').startOf('day');
    while (weekIds.length < limit) {
      if (friday.toDate().getTime() < Date.now()) {
        weekIds.push({ name: friday.format('DD MMM, YYYY'), value: friday.format('YYYY-MM-DD') });
      }
      friday.subtract(7, 'd');
    }
    return weekIds.map((d) => d.value);
  }

  /**
   * Season ID of the last month.
   * @returns {string} SeasonId
   */
  public static getLastSeasonId(): string {
    return Season.getLastSeason().seasonId;
  }

  public static getCWLSeasonId() {
    return new Date().toISOString().slice(0, 7);
  }

  public static escapeSheetName(name: string) {
    return name.replace(/[\*\?\:\[\]\\\/\']/g, '');
  }

  public static delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public static duration(ms: number) {
    if (ms > 864e5) {
      return moment.duration(ms).format('d[d] H[h]', { trim: 'both mid' });
    } else if (ms > 36e5) {
      return moment.duration(ms).format('H[h] m[m]', { trim: 'both mid' });
    }
    return moment.duration(ms).format('m[m] s[s]', { trim: 'both mid' });
  }

  public static ms(num: number, isLong = false) {
    const abs = Math.abs(num);

    const units = [
      { duration: 1000 * 60 * 60 * 24, long: 'day', short: 'd' },
      { duration: 1000 * 60 * 60, long: 'hour', short: 'h' },
      { duration: 1000 * 60, long: 'minute', short: 'm' },
      { duration: 1000, long: 'second', short: 's' }
    ];

    for (const { duration, long: longUnit, short: shortUnit } of units) {
      if (abs >= duration) {
        return this._format(num, abs, duration, longUnit, shortUnit, isLong);
      }
    }

    return `${num}${isLong ? ' ms' : 'ms'}`;
  }

  private static _format(ms: number, msAbs: number, dur: number, longUnit: string, shortUnit: string, isLong = false) {
    const plural = msAbs >= dur * 1.5;
    let num: number | string = ms / dur;
    num = Number(Number.isInteger(num) ? num : num.toFixed(1));
    if (num >= 100) num = Math.round(num);
    return `${num}${isLong ? ` ${longUnit}${plural ? 's' : ''}` : shortUnit}`;
  }
}

export class Season {
  public static get monthId() {
    return moment().format('YYYY-MM');
  }

  public static get ID() {
    return this.getSeason().seasonId;
  }

  public static getLastSeason() {
    const { seasonId } = Util.getSeason();
    const lastSeasonId = moment(seasonId, 'YYYY-MM').subtract(1, 'month').format('YYYY-MM');
    return Util.getSeasonById(lastSeasonId);
  }

  public static getSeason(inputDate?: Date | string) {
    return Util.getSeason(moment(inputDate).toDate());
  }

  public static getSeasonById(seasonId: string) {
    return Util.getSeasonById(seasonId);
  }

  public static get tournamentID() {
    const { startTime, id } = Util.getTournamentWindow();

    if (this.isTournamentReset) {
      return moment(startTime).subtract(7, 'days').format('YYYY-MM-DD');
    }

    return id;
  }

  public static get isTournamentReset() {
    const date = new Date();
    return (date.getDay() === 1 && date.getHours() > 5) || (date.getDay() === 2 && date.getHours() < 5);
  }
}
