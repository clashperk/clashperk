import { Util as CocUtil } from 'clashofclans.js';
import moment from 'moment';

// Stats move from league seasons to calendar months at this instant (same as the backend worker).
const MONTHLY_STATS_FROM = Date.UTC(2026, 10, 1);

const MONTH_ID = /^\d{4}-\d{2}$/;

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
    const isRaidWeek =
      (day === 5 && hours >= 7) || [0, 6].includes(day) || (day === 1 && hours < 7);
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
      moment().hour() >= 5
        ? moment().startOf('day').add(5, 'hours')
        : moment().startOf('day').subtract(1, 'day').add(5, 'hours');

    return {
      startTime: start.toDate().getTime(),
      endTime: start.clone().add(1, 'day').toDate().getTime()
    };
  }

  /** Returns the day count for today. */
  public static getLegendDay() {
    const { endTime } = this.getCurrentLegendTimestamp();
    return moment(endTime).diff(moment(Season.getLeagueSeason().startTime), 'days');
  }

  /** Returns the day count for previous day. */
  public static getPreviousLegendDay() {
    const { endTime } = this.getPreviousLegendTimestamp();
    const diff = moment(endTime).diff(moment(Season.getLeagueSeason().startTime), 'days');
    if (diff === 0) {
      const timestamp = moment(endTime).startOf('month').startOf('month').toDate();
      return moment(endTime).diff(moment(Season.getLeagueSeason(timestamp).endTime), 'days');
    }
    return diff;
  }

  /** Returns total number of days */
  public static getLegendDays() {
    return Array(Util.getLegendDay())
      .fill(0)
      .map((_, i) => {
        const startTime = moment(Season.getLeagueSeason().startTime)
          .startOf('day')
          .add(i, 'days')
          .add(5, 'hours');
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

  public static splitMessage(
    text: string,
    { maxLength = 2_000, char = '\n', prepend = '', append = '' } = {}
  ) {
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

  private static getLegacySeasonIds(count: number): string[] {
    const { seasonId } = Util.getSeason();
    return Array.from({ length: count }).map((_, idx) => {
      return moment(seasonId, 'YYYY-MM').subtract(idx, 'month').format('YYYY-MM');
    });
  }

  /** Trophy league season ids, newest first. */
  public static getLeagueSeasonIds(count = 18): string[] {
    if (!Season.split) return this.getLegacySeasonIds(count);
    return Util.getLeagueSeasons(count).map((season) => season.id);
  }

  /** Ids that PlayerSeasons, Players.seasons and CapitalRanks are keyed by, newest first. */
  public static getStatsPeriodIds(count = 18): string[] {
    if (!Season.split) return this.getLegacySeasonIds(count);

    const months = Util.getMonths(count)
      .filter((month) => month.startTime.getTime() >= MONTHLY_STATS_FROM)
      .map((month) => month.id);
    const seasons = Util.getLeagueSeasons(count - months.length, new Date(MONTHLY_STATS_FROM - 1));
    return [...months, ...seasons.map((season) => season.id)];
  }

  /** UTC calendar month ids, newest first. */
  public static getMonthIds(count = 18): string[] {
    return Util.getMonths(count).map((month) => month.id);
  }

  /** "5 Oct – 2 Nov 2026" for a league season id (start date or legacy YYYY-MM). */
  public static leagueSeasonLabel(seasonId: string) {
    const { startTime, endTime } = Util.getLeagueSeasonById(seasonId);
    const start = moment.utc(startTime);
    const end = moment.utc(endTime);
    return `${start.format(start.year() === end.year() ? 'D MMM' : 'D MMM YYYY')} – ${end.format('D MMM YYYY')}`;
  }

  /** Fixed-width "05 Oct 26" (the start date) for tables. */
  public static leagueSeasonShortLabel(seasonId: string) {
    return moment.utc(Util.getLeagueSeasonById(seasonId).startTime).format('DD MMM YY');
  }

  public static statsPeriodShortLabel(periodId: string) {
    return Season.split && MONTH_ID.test(periodId)
      ? this.monthLabel(periodId)
      : this.leagueSeasonShortLabel(periodId);
  }

  /** Label for a stats period id: a calendar month once split, otherwise a league season. */
  public static statsPeriodLabel(periodId: string) {
    return Season.split && MONTH_ID.test(periodId)
      ? this.monthLabel(periodId)
      : this.leagueSeasonLabel(periodId);
  }

  /** The month whose Clan Games (22nd–28th) fall in a stats period; ClanGamesPoints is keyed by it. */
  public static clanGamesMonthOf(periodId: string) {
    const { startTime, endTime } = Season.getStatsPeriodById(periodId);
    for (
      let month = Util.getMonth(startTime);
      month.startTime < endTime;
      month = Util.getMonth(month.endTime)
    ) {
      const games = Date.UTC(
        month.startTime.getUTCFullYear(),
        month.startTime.getUTCMonth(),
        22,
        8
      );
      if (games >= startTime.getTime() && games < endTime.getTime()) return month.id;
    }
    return Util.getMonth(startTime).id;
  }

  public static monthLabel(monthId: string) {
    return moment.utc(monthId, 'YYYY-MM').format('MMM YYYY');
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

  /** The stats period before the current one. */
  public static getLastStatsPeriodId(): string {
    return Season.getLastStatsPeriod().id;
  }

  public static getLastMonthId() {
    return Util.getMonth(new Date(Util.getMonth().startTime.getTime() - 1)).id;
  }

  public static getCWLSeasonId() {
    return new Date().toISOString().slice(0, 7);
  }

  public static estimateCwlSeasonIds(season: string) {
    // The API's CWL season date isn't perfectly predictable, so a stored/live season may be the
    // requested one plus a few days. Match the season plus the next 3 days
    // (e.g. "2026-06" -> also 2026-06-01..03; "2026-06-16" -> also 2026-06-17, 2026-06-18).
    return [
      ...new Set([
        season,
        ...Array.from({ length: 3 }, (_, i) => moment(season).add(i, 'day').format('YYYY-MM-DD'))
      ])
    ];
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

  private static _format(
    ms: number,
    msAbs: number,
    dur: number,
    longUnit: string,
    shortUnit: string,
    isLong = false
  ) {
    const plural = msAbs >= dur * 1.5;
    let num: number | string = ms / dur;
    num = Number(Number.isInteger(num) ? num : num.toFixed(1));
    if (num >= 100) num = Math.round(num);
    return `${num}${isLong ? ` ${longUnit}${plural ? 's' : ''}` : shortUnit}`;
  }
}

interface SeasonWindow {
  id: string;
  startTime: Date;
  endTime: Date;
}

export class Season {
  // Off until the stored 28-day YYYY-MM ids are renamed to start dates (the Oct 31 migration).
  public static get split() {
    return process.env.SEASON_SPLIT === '1';
  }

  public static get monthId() {
    return new Date().toISOString().slice(0, 7);
  }

  /** Id for trophy league data: LegendAttacks, PlayerRanks, ClanRanks, legend leaderboards. */
  public static get leagueId() {
    return this.getLeagueSeason().id;
  }

  /** Whether PlayerSeasons, Players.seasons and CapitalRanks are keyed by calendar month. */
  public static get monthlyStats() {
    return this.split && Date.now() >= MONTHLY_STATS_FROM;
  }

  /** Id for PlayerSeasons, Players.seasons and CapitalRanks. */
  public static get statsId() {
    return this.getStatsPeriod().id;
  }

  /** The league season containing the date, with the id format currently stored. */
  public static getLeagueSeason(inputDate?: Date | string): SeasonWindow {
    const season = Util.getLeagueSeason(moment(inputDate).toDate());
    if (this.split) return season;
    // The legacy rule puts a boundary instant in the ending season, so look just past the start.
    return { ...season, id: Util.getSeason(new Date(season.startTime.getTime() + 1)).seasonId };
  }

  /** The latest league seasons, newest first. */
  public static getLeagueSeasons(count: number): SeasonWindow[] {
    return Util.getLeagueSeasons(count).map((season) => this.getLeagueSeason(season.startTime));
  }

  /** A league season by its stored id (start date or legacy YYYY-MM). */
  public static getLeagueSeasonById(seasonId: string): SeasonWindow {
    return { ...Util.getLeagueSeasonById(seasonId), id: seasonId };
  }

  /** The stats period containing the date: a calendar month once monthly stats start, else a league season. */
  public static getStatsPeriod(inputDate?: Date | string): SeasonWindow {
    const date = moment(inputDate).toDate();
    if (this.split && date.getTime() >= MONTHLY_STATS_FROM) return Util.getMonth(date);
    return this.getLeagueSeason(date);
  }

  public static getStatsPeriodById(periodId: string): SeasonWindow {
    if (this.split && MONTH_ID.test(periodId)) return Util.getMonthById(periodId);
    return this.getLeagueSeasonById(periodId);
  }

  public static getLastStatsPeriod(): SeasonWindow {
    return this.getStatsPeriod(new Date(this.getStatsPeriod().startTime.getTime() - 1));
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
    return (
      (date.getDay() === 1 && date.getHours() > 5) || (date.getDay() === 2 && date.getHours() < 5)
    );
  }

  public static toBattleDate(timestamp: Date) {
    const shifted = new Date(timestamp.getTime() - 5 * 60 * 60 * 1000);
    return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()))
      .toISOString()
      .slice(0, 10);
  }
}
