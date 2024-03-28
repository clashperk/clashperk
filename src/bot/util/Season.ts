import 'moment-duration-format';

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

	public static getLastMondayOfMonth(month: number, year: number, date?: Date): Date {
		const lastDayOfMonth = new Date(year, month + 1, 0);
		const lastMonday = new Date(lastDayOfMonth);
		lastMonday.setDate(lastMonday.getDate() - ((lastMonday.getDay() + 6) % 7));
		lastMonday.setHours(5, 0, 0, 0);
		if (date && date.getTime() > lastMonday.getTime()) {
			return this.getLastMondayOfMonth(month + 1, year, date);
		}
		return lastMonday;
	}

	public static get ending() {
		return Date.now() > new Date(this.getTimestamp.getTime() + 60 * 60 * 1000).getTime();
	}

	public static get ended() {
		return this.getTimestamp.getMonth() !== new Date().getMonth();
	}

	public static get previousID() {
		return new Date().toISOString().slice(0, 7);
	}

	public static get ID() {
		return this.getTimestamp.toISOString().slice(0, 7);
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
		return new Date(date).toISOString().slice(0, 7);
	}
}
