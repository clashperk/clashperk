import { Client, Player } from 'clashofclans.js';
import fetch from 'node-fetch';

export default class Http extends Client {
	private tokenIndex: number;
	private bearerToken!: string;

	public constructor() {
		super();

		this.timeout = 5000;
		// this.baseURL = 'https://coc.clashperk.com/v1';

		this.token = [...process.env.CLASH_TOKENS!.split(',')];
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
		if (!parsed) return { ok: false, statusCode: res?.status ?? 504 };

		const maxAge = res?.headers.get('cache-control')?.split('=')?.[1] ?? 0;
		return Object.assign(parsed, { statusCode: res?.status ?? 504, ok: res?.status === 200, maxAge: Number(maxAge) * 1000 });
	}

	public detailedClanMembers(members: { tag: string }[] = []): Promise<Player[]> {
		return Promise.all(members.map(mem => this.fetch(`/players/${encodeURIComponent(mem.tag)}`)));
	}

	private get randomToken() {
		const token = this.tokens[this.tokenIndex];
		this.tokenIndex = (this.tokenIndex + 1) >= this.tokens.length ? 0 : (this.tokenIndex + 1);
		return token;
	}

	public async init() {
		await this.login();
		setInterval(this.login.bind(this), 1 * 60 * 60 * 1000);
	}

	private async login() {
		const res = await fetch('https://cocdiscordlink.azurewebsites.net/api/login', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				username: process.env.DISCORD_LINK_USERNAME,
				password: process.env.DISCORD_LINK_PASSWORD
			})
		}).catch(() => null);
		const data = await res?.json().catch(() => null);

		if (data?.token) this.bearerToken = data.token as string;
		return Promise.resolve(res?.status === 200 && this.bearerToken);
	}

	public async linkPlayerTag(discordId: string, playerTag: string) {
		const res = await fetch('https://cocdiscordlink.azurewebsites.net/api/links', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${this.bearerToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ playerTag, discordId })
		}).catch(() => null);

		return Promise.resolve(res?.status === 200);
	}

	public async unlinkPlayerTag(playerTag: string) {
		const res = await fetch(`https://cocdiscordlink.azurewebsites.net/api/links/${encodeURIComponent(playerTag)}`, {
			method: 'DELETE',
			headers: {
				'Authorization': `Bearer ${this.bearerToken}`,
				'Content-Type': 'application/json'
			}
		}).catch(() => null);

		return Promise.resolve(res?.status === 200);
	}

	public async getPlayerTags(user: string) {
		const res = await fetch(`https://cocdiscordlink.azurewebsites.net/api/links/${user}`, {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${this.bearerToken}`,
				'Content-Type': 'application/json'
			}
		}).catch(() => null);

		const data: { playerTag: string; discordId: string }[] = await res?.json().catch(() => []);
		return data.filter(d => /^#?[0289CGJLOPQRUVY]+$/i.test(d.playerTag))
			.map(d => `#${d.playerTag.toUpperCase().replace(/^#/g, '').replace(/o|O/g, '0')}`);
	}
}
