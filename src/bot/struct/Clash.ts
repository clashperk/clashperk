import { Client } from '@clashperk/clashofclans.js';

declare module '@clashperk/clashofclans.js' {
	export interface Clan {
		ok: number;
		status: number;
		maxAge: number;
	}
}

export class Clash extends Client {
	public constructor() {
		super({
			keys: [...(process.env.CLASH_TOKENS?.split(',') ?? [])],
			restRequestTimeout: 8000,
			cache: true,
			retryLimit: 1
		});
	}
}
