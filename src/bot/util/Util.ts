import moment from 'moment';
import 'moment-duration-format';
import { Season } from './Season.js';

const DURATION = {
  SECOND: 1000,
  MINUTE: 1000 * 60,
  HOUR: 1000 * 60 * 60,
  DAY: 1000 * 60 * 60 * 24
};

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class Util {
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

  public static timezoneOffset(seconds: number, ms = true) {
    seconds = Math.abs(seconds);
    if (ms) seconds /= 1000;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours >= 1 ? `0${hours}`.slice(-2) : '00'}:${minutes >= 1 ? `0${minutes}`.slice(-2) : '00'}`;
  }

  public static plural(count: number, text: string, suffix: 's' | 'es' | '' = 's') {
    return count === 1 ? text : `${text}${suffix}`;
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
      prevWeekEndTime: start.clone().subtract(4, 'days').toDate(),
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

  public static getCurrentLegendTimestamp() {
    const start =
      moment().hour() >= 5 ? moment().startOf('day').add(5, 'hours') : moment().startOf('day').subtract(1, 'day').add(5, 'hours');

    return { startTime: start.toDate().getTime(), endTime: start.clone().add(1, 'day').subtract(1, 'second').toDate().getTime() };
  }

  public static getLegendDay() {
    const { endTime } = this.getCurrentLegendTimestamp();
    return moment(endTime).add(1, 'second').diff(moment(Season.startTimestamp), 'days');
  }

  public static getPreviousLegendDay() {
    const { endTime } = this.getPreviousLegendTimestamp();
    const diff = moment(endTime).add(1, 'second').diff(moment(Season.startTimestamp), 'days');
    if (diff === 0) {
      const timestamp = moment(endTime).startOf('month').subtract(1, 'second').startOf('month').toDate();
      return moment(endTime)
        .add(1, 'second')
        .diff(moment(Season.getLastMondayOfMonth(timestamp.getMonth(), timestamp.getFullYear(), timestamp)), 'days');
    }
    return diff;
  }

  public static getLegendDays() {
    return Array(Util.getLegendDay())
      .fill(0)
      .map((_, i) => {
        const startTime = moment(Season.startTimestamp).startOf('day').add(i, 'days').add(5, 'hours');
        const endTime = startTime.clone().add(1, 'day').subtract(1, 'second');
        return { startTime: startTime.toDate().getTime(), endTime: endTime.toDate().getTime() };
      });
  }

  public static dateRangeFormat(startDate: Date, endDate: Date) {
    if (startDate.getFullYear() !== endDate.getFullYear()) {
      return `${moment(startDate).format('DD MMM YYYY')} - ${moment(endDate).format('DD MMM YYYY')}`;
    }

    if (startDate.getMonth() !== endDate.getMonth()) {
      return `${moment(startDate).format('DD MMM')} - ${moment(endDate).format('DD MMM YYYY')}`;
    }

    return `${startDate.getDate()} - ${endDate.getDate()} ${moment(startDate).format('MMM YYYY')}`;
  }

  public static getPreviousLegendTimestamp() {
    const { startTime } = this.getCurrentLegendTimestamp();
    const prevDay = moment(startTime).startOf('day').subtract(1, 'day').add(5, 'hours');
    const nextDay = prevDay.clone().add(1, 'day').subtract(1, 'second');
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

  /**
   * @returns {string[]} SeasonIds
   */
  public static getSeasonIds(): string[] {
    return Array(Math.min(24))
      .fill(0)
      .map((_, m) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        now.setMonth(now.getMonth() - (m - 1), 0);
        return now;
      })
      .filter((now) => now.getTime() >= new Date('2021-04').getTime())
      .map((now) => moment(now).format('YYYY-MM'));
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
   * Season IDs of last X months.
   * @param months Last X months.
   * @returns {string[]} SeasonIds
   */
  public static getLastSeasonIds(months = 1): string[] {
    return Array(months)
      .fill(0)
      .map((_, month) => {
        const now = new Date(Season.ID);
        now.setHours(0, 0, 0, 0);
        now.setMonth(now.getMonth() - month, 0);
        return Season.generateID(now);
      })
      .concat(Season.ID);
  }

  /**
   * Season ID of the last month.
   * @returns {string} SeasonId
   */
  public static getLastSeasonId(): string {
    return Season.generateID(Season.startTimestamp);
  }

  public static getCWLSeasonId() {
    return new Date().toISOString().slice(0, 7);
  }

  public static getRelativeTime(ms: number) {
    return `<t:${Math.floor(ms / 1000)}:R>`;
  }

  public static getShortDate(ms: number) {
    return `<t:${Math.floor(ms / 1000)}:f>`;
  }

  public static chunk<T>(items: T[], chunk: number) {
    const array = [];
    for (let i = 0; i < items.length; i += chunk) {
      array.push(items.slice(i, i + chunk));
    }
    return array;
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

  private static _format(ms: number, msAbs: number, dur: number, long: string, short: string, l = false) {
    const plural = msAbs >= dur * 1.5;
    let num: number | string = ms / dur;
    num = Number(Number.isInteger(num) ? num : num.toFixed(1));
    if (num >= 100) num = Math.round(num);
    return `${num}${l ? ` ${long}${plural ? 's' : ''}` : short}`;
  }

  public static ms(num: number, long = false) {
    const abs = Math.abs(num);
    if (abs >= DURATION.DAY) return this._format(num, abs, DURATION.DAY, 'day', 'd', long);
    if (abs >= DURATION.HOUR) return this._format(num, abs, DURATION.HOUR, 'hour', 'h', long);
    if (abs >= DURATION.MINUTE) return this._format(num, abs, DURATION.MINUTE, 'minute', 'm', long);
    if (abs >= DURATION.SECOND) return this._format(num, abs, DURATION.SECOND, 'second', 's', long);
    return `${num}${long ? ' ' : ''}ms`;
  }
}
