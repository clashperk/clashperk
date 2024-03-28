import 'moment-duration-format';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ClanGamesConfig {
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
		return [0, 7, 11].includes(new Date().getMonth());
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
		return new Date().toISOString().slice(0, 7);
	}
}
