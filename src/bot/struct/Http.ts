import { Client, Player, ClanMember } from 'clashofclans.js';
import fetch from 'node-fetch';

export default class Http extends Client {
	private readonly tokens: string[];

	private tokenIndex: number;

	public constructor() {
		super();

		this.timeout = 5000;
		this.token = process.env.DEVELOPER_TOKEN!;
		// this.baseURL = 'https://coc.clashperk.com/v1';

		this.tokens = [...process.env.CLASH_TOKENS!.split(',')];
		this.tokenIndex = 0;
	}

	public async fetch(path: string) {
		const res = await fetch(`${this.baseURL!}${path}`, {
			headers: {
				Authorization: `Bearer ${this.randomToken}`,
				Accept: 'application/json'
			},
			timeout: Number(this.timeout)
		}).catch(() => null);

		const parsed = await res?.json().catch(() => null);
		if (!parsed) return { ok: false, status: res?.status ?? 504 };

		const maxAge = res?.headers.get('cache-control')?.split('=')?.[1] ?? 0;
		return Object.assign(parsed, { status: res?.status ?? 504, ok: res?.status === 200, maxAge: Number(maxAge) * 1000 });
	}

	public detailedClanMembers(members: ClanMember[] = []): Promise<Player[]> {
		return Promise.all(members.map(mem => this.fetch(`/players/${encodeURIComponent(mem.tag)}`)));
	}

	private get randomToken() {
		const token = this.tokens[this.tokenIndex];
		this.tokenIndex = (this.tokenIndex + 1) >= this.tokens.length ? 0 : (this.tokenIndex + 1);
		return token;
	}
}
