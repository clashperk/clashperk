import { APIMessage } from 'discord-api-types';
import * as Discord from 'discord.js';
import 'moment-duration-format';
import moment from 'moment';

// @ts-expect-error
export class Util extends Discord.Util {
	public constructor() {
		super();
	}

	public static tagToId(tag: string) {
		const id = tag.substring(1)
			.split('')
			.reduce((sum, char) => (sum * 14n) + BigInt(('0289PYLQGRJCUV').indexOf(char)), 0n);
		return id;
	}

	public static idToTag(id: string | bigint) {
		id = BigInt(id);
		let tag = '';
		while (id !== 0n) {
			const i = Number(id % 14n);
			tag = `${('0289PYLQGRJCUV')[i]}${tag}`;
			id /= 14n;
		}

		return `#${tag}`;
	}

	public static editMessage(client: Discord.Client, channelId: string, messageId: string, data: unknown): Promise<APIMessage> {
		// @ts-expect-error
		return client.api.channels[channelId].messages[messageId].patch({ data });
	}

	public static sendMessage(client: Discord.Client, channelId: string, data: unknown): Promise<APIMessage> {
		// @ts-expect-error
		return client.api.channels[channelId].messages.post({ data });
	}

	public static escapeBackTick(name: string) {
		return name.replace('\`', '');
	}

	/**
	 * Season IDs of last 6 months.
	 * @returns {string[]} SeasonIds
	 */
	public static getSeasonIds(): string[] {
		return Array(new Date().getMonth() - 2)
			.fill(0)
			.map((_, m) => {
				const now = new Date();
				now.setHours(0, 0, 0, 0);
				now.setMonth(now.getMonth() - (m - 1), 0);
				return moment(now).format('YYYY-MM'); // YYYY-MM;
			});
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
		return this.delayFor(ms);
	}

	public static paginate<T>(pages: T[], page = 1, pageLength = 1) {
		const maxPage = Math.ceil(pages.length / pageLength);
		if (page < 1) page = 1;
		if (page > maxPage) page = maxPage;
		const startIndex = (page - 1) * pageLength;
		const sliced = pages.length > pageLength
			? pages.slice(startIndex, startIndex + pageLength)
			: pages;

		return {
			pages: sliced, page, maxPage, pageLength,
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
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class Season {
	private static getSeasonEnd(month: number, autoFix = true): Date {
		const seasonTime = new Date();
		seasonTime.setMonth(month, 0);
		seasonTime.setHours(5, 0, 0, 0);

		const newDate = seasonTime.getDay() === 0
			? seasonTime.getDate() - 6
			: seasonTime.getDate() - (seasonTime.getDay() - 1);
		seasonTime.setDate(newDate);

		if (Date.now() >= seasonTime.getTime() && autoFix) {
			return this.getSeasonEnd(month + 1);
		}

		return seasonTime;
	}

	public static get ending() {
		return Date.now() > new Date(this.getTimestamp.getTime() + (60 * 60 * 1000)).getTime();
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
		const month = new Date().getMonth() + 1;
		return this.getSeasonEnd(month);
	}

	public static get startTimestamp() {
		return this.getSeasonEnd(this.getTimestamp.getMonth(), false);
	}

	public static get endTimestamp() {
		return new Date(this.getTimestamp);
	}

	public static generateID(date: Date | string) {
		return new Date(date).toISOString().substring(0, 7);
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

	public static get MAX_TOTAL() {
		return new Date().getMonth() === 7 ? 75_000 : 50_000;
	}

	public static get MAX_POINT() {
		return new Date().getMonth() === 7 ? 5_000 : 4_000;
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
