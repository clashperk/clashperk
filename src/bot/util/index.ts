import moment from 'moment';
import 'moment-duration-format';

const DURATION = {
	SECOND: 1000,
	MINUTE: 1000 * 60,
	HOUR: 1000 * 60 * 60,
	DAY: 1000 * 60 * 60 * 24
};

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class Season {
	private static getSeasonEnd(month: number, year: number, autoFix = true): Date {
		const now = new Date();
		now.setUTCFullYear(year);
		now.setUTCMonth(month, 0);
		now.setUTCHours(5, 0, 0, 0);

		const newDate = now.getUTCDay() === 0 ? now.getUTCDate() - 6 : now.getUTCDate() - (now.getUTCDay() - 1);
		now.setUTCDate(newDate);

		if (Date.now() >= now.getTime() && autoFix) {
			return this.getSeasonEnd(month + 1, year);
		}

		return now;
	}

	public static get ending() {
		return Date.now() > new Date(this.getTimestamp.getTime() + 60 * 60 * 1000).getTime();
	}

	public static get ended() {
		return this.getTimestamp.getMonth() !== new Date().getMonth();
	}

	public static get previousID() {
		return new Date().toISOString().substring(0, 7);
	}

	public static get ID() {
		return this.getTimestamp.toISOString().substring(0, 7);
	}

	public static get getTimestamp() {
		const now = new Date();
		return this.getSeasonEnd(now.getMonth() + 1, now.getFullYear());
	}

	public static get startTimestamp() {
		return this.getSeasonEnd(this.getTimestamp.getMonth(), this.getTimestamp.getFullYear(), false);
	}

	public static get endTimestamp() {
		return new Date(this.getTimestamp);
	}

	public static generateID(date: Date | string) {
		return new Date(date).toISOString().substring(0, 7);
	}
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class Util {
	public static tagToId(tag: string) {
		const id = tag
			.substring(1)
			.split('')
			.reduce((sum, char) => sum * 14n + BigInt('0289PYLQGRJCUV'.indexOf(char)), 0n);
		return id;
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

	public static idToTag(id: string | bigint) {
		id = BigInt(id);
		let tag = '';
		while (id !== 0n) {
			const i = Number(id % 14n);
			tag = `${'0289PYLQGRJCUV'[i]}${tag}`; // eslint-disable-line
			id /= 14n;
		}

		return `#${tag}`;
	}

	public static escapeBackTick(name: string) {
		return name.replace('`', '');
	}

	/**
	 * Season IDs of last 6 months.
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
		return new Date().toISOString().substring(0, 7);
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

	public static paginate<T>(pages: T[], page = 1, pageLength = 1) {
		const maxPage = Math.ceil(pages.length / pageLength);
		if (page < 1) page = 1;
		if (page > maxPage) page = maxPage;
		const startIndex = (page - 1) * pageLength;
		const sliced = pages.length > pageLength ? pages.slice(startIndex, startIndex + pageLength) : pages;

		return {
			pages: sliced,
			page,
			maxPage,
			pageLength,
			next() {
				page += 1;
				if (page < 1) page = this.maxPage;
				if (page > this.maxPage) page = 1;
				return { page: page, ended: page === this.maxPage, started: page === 1 };
			},
			previous() {
				page -= 1;
				if (page < 1) page = this.maxPage;
				if (page > this.maxPage) page = 1;
				return { page: page, started: page === 1, ended: page === this.maxPage };
			},
			first() {
				return this.pages[0];
			}
		};
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
		num = Number.isInteger(num) ? num : num.toFixed(1);
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

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ClanGames {
	public static get Started() {
		const startTime = new Date();
		startTime.setDate(this.STARTING_DATE);
		startTime.setHours(6, 0, 0, 0);

		const endTime = new Date();
		endTime.setDate(this.STARTING_DATE + 6);
		endTime.setHours(10, 0, 0, 0);

		return new Date() >= startTime && new Date() <= endTime;
	}

	public static get isSpecial() {
		return [7, 11].includes(new Date().getMonth());
	}

	public static get MAX_TOTAL() {
		return this.isSpecial ? 75_000 : 50_000;
	}

	public static get MAX_POINT() {
		return this.isSpecial ? 5_000 : 4_000;
	}

	public static get STARTING_DATE() {
		return 22;
	}

	public static get startTimestamp() {
		const startTime = new Date();
		startTime.setDate(this.STARTING_DATE);
		startTime.setHours(8, 0, 0, 0);

		return startTime;
	}

	public static get endTimestamp() {
		const endTime = new Date();
		endTime.setDate(this.STARTING_DATE + 6);
		endTime.setHours(10, 0, 0, 0);

		return endTime;
	}

	public static get seasonID() {
		return new Date().toISOString().substring(0, 7);
	}
}
