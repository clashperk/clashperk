import { BatchThrottler, RESTManager } from '@clashperk/clashofclans.js';

// declare module '@clashperk/clashofclans.js' {}

export class Clash extends RESTManager {
	public constructor() {
		super({
			keys: [...(process.env.CLASH_TOKENS?.split(',') ?? [])],
			restRequestTimeout: 8000,
			cache: true,
			retryLimit: 1,
			throttler: new BatchThrottler(30),
			rejectIfNotValid: false
		});
	}
}
