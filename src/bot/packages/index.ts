/* eslint-disable @typescript-eslint/no-extraneous-class */

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
